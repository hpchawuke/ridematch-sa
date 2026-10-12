import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';
import * as ts from './tradesafe.ts';

export const COMMISSION_PERCENT = 10;
// After departure, passengers have this long to confirm or report a problem,
// then the money is released automatically.
export const WINDOW_MS = 24 * 60 * 60 * 1000;

// South Africa has no daylight saving, so local time is always UTC+2.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// Midnight at the start of the departure day, South African time. From this
// moment the trip is "on its departure date": contact details unlock, the
// passenger can no longer cancel an accepted trip, and they can confirm it.
export function departureDayStart(departureMs: number): number {
  const local = new Date(departureMs + SAST_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() - SAST_OFFSET_MS;
}

export type Payment = {
  id: string;
  trip_id: string;
  passenger_id: string;
  driver_id: string;
  booking_id: string | null;
  amount: number;
  status: string;
  tradesafe_transaction_id: string | null;
  tradesafe_allocation_id: string | null;
  departure_at: string | null;
  created_at: string;
};

export async function loadPayment(admin: SupabaseClient, id: string): Promise<Payment> {
  const { data, error } = await admin.from('payments').select('*').eq('id', id).maybeSingle();
  if (error || !data) throw new HttpError(404, 'Payment not found.');
  return data as Payment;
}

export async function loadPaymentForBooking(admin: SupabaseClient, bookingId: string): Promise<Payment> {
  const { data, error } = await admin.from('payments').select('*').eq('booking_id', bookingId).maybeSingle();
  if (error || !data) throw new HttpError(404, 'No payment found for this booking.');
  return data as Payment;
}

// Gets (or creates) the TradeSafe token for a user. Passengers only need
// their basic details; drivers get theirs with a bank account in
// setup-driver-payout.
export async function ensureToken(admin: SupabaseClient, userId: string, authEmail: string | undefined) {
  const existing = await admin.from('tradesafe_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (existing.data) return existing.data as { user_id: string; token: string; has_bank_account: boolean };

  const { data: profile } = await admin
    .from('users')
    .select('full_name, email, phone')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) throw new HttpError(400, 'Profile not found.');

  const created = await ts.createToken(
    ts.tokenUserFromProfile({ ...profile, email: profile.email ?? authEmail }),
  );

  const { error } = await admin
    .from('tradesafe_tokens')
    .insert({ user_id: userId, token: created.id, has_bank_account: false });
  if (error) {
    // Lost a race with another request: use the row that won.
    const again = await admin.from('tradesafe_tokens').select('*').eq('user_id', userId).maybeSingle();
    if (again.data) return again.data as { user_id: string; token: string; has_bank_account: boolean };
    throw new HttpError(500, 'Could not save payment profile.');
  }
  return { user_id: userId, token: created.id, has_bank_account: false };
}

// Refund through TradeSafe first, then record it. If TradeSafe refuses, we
// throw and nothing changes on our side.
export async function refundPayment(
  admin: SupabaseClient,
  p: Payment,
  bookingStatus: string,
  reason: string,
): Promise<void> {
  if (p.tradesafe_transaction_id) {
    const tx = await ts.getTransaction(p.tradesafe_transaction_id);
    if (tx && tx.state !== 'REFUNDED' && tx.state !== 'CANCELLED') {
      await ts.cancelTransaction(p.tradesafe_transaction_id, reason);
    }
  }
  const { error } = await admin.rpc('apply_refund', {
    p_payment_id: p.id,
    p_booking_status: bookingStatus,
    p_reason: reason,
  });
  if (error) throw new HttpError(500, error.message);
}

// Pay the driver. TradeSafe needs delivery to be "started" before it can
// be accepted or disputed, so we start it here (ignoring "already started").
export async function releasePayment(admin: SupabaseClient, p: Payment): Promise<void> {
  if (!p.tradesafe_allocation_id) throw new HttpError(500, 'Payment has no allocation to release.');
  try {
    await ts.startDelivery(p.tradesafe_allocation_id);
  } catch (e) {
    console.warn('startDelivery skipped:', e instanceof Error ? e.message : e);
  }
  await ts.acceptDelivery(p.tradesafe_allocation_id);
  const { error } = await admin.rpc('mark_released', { p_payment_id: p.id });
  if (error) throw new HttpError(500, error.message);
}

// Asks TradeSafe what really happened to this payment and brings our
// records in line. Used by the webhook, by the "payment return" page, and
// by the hourly sweep, so it never trusts what a caller claims.
export async function syncPayment(admin: SupabaseClient, p: Payment): Promise<Payment> {
  if (!p.tradesafe_transaction_id) return p;

  const tx = await ts.getTransaction(p.tradesafe_transaction_id);
  const state = tx?.state;

  if (p.status === 'awaiting_payment' || p.status === 'failed') {
    if (state && ts.FUNDED_STATES.has(state)) {
      const { data, error } = await admin.rpc('finalize_paid_booking', { p_payment_id: p.id });
      if (error) throw new HttpError(500, error.message);
      if (typeof data === 'string' && data.startsWith('refund_needed:')) {
        const reason = data.split(':')[1];
        await refundPayment(
          admin,
          p,
          reason === 'ride_full' ? 'full' : 'cancelled',
          `Automatic refund (${reason.replace(/_/g, ' ')})`,
        );
      }
    } else if (state === 'CANCELLED' && p.status === 'awaiting_payment') {
      await admin
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .eq('status', 'awaiting_payment');
    }
  } else if ((p.status === 'held' || p.status === 'disputed') && state === 'REFUNDED') {
    // Refunded on TradeSafe's side (e.g. via their app) - mirror it here.
    const { error } = await admin.rpc('apply_refund', {
      p_payment_id: p.id,
      p_booking_status: 'cancelled',
      p_reason: 'Refunded by the payment provider',
    });
    if (error) throw new HttpError(500, error.message);
  }

  return await loadPayment(admin, p.id);
}
