// Application state - ported from the original single-file tool.
// The shape of ST is unchanged from iam_v6 so nothing about the
// 12 domains, pre-questions, before-ratings, advocacy, or psych
// sections had to be redesigned - only where it is persisted changed.

import { DOM } from "./data.js";
import * as db from "./db.js";
import { supabase, pushIfDirty, pullAndReconcile } from "./supabase.js";

export function fresh(){
  return {
    role: null, step: "consent",
    p: { name:"", dob:"", ndis:"", disability:"", by:"", role:"", date: new Date().toISOString().split("T")[0], goals:"", barriers:"" },
    d: DOM.map(function(){ return { gs:"", bs:"", tab:"good", freq:"", stype:"", impact:"", change:"", notes:"", so:"", sf:false, sfn:"", pn:"", pf:false, skipped:false }; }),
    sups: [],
    adv: { typical:"", hard:"", risks:"", informal:"", equip:"", history:"", worked:"", failed:"", myword:"" },
    psych: { overview:"", goals:"", notes:"", readiness:"" },
    checkins: [],
    savedAt: null, consentDate: null,
    preq: { dayRating:"", dayNote:"", disabilityDesc:"", trajectory:"", changeNote:"", dayVariation:"", assessHistory:"", assessDifficulty:"", commPref:"", commBarrier:"", commAdjust:"", sessionFlag:"" },
    brate: { locked:false, items:{} },
    brateLockedAt: null
  };
}

export let ST = fresh();
export let SID = 1;
export let dirty = false;

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

// Call on every field edit - mirrors the original md() debounce pattern.
export function touch(){
  dirty = true;
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
    var result = await pushIfDirty();
    if (result.pushed) emitStatus({ state: "synced" });
    else if (result.reason === "offline") emitStatus({ state: "offline" });
  }catch(e){ /* sync errors are non-fatal - local save already succeeded */ }
}

// Loads the local copy, then reconciles with the server copy if
// signed in and online (last-write-wins by updated_at).
export async function loadInitial(){
  var row = await db.loadRow();
  if (row && row.data){
    try{ Object.assign(ST, JSON.parse(row.data)); }catch(e){ /* corrupt row - start fresh below */ }
  }
  try{
    var serverData = await pullAndReconcile();
    if (serverData) Object.assign(ST, serverData);
  }catch(e){ /* offline or signed out - local copy stands */ }
}

// "Start fresh" - resets the in-progress assessment. Because the
// server row mirrors local state, this also clears the previously
// synced draft once it next syncs. This does NOT delete the account
// or touch auth - that is handled separately by account deletion.
export async function resetAll(){
  ST = fresh();
  SID = 1;
  dirty = true;
  await save();
}
