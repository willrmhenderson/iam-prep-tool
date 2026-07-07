// Supabase Edge Function: permanently deletes the calling user's
// account and all of their data.
//
// This is the only place the service_role key is used anywhere in
// this project - it never appears in the app itself. Deploy with:
//   supabase functions deploy delete-account
//
// The function only trusts the caller's own JWT (passed automatically
// by supabase.functions.invoke() from the app) to identify which
// account to delete - a user can never delete anyone else's account,
// because the user id is read from their own verified token, not from
// a request parameter.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST"){
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt){
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user){
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }
  const userId = userData.user.id;

  const { error: deleteRowError } = await admin.from("assessments").delete().eq("user_id", userId);
  if (deleteRowError){
    return new Response(JSON.stringify({ error: "Could not delete assessment data: " + deleteRowError.message }), { status: 500 });
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError){
    return new Response(JSON.stringify({ error: "Could not delete account: " + deleteUserError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
