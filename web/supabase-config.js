// Supabase Configuration — Expense OS
// ============================================================
// Live Supabase Project Credentials
// ============================================================

const SUPABASE_URL = "https://gtwirhvswhslljbfvnoe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0d2lyaHZzd2hzbGxqYmZ2bm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjQyOTAsImV4cCI6MjEwMTM0MDI5MH0.b9oppdNo7S6RYizvaC5ZgRWuSjceqZMFXT63mXid1tQ";

const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes("YOUR_") && 
  !SUPABASE_ANON_KEY.includes("YOUR_")
);

function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (window._supabaseInstance) return window._supabaseInstance;
  
  const creator = (window.supabaseJS && typeof window.supabaseJS.createClient === 'function')
    ? window.supabaseJS.createClient
    : (window.supabase && typeof window.supabase.createClient === 'function')
      ? window.supabase.createClient
      : (typeof createClient === 'function' ? createClient : null);

  if (creator) {
    try {
      window._supabaseInstance = creator(SUPABASE_URL, SUPABASE_ANON_KEY);
      return window._supabaseInstance;
    } catch(e) {
      console.warn('Supabase client creation error:', e);
    }
  }
  return null;
}

// Expose getSupabaseClient globally
window.getSupabaseClient = getSupabaseClient;

// Global getter property for supabase
try {
  let _cachedClient = null;
  Object.defineProperty(window, 'supabase', {
    get: function() {
      if (_cachedClient) return _cachedClient;
      _cachedClient = getSupabaseClient();
      return _cachedClient;
    },
    configurable: true
  });
} catch(e) {}
