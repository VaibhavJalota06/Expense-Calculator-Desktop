// Supabase Configuration — Expense OS
// ============================================================
// Replace these placeholder values with your Supabase credentials.
// Get them from: https://supabase.com → Project Settings → API
// ============================================================

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes("YOUR_") && 
  !SUPABASE_ANON_KEY.includes("YOUR_")
);

// Initialize Supabase Client
const supabase = (isSupabaseConfigured && typeof window.supabase !== 'undefined')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
