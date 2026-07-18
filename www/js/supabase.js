// Supabase client, session storage, and sync.
//
// The sync logic below (push/pull, per-section merge, before-ratings
// lock supremacy, shared-device account-switch safety, first-conflict
// choice) is a faithful port of the proven design already live at
// https://wondrous-capybara-c21ca1.netlify.app against this same
// database - read directly from that app's source, not reinvented.
// See supabase/migrations/0001_assessments_and_domains.sql and
// 0001b_sync_additions.sql for the real, already-applied schema.
//
// The session token (JWT) is kept in native secure storage (Keychain /
// Keystore) via capacitor-secure-storage-plugin, not in localStorage.
// Network transport is HTTPS/TLS by default. Data at rest in Postgres
// is encrypted by Supabase's infrastructure; this project additionally
// keeps the on-device copy encrypted (see db.js) - stronger than the
// web-only version this was ported from, which uses plain localStorage.

import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import * as db from "./db.js";
import { DOM } from "./data.js";
// Deliberate circular import: state.js also imports from this module.
// Both only touch each other's bindings inside function bodies (never
// at module-evaluation time), which ES modules resolve correctly -
// the alternative (a third orchestration module) would still be
// circular, just relocated, since state owns ST and this module owns
// the network calls that need to read and update it.
import { ST, AKEYS, stampAll, establishSnapshotBaseline, getPendingKeys, markSynced, resetInPlace } from "./state.js";

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

function isOfflineError(e){
  var m = (e && e.message) ? e.message : String(e || "");
  return /Failed to fetch|NetworkError|Load failed|network/i.test(m);
}

// ---------------------------------------------------------------
// State exposed to the UI: cloud status text, and the first-sync
// conflict choice screen (rChoiceScreen equivalent).
// ---------------------------------------------------------------
let AID = null;
let CURRENT_USER_ID = null;
let CLOUD_STATE = "";
let CLOUD_AT = null;
let PUSHING = false, REPUSH = false, PULLED = false;
let CHOICE = null; // { a, d, s, b, checkins } when local and cloud both have content on first sync
const cloudListeners = [];

function setCloud(state){
  CLOUD_STATE = state;
  if (state === "ok") CLOUD_AT = new Date().toISOString();
  cloudListeners.forEach(function(fn){ fn({ state: CLOUD_STATE, at: CLOUD_AT }); });
}
export function onCloudStatus(cb){ cloudListeners.push(cb); }
export function getChoice(){ return CHOICE; }

function resetSyncSession(){
  AID = null; PULLED = false; CLOUD_STATE = ""; CLOUD_AT = null; CHOICE = null;
}

// ---------------------------------------------------------------
// Row builders - shape must match the live schema exactly.
// ---------------------------------------------------------------
function aFields(keys){
  var o = { saved_at: ST.savedAt, cu: ST.cu, client_updated_at: new Date().toISOString() };
  keys.forEach(function(k){
    if (k === "role") o.role = ST.role;
    else if (k === "step") o.step = ST.step;
    else if (k === "p") o.participant = ST.p;
    else if (k === "adv") o.adv = ST.adv;
    else if (k === "psych") o.psych = ST.psych;
    else if (k === "preq") o.preq = ST.preq;
    else if (k === "consent"){ o.consent_date = ST.consentDate; o.consent_v = ST.consentV; }
  });
  return o;
}
function domRow(i){
  var d = ST.d[i];
  return {
    assessment_id: AID, user_id: CURRENT_USER_ID, domain_index: i,
    gs: d.gs || "", bs: d.bs || "", tab: d.tab || "good", freq: d.freq || "", stype: d.stype || "",
    impact: d.impact || "", change: d.change || "", notes: d.notes || "", so: d.so || "",
    sf: !!d.sf, sfn: d.sfn || "", pn: d.pn || "", pf: !!d.pf,
    client_updated_at: ST.cu["d" + i] || new Date().toISOString()
  };
}
function supRow(s, idx){
  return {
    assessment_id: AID, user_id: CURRENT_USER_ID, local_id: String(s.id), position: idx,
    name: s.name || "", rel: s.rel || "", dur: s.dur || "", support: s.support || "",
    without_support: s.without || "", msg: s.msg || "",
    client_updated_at: ST.cu.s || new Date().toISOString()
  };
}
function checkinRow(c){
  return {
    assessment_id: AID, user_id: CURRENT_USER_ID, local_id: String(c.id), at: c.at,
    mood: c.mood, mood_word: c.moodWord || "", fatigue: c.fatigue, pain: c.pain, clarity: c.clarity,
    note: c.note || "", client_updated_at: ST.cu.checkins || new Date().toISOString()
  };
}
function beforeRatingsRow(){
  return {
    assessment_id: AID, user_id: CURRENT_USER_ID, items: ST.brate.items || {},
    locked: !!ST.brate.locked, locked_at: ST.brateLockedAt,
    client_updated_at: ST.cu.b || new Date().toISOString()
  };
}

async function ensureAID(){
  if (AID) return AID;
  var res = await supabase.from("assessments").upsert({ user_id: CURRENT_USER_ID }, { onConflict: "user_id" }).select("id").single();
  if (res.error) throw res.error;
  AID = res.data.id;
  return AID;
}

// ---------------------------------------------------------------
// Push - only the sections actually marked dirty (state.js's
// getPendingKeys()), so an edit to one domain never re-sends the
// other 11.
//
// Ordering matters here and is the fix for a real bug found during
// testing: child-table writes (support persons, checkins, domains,
// before-ratings) happen FIRST, each confirmed independently. The
// assessments row's cu timestamp blob - which the pull side trusts as
// "this section is definitely synced" - is written LAST, and only
// ever contains timestamps for sections that were just confirmed (or
// already confirmed in an earlier round). A section is only ever
// marked synced (markSynced) after its own write is confirmed to have
// succeeded - never bundled optimistically with unrelated sections
// that happened to share the same push. This closes the failure mode
// where one section's cloud confirmation could arrive even though
// that section's actual data never made it to its table.
// ---------------------------------------------------------------
export async function pushPending(){
  var user = (await supabase.auth.getUser()).data.user;
  if (!user) return { pushed: false, reason: "signed-out" };
  CURRENT_USER_ID = user.id;
  var mine = getPendingKeys();
  if (!mine.length) return { pushed: false, reason: "nothing-dirty" };
  if (!(await isOnline())) return { pushed: false, reason: "offline" };
  if (PUSHING){ REPUSH = true; return { pushed: false, reason: "already-pushing" }; }

  PUSHING = true; REPUSH = false; setCloud("pending");
  var confirmed = [];
  var anyFailed = false;

  try{
    await ensureAID();

    if (mine.indexOf("s") >= 0){
      try{
        var srows = ST.sups.map(function(s, idx){ return supRow(s, idx); });
        var sids = ST.sups.map(function(s){ return String(s.id); });
        if (srows.length){
          var r1 = await supabase.from("support_persons").upsert(srows, { onConflict: "assessment_id,local_id" });
          if (r1.error) throw r1.error;
        }
        var sdelq = supabase.from("support_persons").delete().eq("assessment_id", AID);
        var r2 = await (sids.length ? sdelq.not("local_id", "in", "(" + sids.join(",") + ")") : sdelq);
        if (r2.error) throw r2.error;
        confirmed.push("s");
      }catch(e){ anyFailed = true; }
    }

    if (mine.indexOf("checkins") >= 0){
      try{
        var crows = ST.checkins.map(checkinRow);
        var cids = ST.checkins.map(function(c){ return String(c.id); });
        if (crows.length){
          var r3 = await supabase.from("checkins").upsert(crows, { onConflict: "assessment_id,local_id" });
          if (r3.error) throw r3.error;
        }
        var cdelq = supabase.from("checkins").delete().eq("assessment_id", AID);
        var r4 = await (cids.length ? cdelq.not("local_id", "in", "(" + cids.join(",") + ")") : cdelq);
        if (r4.error) throw r4.error;
        confirmed.push("checkins");
      }catch(e){ anyFailed = true; }
    }

    var dKeysThisRound = [];
    for (var i = 0; i < DOM.length; i++) if (mine.indexOf("d" + i) >= 0) dKeysThisRound.push(i);
    if (dKeysThisRound.length){
      try{
        var drows = dKeysThisRound.map(domRow);
        var r5 = await supabase.from("assessment_domains").upsert(drows, { onConflict: "assessment_id,domain_index" });
        if (r5.error) throw r5.error;
        dKeysThisRound.forEach(function(idx){ confirmed.push("d" + idx); });
      }catch(e){ anyFailed = true; }
    }

    if (mine.indexOf("b") >= 0){
      try{
        var r6 = await supabase.from("before_ratings").upsert(beforeRatingsRow(), { onConflict: "assessment_id" });
        if (r6.error) throw r6.error;
        confirmed.push("b");
      }catch(e){ anyFailed = true; }
    }

    // Assessments-row fields + cu blob, last. cu only ever carries
    // timestamps for sections confirmed above or previously synced.
    var aks = AKEYS.filter(function(k){ return mine.indexOf(k) >= 0; });
    var cuToSend = Object.assign({}, ST.cuSynced);
    confirmed.forEach(function(k){ cuToSend[k] = ST.cu[k]; });
    aks.forEach(function(k){ cuToSend[k] = ST.cu[k]; });

    var payload = aFields(aks);
    payload.cu = cuToSend;
    var r7 = await supabase.from("assessments").update(payload).eq("id", AID);
    if (r7.error) anyFailed = true;
    else confirmed = confirmed.concat(aks);

    confirmed.forEach(markSynced);
    if (confirmed.length){
      // Persist cuSynced immediately - don't wait for the next
      // debounced save - so a confirmed section can never be lost to
      // a reload before that timer fires.
      await db.saveRow(CURRENT_USER_ID, ST, getPendingKeys().length > 0);
    }

    PUSHING = false;
    setCloud(anyFailed ? "error" : "ok");
    if (REPUSH || getPendingKeys().length) pushPending();
    return { pushed: confirmed.length > 0, reason: anyFailed ? "partial failure - some sections retrying" : undefined };
  }catch(e){
    PUSHING = false;
    confirmed.forEach(markSynced);
    if (confirmed.length) db.saveRow(CURRENT_USER_ID, ST, getPendingKeys().length > 0);
    setCloud(isOfflineError(e) ? "offline" : "error");
    return { pushed: confirmed.length > 0, reason: e.message || "sync error" };
  }
}

// ---------------------------------------------------------------
// Pull + merge.
// ---------------------------------------------------------------
function localHasContent(){
  if (ST.p && (ST.p.name || ST.p.ndis || ST.p.disability || ST.p.goals)) return true;
  if (ST.sups && ST.sups.length) return true;
  if (ST.checkins && ST.checkins.length) return true;
  if (ST.brate && ST.brate.items && Object.keys(ST.brate.items).length) return true;
  for (var i = 0; i < DOM.length; i++){ var d = ST.d[i]; if (d && (d.gs || d.bs || d.notes || d.so || d.pn)) return true; }
  return false;
}
function cloudHasContent(cl){
  var p = (cl.a && cl.a.participant) ? cl.a.participant : {};
  if (p.name || p.ndis || p.disability || p.goals) return true;
  if (cl.s.length || cl.checkins.length) return true;
  if (cl.b && cl.b.items && Object.keys(cl.b.items).length) return true;
  for (var i = 0; i < cl.d.length; i++){ var d = cl.d[i]; if (d.gs || d.bs || d.notes || d.so || d.pn) return true; }
  return false;
}
function newerLocal(loc, cld){ if (!loc) return false; if (!cld) return true; return loc > cld; }

function adoptA(a, k){
  if (k === "role") ST.role = a.role;
  else if (k === "step") ST.step = a.step || ST.step;
  else if (k === "p") ST.p = Object.assign(ST.p, a.participant || {});
  else if (k === "adv") ST.adv = Object.assign(ST.adv, a.adv || {});
  else if (k === "psych") ST.psych = Object.assign(ST.psych, a.psych || {});
  else if (k === "preq") ST.preq = Object.assign(ST.preq, a.preq || {});
  else if (k === "consent"){ ST.consentDate = a.consent_date || ST.consentDate; if (a.consent_v) ST.consentV = a.consent_v; }
}
function adoptD(r){
  ST.d[r.domain_index] = { gs: r.gs || "", bs: r.bs || "", tab: r.tab || "good", freq: r.freq || "", stype: r.stype || "", impact: r.impact || "", change: r.change || "", notes: r.notes || "", so: r.so || "", sf: !!r.sf, sfn: r.sfn || "", pn: r.pn || "", pf: !!r.pf, skipped: false };
}
function adoptS(rows){
  ST.sups = rows.map(function(r){ return { id: r.local_id, name: r.name || "", rel: r.rel || "", dur: r.dur || "", support: r.support || "", without: r.without_support || "", msg: r.msg || "" }; });
}
function adoptCheckins(rows){
  ST.checkins = rows.map(function(r){ return { id: r.local_id, at: r.at, mood: r.mood, moodWord: r.mood_word || "", fatigue: r.fatigue, pain: r.pain, clarity: r.clarity, note: r.note || "" }; });
}
function adoptB(b){
  ST.brate = { locked: !!b.locked, items: b.items || {} };
  ST.brateLockedAt = b.locked_at || ST.brateLockedAt;
}
function adoptCloudAll(cl){
  var checkinsBak = null; // fresh() already resets checkins; nothing to preserve
  AKEYS.forEach(function(k){ adoptA(cl.a, k); });
  cl.d.forEach(adoptD);
  adoptS(cl.s);
  adoptCheckins(cl.checkins);
  if (cl.b) adoptB(cl.b);
  ST.cu = cl.a.cu || {};
  // Wholesale-adopting the cloud's copy means, by definition, nothing
  // is left pending - local now equals what the cloud already has.
  ST.cuSynced = Object.assign({}, ST.cu);
  if (!ST.consentV) ST.consentV = 2;
  if (!ST.consentDate) ST.consentDate = new Date().toISOString();
}

// Adopts the cloud's value for section k and marks it synced (local
// now matches cloud exactly, so it is no longer pending).
function adoptAndSync(k, stamp){
  ST.cu[k] = stamp;
  markSynced(k);
}

function mergeSections(cl){
  var ccu = cl.a.cu || {};
  AKEYS.forEach(function(k){
    if (!newerLocal(ST.cu[k], ccu[k]) && ccu[k]){ adoptA(cl.a, k); adoptAndSync(k, ccu[k]); }
    // else: local is newer (or cloud has nothing yet) - already
    // pending by definition (cu !== cuSynced), nothing more to do.
  });

  var byIdx = {};
  cl.d.forEach(function(r){ byIdx[r.domain_index] = r; });
  for (var i = 0; i < DOM.length; i++){
    var dk = "d" + i, crow = byIdx[i];
    var cstamp = crow ? (ccu[dk] || crow.client_updated_at) : null;
    if (!newerLocal(ST.cu[dk], cstamp) && crow){ adoptD(crow); if (cstamp) adoptAndSync(dk, cstamp); }
  }

  var cs = ccu.s || null;
  if (!cs) cl.s.forEach(function(r){ if (!cs || r.client_updated_at > cs) cs = r.client_updated_at; });
  if (!newerLocal(ST.cu.s, cs) && cs){ adoptS(cl.s); adoptAndSync("s", cs); }

  var ck = ccu.checkins || null;
  if (!ck) cl.checkins.forEach(function(r){ if (!ck || r.client_updated_at > ck) ck = r.client_updated_at; });
  if (!newerLocal(ST.cu.checkins, ck) && ck){ adoptCheckins(cl.checkins); adoptAndSync("checkins", ck); }

  // Locked before-ratings are the "uncontaminated baseline" - once
  // locked anywhere, that locked state always wins, on any device -
  // this branch intentionally does not check newerLocal first.
  var cb = cl.b, cbs = cb ? (ccu.b || cb.client_updated_at) : null;
  if (cb && cb.locked && !ST.brate.locked){ adoptB(cb); if (cbs) adoptAndSync("b", cbs); }
  else if (ST.brate.locked && (!cb || !cb.locked)){ /* local lock is pending by definition - nothing to do */ }
  else if (!newerLocal(ST.cu.b, cbs) && cb){ adoptB(cb); if (cbs) adoptAndSync("b", cbs); }
}

async function pullAllTables(){
  var results = await Promise.all([
    supabase.from("assessments").select("*").maybeSingle(),
    supabase.from("assessment_domains").select("*"),
    supabase.from("support_persons").select("*").order("position", { ascending: true }),
    supabase.from("before_ratings").select("*").maybeSingle(),
    supabase.from("checkins").select("*").order("at", { ascending: true })
  ]);
  results.forEach(function(r){ if (r.error) throw r.error; });
  return { a: results[0].data, d: results[1].data || [], s: results[2].data || [], b: results[3].data, checkins: results[4].data || [] };
}

// Pulls the server's copy of every table and reconciles it into ST.
// Handles: a different account having last used this device (never
// merges across accounts), the very first sync when both sides have
// real content (defers to the participant via getChoice()), and
// otherwise per-section merge by cu timestamp.
export async function pullAndReconcile(){
  var user = (await supabase.auth.getUser()).data.user;
  if (!user) return { reconciled: false, reason: "signed-out" };
  CURRENT_USER_ID = user.id;
  if (!(await isOnline())) return { reconciled: false, reason: "offline" };

  try{
    var cl = await pullAllTables();
    PULLED = true;
    var mark = await db.getSyncMark();

    if (mark && mark !== user.id){
      if (cl.a){ AID = cl.a.id; adoptCloudAll(cl); }
      else{
        resetInPlace();
        stampAll();
      }
      await db.setSyncMark(user.id);
      establishSnapshotBaseline();
      return { reconciled: true, adopted: "cloud-account-switch" };
    }

    if (!cl.a){
      stampAll();
      await db.setSyncMark(user.id);
      establishSnapshotBaseline();
      return { reconciled: true, adopted: "none-fresh" };
    }

    AID = cl.a.id;
    if (!mark && localHasContent() && cloudHasContent(cl)){
      CHOICE = cl;
      return { reconciled: false, reason: "choice-needed" };
    }

    mergeSections(cl);
    await db.setSyncMark(user.id);
    establishSnapshotBaseline();
    return { reconciled: true, adopted: "merged" };
  }catch(e){
    setCloud(isOfflineError(e) ? "offline" : "error");
    return { reconciled: false, reason: e.message || "pull error" };
  }
}

// Resolutions for the first-sync conflict screen.
export async function keepCloudChoice(){
  var cl = CHOICE; CHOICE = null;
  var user = (await supabase.auth.getUser()).data.user;
  adoptCloudAll(cl);
  if (user) await db.setSyncMark(user.id);
  establishSnapshotBaseline();
}
export async function keepLocalChoice(){
  CHOICE = null;
  var user = (await supabase.auth.getUser()).data.user;
  if (user) await db.setSyncMark(user.id);
  stampAll();
}

export async function deleteAccountEverywhere(){
  var { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (error) throw error;
  await db.clearRow();
  resetSyncSession();
  await supabase.auth.signOut();
  return data;
}

export function onAuthSignedOut(){
  resetSyncSession();
}
