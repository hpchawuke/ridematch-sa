// TradeSafe GraphQL client. Every call here follows the mutations/queries
// shown in TradeSafe's own docs (Authentication, Tokens, Transactions,
// Deposits, Allocations).
import { HttpError } from './http.ts';

function secret(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, `Payments are not configured yet (missing ${name}).`);
  return v;
}

// ---- OAuth client-credentials token (cached while valid) ----
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(secret('TRADESAFE_AUTH_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: secret('TRADESAFE_CLIENT_ID'),
      client_secret: secret('TRADESAFE_CLIENT_SECRET'),
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    console.error('TradeSafe auth failed with status', res.status);
    throw new HttpError(502, 'Could not connect to the payment provider. Please try again later.');
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

// ---- GraphQL call ----
// deno-lint-ignore no-explicit-any
async function gql(query: string): Promise<any> {
  const token = await accessToken();
  const res = await fetch(secret('TRADESAFE_API_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) {
    console.error('TradeSafe error:', res.status, JSON.stringify(body?.errors ?? body));
    const msg = body?.errors?.[0]?.message;
    throw new HttpError(502, msg ? `Payment provider: ${msg}` : 'The payment provider rejected the request.');
  }
  return body.data;
}

// GraphQL string literal. JSON.stringify output is a valid GraphQL string.
const q = (s: unknown) => JSON.stringify(String(s));

// Enum values go into the query unquoted, so only allow plain identifiers.
function enumValue(v: string, label: string): string {
  if (!/^[A-Z][A-Z0-9_]*$/.test(v)) throw new HttpError(400, `Invalid ${label}.`);
  return v;
}

// Transaction states seen in TradeSafe's docs
export const FUNDED_STATES = new Set(['FUNDS_RECEIVED', 'INITIATED']);

export type TokenUser = { givenName: string; familyName: string; email: string; mobile: string };
export type BankDetails = { bank: string; accountType: string; accountNumber: string };

export async function createToken(user: TokenUser, bank?: BankDetails): Promise<{ id: string }> {
  const bankPart = bank
    ? `bankAccount: {
         accountNumber: ${q(bank.accountNumber)},
         accountType: ${enumValue(bank.accountType, 'account type')},
         bank: ${enumValue(bank.bank, 'bank')}
       }
       settings: { payout: { interval: IMMEDIATE, refund: WALLET } }`
    : '';
  const data = await gql(`mutation {
    tokenCreate(input: {
      user: {
        givenName: ${q(user.givenName)},
        familyName: ${q(user.familyName)},
        email: ${q(user.email)},
        mobile: ${q(user.mobile)}
      }
      ${bankPart}
    }) { id name }
  }`);
  return data.tokenCreate;
}

export async function createTransaction(input: {
  title: string;
  description: string;
  reference: string;
  amount: number;
  daysToDeliver: number;
  daysToInspect: number;
  commissionPercent: number;
  buyerToken: string;
  sellerToken: string;
  agentToken: string;
}): Promise<{ id: string; allocationId: string | null }> {
  // Mirrors the "multiple allocations" example in the docs: the platform is
  // the AGENT, earns `fee` percent taken from the seller, and TradeSafe's own
  // escrow fee is charged to the agent (feeAllocation: AGENT).
  const data = await gql(`mutation {
    transactionCreate(input: {
      title: ${q(input.title)},
      description: ${q(input.description)},
      industry: GENERAL_GOODS_SERVICES,
      currency: ZAR,
      feeAllocation: AGENT,
      reference: ${q(input.reference)},
      allocations: {
        create: [{
          title: ${q(input.title)},
          description: ${q(input.description)},
          value: ${input.amount.toFixed(2)},
          daysToDeliver: ${Math.max(1, Math.floor(input.daysToDeliver))},
          daysToInspect: ${Math.max(1, Math.floor(input.daysToInspect))}
        }]
      },
      parties: {
        create: [
          { token: ${q(input.buyerToken)}, role: BUYER },
          { token: ${q(input.sellerToken)}, role: SELLER },
          { token: ${q(input.agentToken)}, role: AGENT, fee: ${input.commissionPercent}, feeType: PERCENT, feeAllocation: SELLER }
        ]
      }
    }) { id state allocations { id } }
  }`);
  const tx = data.transactionCreate;
  return { id: tx.id, allocationId: tx.allocations?.[0]?.id ?? null };
}

export async function checkoutLink(transactionId: string): Promise<string> {
  const data = await gql(`mutation { checkoutLink(transactionId: ${q(transactionId)}) }`);
  return data.checkoutLink;
}

export async function getTransaction(
  id: string,
): Promise<{ id: string; state: string; reference: string | null; allocations: { id: string; state: string }[] }> {
  const data = await gql(`query { transaction(id: ${q(id)}) { id state reference allocations { id state } } }`);
  return data.transaction;
}

export async function cancelTransaction(id: string, comment: string): Promise<string> {
  const data = await gql(`mutation { transactionCancel(id: ${q(id)}, comment: ${q(comment)}) { state } }`);
  return data.transactionCancel.state;
}

export async function deleteTransaction(id: string): Promise<void> {
  await gql(`mutation { transactionDelete(id: ${q(id)}) }`);
}

export async function startDelivery(allocationId: string): Promise<void> {
  await gql(`mutation { allocationStartDelivery(id: ${q(allocationId)}) { id state } }`);
}

export async function acceptDelivery(allocationId: string): Promise<void> {
  await gql(`mutation { allocationAcceptDelivery(id: ${q(allocationId)}) { id state } }`);
}

export async function disputeDelivery(allocationId: string): Promise<void> {
  await gql(`mutation { allocationDisputeDelivery(id: ${q(allocationId)}) { id state } }`);
}

export function platformTokenId(): string {
  return secret('TRADESAFE_PLATFORM_TOKEN_ID');
}

// ---- Profile -> TradeSafe user details ----
export function tokenUserFromProfile(p: {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}): TokenUser {
  const parts = (p.full_name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    throw new HttpError(
      400,
      'Please add your first and last name in Edit Profile before making a payment.',
    );
  }
  if (!p.email) throw new HttpError(400, 'Your account has no email address.');

  const digits = (p.phone ?? '').replace(/[\s\-()]/g, '');
  let mobile = '';
  if (/^0\d{9}$/.test(digits)) mobile = '+27' + digits.slice(1);
  else if (/^27\d{9}$/.test(digits)) mobile = '+' + digits;
  else if (/^\+27\d{9}$/.test(digits)) mobile = digits;
  else {
    throw new HttpError(
      400,
      'Please add a valid South African phone number (e.g. 0821234567) in Edit Profile before making a payment.',
    );
  }

  return {
    givenName: parts[0],
    familyName: parts.slice(1).join(' '),
    email: p.email,
    mobile,
  };
}
