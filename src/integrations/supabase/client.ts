import { createClient } from '@supabase/supabase-js';

// TalkStay reuses the shared TalkWeb Supabase project. Values are injected via
// Vite env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) with a fallback to the
// shared project so local dev works out of the box.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://oujqkygfmyapmrgxmhvt.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});
