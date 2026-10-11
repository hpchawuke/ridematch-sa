import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { User } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

// Service-role client: bypasses RLS. Server-side only, never sent to the browser.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Works out who is calling from their sign-in token.
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) throw new HttpError(401, 'Please sign in first.');
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, 'Please sign in again.');
  return data.user;
}

export async function isAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return Boolean(data);
}
