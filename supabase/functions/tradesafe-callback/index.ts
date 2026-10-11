// TradeSafe calls this URL every time a transaction changes state.
// Set the callback URL in your TradeSafe application settings to:
//   https://<project-ref>.supabase.co/functions/v1/tradesafe-callback?secret=<TRADESAFE_WEBHOOK_SECRET>
// Deploy with --no-verify-jwt (TradeSafe doesn't send a Supabase token).
//
// We never trust the payload: it is only used to find the payment. The
// real state is fetched from TradeSafe's API before anything changes.
import { errorResponse, HttpError, json, safeEqual } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { syncPayment, type Payment } from '../_shared/payments.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get('TRADESAFE_WEBHOOK_SECRET');
    if (!expected) throw new HttpError(500, 'Webhook secret is not configured.');

    const url = new URL(req.url);
    const provided = url.searchParams.get('secret') ?? url.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!safeEqual(provided, expected)) throw new HttpError(401, 'Unauthorized');

    const payload = await req.json().catch(() => null);
    const data = payload?.data ?? payload;
    const transactionId: string | undefined = data?.id;
    const reference: string | undefined = data?.reference;

    const admin = adminClient();
    let payment: Payment | null = null;

    if (transactionId) {
      const { data: row } = await admin
        .from('payments').select('*').eq('tradesafe_transaction_id', transactionId).maybeSingle();
      payment = row as Payment | null;
    }
    if (!payment && reference && UUID.test(reference)) {
      const { data: row } = await admin.from('payments').select('*').eq('id', reference).maybeSingle();
      payment = row as Payment | null;
    }

    // Unknown transaction (e.g. something else on the same TradeSafe account): acknowledge and ignore.
    if (!payment) return json({ ok: true, ignored: true });

    await syncPayment(admin, payment);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
