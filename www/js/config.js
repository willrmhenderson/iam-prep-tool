// Fill these in after you create your Supabase project.
// Project must be created in the Sydney (ap-southeast-2) region -
// see README.md "Supabase project setup" for the exact steps.
//
// The anon key is safe to ship in the app - it only grants what your
// Row Level Security policies allow (see supabase/migrations). It is
// NOT the service_role key, which must never appear in this app.

export const SUPABASE_URL = "https://qdcqhasxeecemdirbtsh.supabase.co";
// Supabase renamed "anon key" to "publishable key" - same purpose,
// same permission level (RLS-gated, safe to ship in the app).
export const SUPABASE_ANON_KEY = "sb_publishable_ZtgMWYlrUxzPWpXvQR9o1g_pZR1MN6V";

// True once real values are pasted in above. While this is false the
// app runs in local-only mode: no sign-in, no sync, data stays on the
// device. That lets you run and test the UI before the Supabase
// project exists.
export function isConfigured(){
  return SUPABASE_URL.indexOf("YOUR-PROJECT-REF") === -1 &&
         SUPABASE_ANON_KEY.indexOf("YOUR-ANON") === -1;
}
