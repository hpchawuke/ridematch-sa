// A verified driver adds their bank account so they can be paid.
// The account number goes straight to TradeSafe and is never stored or
// logged by us - we only keep TradeSafe's token ID.
import { corsHeaders, errorResponse, HttpError, json } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import * as ts from '../_shared/tradesafe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const body = await req.json().catch(() => ({}));

    const bank = String(body.bank ?? '').toUpperCase();
    const accountType = String(body.account_type ?? '').toUpperCase();
    const accountNumber = String(body.account_number ?? '').replace(/\s+/g, '');

    if (!/^[A-Z][A-Z0-9_]*$/.test(bank)) throw new HttpError(400, 'Choose a bank.');
    if (!/^[A-Z][A-Z0-9_]*$/.test(accountType)) throw new HttpError(400, 'Choose an account type.');
    if (!/^\d{5,16}$/.test(accountNumber)) throw new HttpError(400, 'Enter a valid account number (digits only).');

    const { data: profile } = await admin
      .from('users').select('full_name, email, phone, user_type').eq('id', user.id).maybeSingle();
    if (!profile || profile.user_type !== 'Driver') throw new HttpError(403, 'Only drivers can set up payouts.');

    const { data: verification } = await admin
      .from('driver_verifications').select('status').eq('driver_id', user.id).maybeSingle();
    if (verification?.status !== 'approved') {
      throw new HttpError(403, 'Your account must be verified before you can add payout details.');
    }

    const { data: existing } = await admin
      .from('tradesafe_tokens').select('has_bank_account').eq('user_id', user.id).maybeSingle();
    if (existing?.has_bank_account) {
      throw new HttpError(409, 'Payout details are already saved. Contact support to change them.');
    }

    // TradeSafe only accepts bank details when a token is created, so we
    // create a fresh token that includes them and replace any bank-less one.
    const created = await ts.createToken(
      ts.tokenUserFromProfile({ ...profile, email: profile.email ?? user.email }),
      { bank, accountType, accountNumber },
    );

    const { error } = await admin
      .from('tradesafe_tokens')
      .upsert({ user_id: user.id, token: created.id, has_bank_account: true }, { onConflict: 'user_id' });
    if (error) throw new HttpError(500, 'Could not save payout details.');

    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
});
