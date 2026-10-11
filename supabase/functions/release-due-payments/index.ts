// Hourly sweep, triggered by pg_cron (see the bottom of
// supabase-schema-payments-flow.sql). Authenticated with the CRON_SECRET
// header. Deploy with --no-verify-jwt.
//   1. Accepted rides: 24h after departure with no dispute -> release to driver
//   2. Paid requests nobody answered before departure -> refund
//   3. Refunds that failed earlier (declined / cancelled / full) -> retry
//   4. Checkouts abandoned for 2+ hours -> check once, then mark failed
import { errorResponse, HttpError, json, safeEqual } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import * as ts from '../_shared/tradesafe.ts';
import { WINDOW_MS, refundPayment, releasePayment, syncPayment, type Payment } from '../_shared/payments.ts';

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get('CRON_SECRET');
    if (!expected) throw new HttpError(500, 'CRON_SECRET is not configured.');
    if (!safeEqual(req.headers.get('x-cron-secret') ?? '', expected)) throw new HttpError(401, 'Unauthorized');

    const admin = adminClient();
    const now = new Date();
    const summary = { released: 0, refundedUnanswered: 0, refundRetries: 0, abandoned: 0, errors: 0 };

    const attempt = async (label: string, fn: () => Promise<void>, counter: keyof typeof summary) => {
      try {
        await fn();
        summary[counter]++;
      } catch (e) {
        summary.errors++;
        console.error(`${label} failed:`, e instanceof Error ? e.message : e);
      }
    };

    // Held payments with their booking status
    const { data: held } = await admin
      .from('payments')
      .select('*, booking:bookings(status)')
      .eq('status', 'held')
      .limit(200);

    for (const row of held ?? []) {
      const p = row as Payment & { booking: { status: string } | { status: string }[] | null };
      const b = Array.isArray(p.booking) ? p.booking[0] : p.booking;
      const bookingStatus = b?.status;
      const departure = p.departure_at ? new Date(p.departure_at).getTime() : null;

      if (bookingStatus === 'accepted' && departure && now.getTime() > departure + WINDOW_MS) {
        await attempt(`release ${p.id}`, () => releasePayment(admin, p), 'released');
      } else if (bookingStatus === 'pending' && departure && now.getTime() > departure) {
        await attempt(
          `refund unanswered ${p.id}`,
          () => refundPayment(admin, p, 'cancelled', 'The driver did not respond before departure'),
          'refundedUnanswered',
        );
      } else if (bookingStatus && ['declined', 'cancelled', 'full'].includes(bookingStatus)) {
        await attempt(
          `refund retry ${p.id}`,
          () => refundPayment(admin, p, bookingStatus, 'Refund retried automatically'),
          'refundRetries',
        );
      }
    }

    // Abandoned checkouts
    const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const { data: stale } = await admin
      .from('payments').select('*').eq('status', 'awaiting_payment').lt('created_at', cutoff).limit(100);

    for (const p of (stale ?? []) as Payment[]) {
      await attempt(`abandoned ${p.id}`, async () => {
        const synced = await syncPayment(admin, p);
        if (synced.status === 'awaiting_payment') {
          if (p.tradesafe_transaction_id) {
            try { await ts.deleteTransaction(p.tradesafe_transaction_id); } catch (_) { /* best effort */ }
          }
          await admin.from('payments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', p.id).eq('status', 'awaiting_payment');
        }
      }, 'abandoned');
    }

    return json({ ok: true, ...summary });
  } catch (err) {
    return errorResponse(err);
  }
});
