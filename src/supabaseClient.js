import { createClient } from '@supabase/supabase-js';

console.log(import.meta.env.VITE_SUPABASE_URL)
const supabaseUrl = 'https://kbqtlancsxmuccmcevhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticXRsYW5jc3htdWNjbWNldmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTgwODQsImV4cCI6MjEwNjA5NDA4NH0.7SdZqgSqjp5E3V6HJhN2pmSEbCWE2uHYf1no7OAmyjQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);