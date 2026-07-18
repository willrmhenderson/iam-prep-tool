// ============================================================================
// I-AM Preparation Tool — Edge Function: delete-account
// ============================================================================
// Deploy via Supabase dashboard: Edge Functions -> Deploy a new function
//   -> "Via Editor" -> name it exactly:  delete-account
//   -> replace the sample code with this file -> Deploy.
// Leave "Verify JWT" ON (the default): only a logged-in user's request
// carrying a valid access token can reach this function.
//
// What it does: identifies the calling user from their own access token, then
// deletes that auth user with admin rights. The ON DELETE CASCADE constraints
// created in supabase-schema.sql wipe every row that belonged to them
// (assessments, domains, support persons, before-ratings) in one transaction.
// No orphaned records are possible, and a user can only ever delete
// THEMSELVES — the target user id comes from the verified token, never from
// the request body.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase; the service-role key never leaves the server.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not logged in" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Resolve the caller from THEIR token — they can only delete themselves.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not logged in" }, 401);

    const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
