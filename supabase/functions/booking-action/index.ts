// One function for everything a person can do to a paid booking.
//   sync      passenger   confirm a payment went through (used by the payment return page)
//   accept    driver      accept a paid request (money stays in escrow)
//   decline   driver      decline -> passenger refunded
//   cancel    passenger   before departure -> refunded;  driver -> always refunded
//   complete  passenger   "Complete Ride": releases the money to the driver
//   dispute   passenger   report a problem (money stays held, admin reviews)
//   admin_release / admin_refund   admin settles a dispute
import { corsHeaders, errorResponse, HttpError, json } from '../_shared/http.ts';
import { adminClient, isAdmin, requireUser } from '../_shared/supabase.ts';
import * as ts from '../_shared/tradesafe.ts';
import {
  EARLY_MS, WINDOW_MS, loadPayment, loadPaymentForBooking, refundPayment,
  releasePayment, syncPayment, type Payment,
} from '../_shared/payments.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;

    // ---------------- sync ----------------
    if (action === 'sync') {
      let payment: Payment | null = null;
      if (typeof body.payment_id === 'string') {
        const { data } = await admin.from('payments').select('*').eq('id', body.payment_id).maybeSingle();
        payment = data as Payment | null;
      } else if (typeof body.transaction_id === 'string') {
        const { data } = await admin.from('payments').select('*')
          .eq('tradesafe_transaction_id', body.transaction_id).maybeSingle();
        payment = data as Payment | null;
      }
      if (!payment || payment.passenger_id !== user.id) throw new HttpError(404, 'Payment not found.');
      const synced = await syncPayment(admin, payment);
      return json({ status: synced.status, booking_id: synced.booking_id });
    }

    // ---------------- admin actions ----------------
    if (action === 'admin_release' || action === 'admin_refund') {
      if (!(await isAdmin(admin, user.id))) throw new HttpError(403, 'Admins only.');
      const payment = await loadPayment(admin, String(body.payment_id ?? ''));
      if (!['held', 'disputed'].includes(payment.status)) {
        throw new HttpError(409, `This payment is ${payment.status}.`);
      }
      if (action === 'admin_release') {
        await releasePayment(admin, payment);
      } else {
        await refundPayment(admin, payment, 'cancelled', 'Dispute resolved by an admin: refunded to the passenger');
      }
      return json({ ok: true });
    }

    // ---------------- booking actions ----------------
    const bookingId = String(body.booking_id ?? '');
    const { data: booking } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!booking) throw new HttpError(404, 'Booking not found.');

    const isPassenger = booking.passenger_id === user.id;
    const isDriver = booking.driver_id === user.id;
    if (!isPassenger && !isDriver) throw new HttpError(403, 'Not your booking.');

    const payment = await loadPaymentForBooking(admin, bookingId);
    const departure = payment.departure_at ? new Date(payment.departure_at).getTime() : NaN;
    const now = Date.now();

    // ---- accept ----
    if (action === 'accept') {
      if (!isDriver) throw new HttpError(403, 'Only the driver can accept.');
      const { data, error } = await admin.rpc('accept_booking_server', {
        p_booking_id: bookingId,
        p_driver_id: user.id,
      });
      if (error) throw new HttpError(409, error.message);

      // Last seat taken: everyone else still waiting is told "full" - and refunded.
      if (data === 'full') {
        const { data: others } = await admin.from('bookings').select('id')
          .eq('trip_id', booking.trip_id).eq('status', 'full');
        for (const o of others ?? []) {
          try {
            const p = await loadPaymentForBooking(admin, o.id);
            if (p.status === 'held') await refundPayment(admin, p, 'full', 'The ride filled up');
          } catch (e) {
            // The hourly sweep retries any refund that failed here.
            console.error('Refund after ride-full failed for booking', o.id, e);
          }
        }
      }
      return json({ ok: true, result: data });
    }

    // ---- decline ----
    if (action === 'decline') {
      if (!isDriver) throw new HttpError(403, 'Only the driver can decline.');
      if (booking.status !== 'pending') throw new HttpError(409, 'This request is no longer pending.');
      if (payment.status !== 'held') throw new HttpError(409, `This payment is ${payment.status}.`);
      await refundPayment(admin, payment, 'declined', 'Declined by the driver');
      return json({ ok: true });
    }

    // ---- cancel ----
    if (action === 'cancel') {
      if (!['pending', 'accepted'].includes(booking.status)) {
        throw new HttpError(409, 'This booking can no longer be cancelled.');
      }
      if (payment.status !== 'held') throw new HttpError(409, `This payment is ${payment.status}.`);
      if (isPassenger && !(departure > now)) {
        throw new HttpError(409, 'The trip has already departed. Use "Report a problem" if something went wrong.');
      }
      await refundPayment(
        admin, payment, 'cancelled',
        isPassenger ? 'Cancelled by the passenger before departure' : 'Cancelled by the driver',
      );
      return json({ ok: true });
    }

    // ---- complete / dispute (passenger, inside the ride window) ----
    if (action === 'complete' || action === 'dispute') {
      if (!isPassenger) throw new HttpError(403, 'Only the passenger can do this.');
      if (booking.status !== 'accepted') throw new HttpError(409, 'The driver has not accepted this booking.');
      if (payment.status !== 'held') throw new HttpError(409, `This payment is ${payment.status}.`);
      if (!(now >= departure - EARLY_MS)) {
        throw new HttpError(409, 'You can do this once it is time for the trip to depart.');
      }
      if (now > departure + WINDOW_MS) {
        throw new HttpError(409, 'The 24-hour window has passed, so the payment is being released automatically.');
      }

      if (action === 'complete') {
        await releasePayment(admin, payment);
        return json({ ok: true });
      }

      const reason = String(body.reason ?? '').trim();
      if (reason.length < 5) throw new HttpError(400, 'Please describe what went wrong.');
      if (!payment.tradesafe_allocation_id) throw new HttpError(500, 'Payment has no allocation.');
      try {
        await ts.startDelivery(payment.tradesafe_allocation_id);
      } catch (e) {
        console.warn('startDelivery skipped:', e instanceof Error ? e.message : e);
      }
      await ts.disputeDelivery(payment.tradesafe_allocation_id);
      const { error } = await admin.rpc('mark_disputed', {
        p_payment_id: payment.id,
        p_reason: reason.slice(0, 1000),
      });
      if (error) throw new HttpError(500, error.message);
      return json({ ok: true });
    }

    throw new HttpError(400, 'Unknown action.');
  } catch (err) {
    return errorResponse(err);
  }
});
