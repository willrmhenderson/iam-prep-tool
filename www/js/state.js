// Application state - ported from the original single-file tool.
// The shape of ST is unchanged from iam_v6 so nothing about the
// 12 domains, pre-questions, before-ratings, advocacy, or psych
// sections had to be redesigned - only where it is persisted changed.
//
// Section-level dirty tracking (ST.cu, ST.cuSynced, sectionSnapshots) is a
// faithful port of the proven design from the D: drive Phase 3 build
// (deploy/index.html, stampChanges/stampAll) - it lets sync push only
// the sections that actually changed, and lets the cloud side resolve
// conflicts per-section instead of whole-document last-write-wins.
// Ported deliberately, not reinvented, since that design is already
// tested and live against the real database this app now targets.

import { DOM } from "./data.js";
import * as db from "./db.js";
import { supabase, pushPending, pullAndReconcile, getChoice } from "./supabase.js";

// Section keys stored directly on the assessments row (as opposed to
// child tables - domains, support persons, before-ratings - which are
// tracked by their own cu keys "d0".."d11", "s", "b").
export const AKEYS = ["role", "step", "p", "adv", "psych", "preq", "consent"];

export function fresh(){
  return {
    role: null, step: "consent",
    p: { name:"", dob:"", ndis:"", disability:"", by:"", role:"", date: new Date().toISOString().split("T")[0], goals:"", barriers:"" },
    d: DOM.map(function(){ return { gs:"", bs:"", tab:"good", freq:"", stype:"", impact:"", change:"", notes:"", so:"", sf:false, sfn:"", pn:"", pf:false, skipped:false }; }),
    sups: [],
    adv: { typical:"", hard:"", risks:"", informal:"", equip:"", history:"", worked:"", failed:"", myword:"" },
    psych: { overview:"", goals:"", notes:"", readiness:"" },
    checkins: [],
    savedAt: null, consentDate: null, consentV: 2,
    preq: { dayRating:"", dayNote:"", disabilityDesc:"", trajectory:"", changeNote:"", dayVariation:"", assessHistory:"", assessDifficulty:"", commPref:"", commBarrier:"", commAdjust:"", sessionFlag:"" },
    brate: { locked:false, items:{} },
    brateLockedAt: null,
    // cu[key] = ISO timestamp this section was last changed ON THIS
    // DEVICE. Compared against the server's cu map to decide, per
    // section, whether to push local changes or adopt the server's.
    //
    // cuSynced[key] = the cu[key] value that was last CONFIRMED pushed
    // successfully. A section is "pending" exactly when cu[key] !==
    // cuSynced[key]. Both are persisted as ordinary ST fields (saved
    // to the encrypted local row like everything else), which is
    // deliberate: an earlier version tracked "pending" in a plain
    // in-memory object, and that object was silently wiped on every
    // page reload/app restart - if a push had failed and not yet
    // retried, the fact that a section still needed syncing was lost
    // forever, and the next successful pull would then overwrite the
    // real local answer with stale/absent cloud data. Deriving
    // "pending" from two persisted timestamps instead of a separate
    // memory-only flag closes that hole: it survives restarts, and
    // supabase.js only ever advances cuSynced[key] for a section once
    // that section's own write is confirmed to have succeeded - never
    // bundled optimistically with unrelated sections.
    cu: {},
    cuSynced: {}
  };
}

export let ST = fresh();
export let SID = 1;
export let dirty = false;

let LASTSNAP = null;

// A section is pending sync when its cu stamp hasn't been confirmed
// pushed yet. Computed fresh every time, never cached - so it can
// never go stale or be forgotten across a reload.
export function getPendingKeys(){
  if (!ST.cu) return [];
  if (!ST.cuSynced) ST.cuSynced = {};
  var out = [];
  for (var k in ST.cu) if (ST.cu[k] !== ST.cuSynced[k]) out.push(k);
  return out;
}

// Called by supabase.js only after confirming section k's own write
// actually succeeded - never speculatively.
export function markSynced(k){
  if (!ST.cuSynced) ST.cuSynced = {};
  ST.cuSynced[k] = ST.cu[k];
}

// Importers cannot assign to an imported binding directly (only the
// exporting module can), so support-person IDs are handed out through
// this function rather than incrementing SID from render.js.
export function nextSid(){ return SID++; }

let saveTimer = null;
const statusListeners = [];

export function onStatus(cb){ statusListeners.push(cb); }
function emitStatus(s){ statusListeners.forEach(function(fn){ fn(s); }); }

export function getStatus(){
  return { dirty: dirty, savedAt: ST.savedAt };
}

// One JSON string per section - cheap to compute, and comparing
// strings catches any change anywhere inside a section without every
// individual field setter having to remember to flag it itself.
export function sectionSnapshots(){
  var s = {
    role: JSON.stringify(ST.role), step: JSON.stringify(ST.step),
    p: JSON.stringify(ST.p), adv: JSON.stringify(ST.adv),
    psych: JSON.stringify(ST.psych), preq: JSON.stringify(ST.preq),
    consent: JSON.stringify([ST.consentDate, ST.consentV]),
    s: JSON.stringify(ST.sups),
    b: JSON.stringify([ST.brate, ST.brateLockedAt]),
    checkins: JSON.stringify(ST.checkins)
  };
  for (var i = 0; i < DOM.length; i++) s["d" + i] = JSON.stringify(ST.d[i]);
  return s;
}

// Diffs against the last known snapshot and stamps + flags only what
// actually changed. Called synchronously from touch() (see below) -
// an improvement on the original's 30-second timer poll, since every
// edit already runs through touch() for local autosave.
export function stampChanges(){
  if (!ST.cu) ST.cu = {};
  var snap = sectionSnapshots();
  if (LASTSNAP){
    var now = new Date().toISOString();
    for (var k in snap) if (snap[k] !== LASTSNAP[k]) ST.cu[k] = now;
  }
  LASTSNAP = snap;
}

// Marks every section as locally changed - used after "Start fresh",
// after the participant explicitly chooses to keep this device's
// answers over the account's during a first-sync conflict, and the
// first time a brand new local draft is saved.
export function stampAll(){
  if (!ST.cu) ST.cu = {};
  var now = new Date().toISOString(), snap = sectionSnapshots();
  for (var k in snap) ST.cu[k] = now;
  LASTSNAP = snap;
}

// Establishes the snapshot baseline without marking anything dirty -
// call right after loading/reconciling so the next real edit is what
// gets detected, not the act of loading itself.
export function establishSnapshotBaseline(){
  LASTSNAP = sectionSnapshots();
}

// Call on every field edit - mirrors the original md() debounce pattern.
export function touch(){
  dirty = true;
  stampChanges();
  emitStatus({ state: "unsaved" });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1200);
}

async function currentUserId(){
  try{
    var { data } = await supabase.auth.getUser();
    return data.user ? data.user.id : null;
  }catch(e){ return null; }
}

// Saves locally first (always succeeds offline), then attempts a
// background push to Supabase. Local save failure is surfaced to the
// UI explicitly - this fixes the original tool's silent-failure bug,
// where a full localStorage or blocked storage produced no warning at
// all even though the app told the user "everything is saved."
export async function save(){
  emitStatus({ state: "saving" });
  try{
    var userId = await currentUserId();
    ST.savedAt = new Date().toISOString();
    await db.saveRow(userId, ST, true);
    dirty = false;
    emitStatus({ state: "saved", at: ST.savedAt });
  }catch(e){
    emitStatus({
      state: "error",
      message: "Could not save on this device. Your answers are still on screen - please do not close the app until this is resolved. (" + (e && e.message ? e.message : "unknown storage error") + ")"
    });
    return; // don't attempt a sync push if the local save itself failed
  }
  trySync();
}

export async function trySync(){
  try{
    var result = await pushPending();
    if (result.pushed) emitStatus({ state: "synced" });
    else if (result.reason === "offline") emitStatus({ state: "offline" });
  }catch(e){ /* sync errors are non-fatal - local save already succeeded */ }
}

// Loads the local copy, then reconciles with the server copy if
// signed in and online. Section-level reconciliation (per-domain,
// support list, before-ratings lock supremacy) happens inside
// pullAndReconcile() / supabase.js. If both this device and the
// account have real, different answers on first sync, reconciliation
// pauses and getPendingChoice() returns non-null - the caller (main.js)
// is responsible for routing to the conflict-choice screen in that case.
export async function loadInitial(){
  var row = await db.loadRow();
  if (row && row.data){
    try{ Object.assign(ST, JSON.parse(row.data)); }catch(e){ /* corrupt row - start fresh below */ }
  }
  if (!ST.cu) ST.cu = {};
  if (!ST.cuSynced) ST.cuSynced = {};
  try{
    await pullAndReconcile();
  }catch(e){ /* offline or signed out - local copy stands */ }
  if (!getChoice()) establishSnapshotBaseline();
}

export function getPendingChoice(){ return getChoice(); }

// Resets every field of ST in place to fresh() values, preserving
// only consent (already given, no need to re-ask). Used when a
// different account signs in on this device and the account has no
// cloud data yet - the previous account's answers must not leak
// forward under the new account. A plain field reassignment on ST
// would not be enough here (only state.js may reassign the exported
// ST binding itself; supabase.js, which needs this, can only mutate
// ST's contents), so this clears every key explicitly instead.
export function resetInPlace(){
  var cv = ST.consentV, cd = ST.consentDate;
  var f = fresh();
  Object.keys(ST).forEach(function(k){ delete ST[k]; });
  Object.assign(ST, f);
  ST.consentV = cv; ST.consentDate = cd;
  SID = 1;
}

// "Start fresh" - resets the in-progress assessment. Because the
// server row mirrors local state, this also clears the previously
// synced draft once it next syncs. This does NOT delete the account
// or touch auth - that is handled separately by account deletion.
export async function resetAll(){
  ST = fresh();
  SID = 1;
  dirty = true;
  stampAll();
  await save();
}
