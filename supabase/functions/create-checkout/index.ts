// Passenger taps "Request Seat": creates the escrow transaction and returns
// the TradeSafe payment link. No booking exists until the money arrives.
import { corsHeaders, errorResponse, HttpError, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import * as ts from '../_shared/tradesafe.ts';
import { COMMISSION_PERCENT, ensureToken, syncPayment, type Payment } from '../_shared/payments.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);

    const body = await req.json().catch(() => ({}));
    const tripId = body?.trip_id;
    if (typeof tripId !== 'string') throw new HttpError(400, 'Missing trip.');

    // ---- Validate the trip (all from the database, never from the browser) ----
    const { data: trip } = await admin.from('trips').select('*').eq('id', tripId).maybeSingle();
    if (!trip) throw new HttpError(404, 'Trip not found.');
    if (trip.driver_id === user.id) throw new HttpError(400, "You can't book your own trip.");
    if (trip.status !== 'active' || trip.seats_available <= 0) {
      throw new HttpError(409, 'This ride is full.');
    }

    const { data: dep } = await admin.rpc('trip_departure', { p_date: trip.date, p_time: trip.time });
    const departure = new Date(dep as string);
    if (isNaN(departure.getTime()) || departure.getTime() < Date.now()) {
      throw new HttpError(409, 'This trip has already departed.');
    }

    const amount = Number(trip.price);
    if (!(amount > 0)) throw new HttpError(400, 'This trip has no valid price.');

    const { data: existingBooking } = await admin
      .from('bookings')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('passenger_id', user.id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (existingBooking) throw new HttpError(409, 'You already have a seat request on this trip.');

    // The driver must be set up to receive money
    const { data: driverToken } = await admin
      .from('tradesafe_tokens')
      .select('token, has_bank_account')
      .eq('user_id', trip.driver_id)
      .maybeSingle();
    if (!driverToken?.has_bank_account) {
      throw new HttpError(409, "This driver hasn't set up payouts yet, so the seat can't be paid for.");
    }

    // ---- Reuse an unfinished checkout instead of charging twice ----
    const { data: open } = await admin
      .from('payments')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('passenger_id', user.id)
      .in('status', ['awaiting_payment', 'held', 'disputed'])
      .maybeSingle();

    if (open) {
      if (open.status !== 'awaiting_payment') {
        throw new HttpError(409, 'You already have a seat request on this trip.');
      }
      const fresh = Date.now() - new Date(open.created_at).getTime() < DAY_MS;
      if (fresh && open.tradesafe_transaction_id) {
        // They may have paid and just not come back to the app yet.
        const synced = await syncPayment(admin, open as Payment);
        if (synced.status === 'held') {
          throw new HttpError(409, 'Your payment already went through. Check My Bookings.');
        }
        if (synced.status === 'awaiting_payment') {
          const url = await ts.checkoutLink(open.tradesafe_transaction_id);
          return json({ url, payment_id: open.id });
        }
        // otherwise it failed / was refunded: fall through and start fresh
      } else {
        if (open.tradesafe_transaction_id) {
          try { await ts.deleteTransaction(open.tradesafe_transaction_id); } catch (_) { /* best effort */ }
        }
        await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', open.id).eq('status', 'awaiting_payment');
      }
    }

    // ---- New checkout ----
    const passengerToken = await ensureToken(admin, user.id, user.email);

    const { data: payment, error: insertError } = await admin
      .from('payments')
      .insert({
        trip_id: trip.id,
        passenger_id: user.id,
        driver_id: trip.driver_id,
        amount,
        commission_percent: COMMISSION_PERCENT,
        departure_at: departure.toISOString(),
        status: 'awaiting_payment',
      })
      .select('*')
      .single();
    if (insertError || !payment) {
      throw new HttpError(409, 'You already have a payment in progress for this trip.');
    }

    try {
      const route = `${trip.from_city} to ${trip.to_city}`;
      const tx = await ts.createTransaction({
        title: `RideMatch SA seat: ${route}`,
        description: `One seat from ${route}, departing ${trip.date} at ${String(trip.time).slice(0, 5)}. Held in escrow until the passenger confirms the ride.`,
        reference: payment.id,
        amount,
        daysToDeliver: Math.ceil((departure.getTime() - Date.now()) / DAY_MS),
        daysToInspect: 1,
        commissionPercent: COMMISSION_PERCENT,
        buyerToken: passengerToken.token,
        sellerToken: driverToken.token,
        agentToken: ts.platformTokenId(),
      });

      await admin
        .from('payments')
        .update({
          tradesafe_transaction_id: tx.id,
          tradesafe_allocation_id: tx.allocationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      const url = await ts.checkoutLink(tx.id);
      return json({ url, payment_id: payment.id });
    } catch (e) {
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment.id);
      throw e;
    }
  } catch (err) {
    return errorResponse(err);
  }
});
