import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase settings. Check that .env sits next to package.json, the names start with VITE_, and the dev server was restarted.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);