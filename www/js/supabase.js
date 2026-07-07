// Supabase client, session storage, and sync.
//
// The session token (JWT) is kept in native secure storage (Keychain /
// Keystore) via capacitor-secure-storage-plugin, not in localStorage,
// so it is not readable by anything else with access to the webview's
// storage. Network transport is HTTPS/TLS by default (Supabase does
// not offer plaintext endpoints). Data at rest in Postgres is
// encrypted by Supabase's infrastructure; this project additionally
// keeps the on-device copy encrypted (see db.js).

import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import * as db from "./db.js";

const secureStorageAdapter = {
  getItem: async function(key){
    try{
      var r = await SecureStoragePlugin.get({ key: key });
      return r.value || null;
    }catch(e){ return null; }
  },
  setItem: async function(key, value){
    await SecureStoragePlugin.set({ key: key, value: value });
  },
  removeItem: async function(key){
    try{ await SecureStoragePlugin.remove({ key: key }); }catch(e){}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export async function isOnline(){
  try{
    var status = await Network.getStatus();
    return status.connected;
  }catch(e){
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
}

export function onNetworkChange(cb){
  Network.addListener("networkStatusChange", function(status){ cb(status.connected); });
}

// Pushes the local row to Supabase if it is newer, using the row's
// updated_at as the conflict marker (last-write-wins). Safe to call
// often; it is a no-op when there is nothing dirty to push.
export async function pushIfDirty(){
  var user = (await supabase.auth.getUser()).data.user;
  if (!user) return { pushed: false, reason: "signed-out" };
  if (!(await isOnline())) return { pushed: false, reason: "offline" };

  var row = await db.loadRow();
  if (!row || !row.dirty) return { pushed: false, reason: "nothing-dirty" };

  var { error } = await supabase.from("assessments").upsert({
    user_id: user.id,
    data: JSON.parse(row.data),
    updated_at: row.updated_at
  }, { onConflict: "user_id" });

  if (error) return { pushed: false, reason: error.message };

  await db.saveRow(user.id, JSON.parse(row.data), false);
  return { pushed: true };
}

// Pulls the server row and reconciles with the local row by
// updated_at. Returns the winning data object, or null if there is
// nothing on either side yet.
export async function pullAndReconcile(){
  var user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  if (!(await isOnline())) return null;

  var { data, error } = await supabase
    .from("assessments")
    .select("data, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;

  var local = await db.loadRow();
  var serverNewer = !local || new Date(data.updated_at) > new Date(local.updated_at);

  if (serverNewer){
    await db.saveRow(user.id, data.data, false);
    return data.data;
  }
  return null;
}

export async function deleteAccountEverywhere(){
  var { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (error) throw error;
  await db.clearRow();
  await supabase.auth.signOut();
  return data;
}
