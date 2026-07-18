// Bootstrap. Wires every render/*.js screen's data-action/data-field/
// data-onchange attributes (see delegate.js) to a single window.IAM
// namespace, via one set of delegated listeners attached to #root -
// no per-render re-wiring needed, and no reliance on a relaxed
// script-src 'unsafe-inline' CSP (see memory note
// iam-csp-inline-handlers for the history: this app used inline
// onclick="..." everywhere until 2026-07-18, when that was found to
// silently break every button in a real browser unless the CSP was
// loosened; this delegation rewrite lets the stricter CSP come back).

import { Network } from "@capacitor/network";
import { DOM } from "./data.js";
import { ST, touch, save, loadInitial, resetAll, nextSid, onStatus, trySync, getPendingChoice, establishSnapshotBaseline } from "./state.js";
import { renderScreen } from "./render.js";
import { focusScreenHeading } from "./render/shared.js";
import { initDelegation } from "./delegate.js";
import { giveConsentAction } from "./render/consent.js";
import * as authUi from "./render/auth.js";
import * as authApi from "./auth.js";
import { onNetworkChange, deleteAccountEverywhere, keepCloudChoice, keepLocalChoice } from "./supabase.js";
import { isConfigured } from "./config.js";
import { dlPDF, dlText, expJSON, impJSON } from "./pdf.js";
import { toggleExamples } from "./render/domain.js";
import { startDraft, getDraft, isEditing, setDraftField, supFirstNames } from "./render/checkin.js";
import { checkCrisisLanguage, safetyCardHtml } from "./safety.js";
import { dlCheckinPDF as pdfCheckin, dlCheckinText as txtCheckin } from "./pdf.js";

let session = null;
let deleteState = { confirmText: "", busy: false, error: "" };
let offlineAllowedFlag = false;
let offlineGuest = false;
const localOnly = !isConfigured();

async function refreshOfflineAllowed(){
  try{ offlineAllowedFlag = await authApi.offlineAllowed(); }catch(e){ offlineAllowedFlag = false; }
}

function ctx(){
  var hasSaved = !!ST.savedAt && ((ST.p && ST.p.name) || ST.d.some(function(d){ return d.gs; }));
  return {
    session: session,
    localOnly: localOnly,
    user: session ? session.user : null,
    deleteState: deleteState,
    hasSaved: hasSaved,
    savedLabel: (ST.p && ST.p.name) || "Previous assessment",
    savedDate: ST.savedAt ? new Date(ST.savedAt).toLocaleDateString() : "",
    choice: getPendingChoice(),
    offlineAllowed: offlineAllowedFlag,
    offlineGuest: offlineGuest
  };
}

function draw(){
  document.getElementById("root").innerHTML = renderScreen(ctx());
}
function refresh(){ draw(); }
function go(step){ ST.step = step; touch(); draw(); focusScreenHeading(); }
function gd(i){ ST.step = { t: "d", i: i }; touch(); draw(); focusScreenHeading(); }

function doBreak(){
  save();
  document.getElementById("root").innerHTML =
    '<div style="text-align:center;padding:3rem 1rem">' +
    '<div style="font-size:52px;margin-bottom:1rem" aria-hidden="true">&#9749;</div>' +
    '<h2 id="scr-h" style="margin-bottom:10px;color:#2d4a1e">Good work. Take a break.</h2>' +
    '<p class="body" style="max-width:360px;margin:0 auto 1.5rem">Everything is saved. Come back when you are ready.</p>' +
    '<button type="button" class="btn primary" data-action="refresh">Continue &rarr;</button></div>';
  focusScreenHeading();
}

// ---- consent / role ----
function giveConsent(){ giveConsentAction(); touch(); go("role"); }
function setRole(r){ ST.role = r; touch(); refresh(); }
function continueFromRole(){
  if (ST.role){ go("welcome"); return; }
  var el = document.getElementById("role-err");
  if (el){ el.textContent = "Please select your role first."; el.style.display = "block"; }
  else refresh();
}
async function confirmStartFresh(){
  if (!confirm("Start fresh? All saved data on this device - and, once synced, on the server - will be cleared.")) return;
  await resetAll();
  go("role");
}

// ---- auth ----
async function submitAuth(){
  var emailEl = document.getElementById("auth-email");
  var passEl = document.getElementById("auth-pass");
  var email = emailEl ? emailEl.value.trim() : "";
  var pass = passEl ? passEl.value : "";
  if (!email || !pass){ authUi.setAuthMsg("Enter your email and password."); refresh(); return; }
  if (authUi.authMode === "signup" && pass.length < 8){ authUi.setAuthMsg("Password must be at least 8 characters."); refresh(); return; }
  authUi.setAuthBusy(true); authUi.setAuthMsg(""); refresh();
  try{
    if (authUi.authMode === "signin"){
      await authApi.signIn(email, pass);
    } else {
      var result = await authApi.signUp(email, pass);
      if (!result.session){
        authUi.setAuthBusy(false);
        authUi.setAuthMode("signin");
        authUi.setAuthMsg("Account created. Check your email to confirm it, then sign in.");
        refresh();
        return;
      }
    }
  }catch(e){
    authUi.setAuthBusy(false);
    authUi.setAuthMsg(authApi.friendlyAuthError(e));
    refresh();
    return;
  }
  authUi.setAuthBusy(false);
  // onAuthStateChange (registered in bootstrap) updates `session` and redraws.
}

async function forgotPassword(){
  var emailEl = document.getElementById("auth-email");
  var email = emailEl ? emailEl.value.trim() : "";
  if (!email){ authUi.setAuthMsg("Enter your email address above, then select Forgot password."); refresh(); return; }
  try{
    await authApi.requestPasswordReset(email);
    authUi.setAuthMsg("If that address has an account, a password reset email has been sent.");
  }catch(e){
    authUi.setAuthMsg(authApi.friendlyAuthError(e));
  }
  refresh();
}

function setAuthMode(m){ authUi.setAuthMode(m); refresh(); }

// Lets a device that has synced with an account before keep working
// from its last-saved answers when there is no internet, rather than
// stranding the participant on a sign-in screen they can't complete
// offline anyway. Real sync resumes automatically once online + signed in.
function goOffline(){
  offlineGuest = true;
  refresh();
}

async function signOut(){
  offlineGuest = false;
  await authApi.signOut();
  await refreshOfflineAllowed();
  // onAuthStateChange redraws to the sign-in screen.
}

function setDeleteConfirmText(v){ deleteState.confirmText = v; deleteState.error = ""; refresh(); }
function backFromAccount(){ go(ST.role ? "welcome" : "role"); }

async function confirmDeleteAccount(){
  if (deleteState.confirmText !== "DELETE") return;
  deleteState.busy = true; refresh();
  try{
    await deleteAccountEverywhere();
    deleteState = { confirmText: "", busy: false, error: "" };
    await resetAll();
    // onAuthStateChange redraws to the sign-in screen.
  }catch(e){
    deleteState.busy = false;
    deleteState.error = (e && e.message) || "Could not delete your account. Check your connection and try again.";
    refresh();
  }
}

// ---- first-sync conflict choice ----
async function keepCloud(){
  if (!confirm("Keep the answers in your account?\n\nThe answers on this device will be replaced.")) return;
  await keepCloudChoice();
  establishSnapshotBaseline();
  refresh();
}
async function keepLocal(){
  if (!confirm("Keep the answers on this device?\n\nThe answers in your account will be replaced.")) return;
  await keepLocalChoice();
  establishSnapshotBaseline();
  await save();
  refresh();
}

// ---- participant details ----
// (part.js originally mutated IAM.ST.p.<field> directly inline -
// replaced with a real setter now that inline script isn't an option)
function setPart(key, val){ ST.p[key] = val; touch(); }

// ---- pre-questions ----
function setPreq(key, val){
  ST.preq[key] = val;
  touch();
  if (key === "dayRating" || key === "trajectory" || key === "commPref") refresh();
}

// ---- before ratings ----
function setBrate(key, val){
  ST.brate.items[key] = val === "" ? undefined : parseInt(val, 10);
  touch();
  refresh();
}
async function lockBrate(){
  if (!confirm("Lock all before ratings? This cannot be undone. Ratings are the uncontaminated baseline.")) return;
  ST.brate.locked = true;
  ST.brateLockedAt = new Date().toISOString();
  touch();
  await save();
  go("edusheet");
}

// ---- domains ----
function setDomTab(i, tab){ ST.d[i].tab = tab; touch(); refresh(); }
function toggleExamplesUI(i){ toggleExamples(i); refresh(); }
function setDom(i, key, val){ ST.d[i][key] = val; touch(); }
function setDomFlag(i, checked){ ST.d[i].sf = checked; touch(); refresh(); }
function setDomPFlag(i, checked){ ST.d[i].pf = checked; touch(); }
function useEx(i, ei){
  ST.d[i].gs = DOM[i].ex[ei];
  touch();
  var ta = document.getElementById("dom" + i + "-gs");
  if (ta) ta.value = ST.d[i].gs;
}
function saveDom(i){
  ST.d[i].skipped = false; touch(); save();
  if (i === DOM.length - 1) go(ST.role === "psych" ? "psych" : "sups");
  else gd(i + 1);
}
function skipDom(i){
  ST.d[i].skipped = true; touch(); save();
  if (i === DOM.length - 1) go(ST.role === "psych" ? "psych" : "sups");
  else gd(i + 1);
}

// ---- support circle ----
function addSup(){ ST.sups.push({ id: nextSid(), name:"", rel:"", dur:"", support:"", without:"", msg:"" }); touch(); refresh(); }
function rmSup(idx){ ST.sups.splice(idx, 1); touch(); refresh(); }
function setSup(idx, key, val){ ST.sups[idx][key] = val; touch(); }

// ---- daily check-in ----
function startCheckin(){ startDraft(null); go("checkin"); }
function editCheckin(id){ startDraft(id); go("checkin"); }
function leaveCheckin(){ go(ST.checkins.length ? "checkin-history" : "role"); }

// Rating buttons re-render (to show the pressed state); the note field
// does NOT re-render on input - it live-patches only the safety card,
// so typing never loses cursor focus. The safety check is pure local
// string matching (see safety.js) - it can never be blocked by
// network state.
function setCheckin(key, val){ setDraftField(key, val); if (key !== "moodWord") refresh(); }
function setCheckinNote(val){
  setDraftField("note", val);
  var slot = document.getElementById("safety-card");
  if (slot) slot.innerHTML = safetyCardHtml(checkCrisisLanguage(val).level, supFirstNames());
}
async function saveCheckin(){
  var d = getDraft();
  if (!d) return;
  if (isEditing()){
    var idx = ST.checkins.findIndex(function(c){ return c.id === d.id; });
    if (idx !== -1) ST.checkins[idx] = d; else ST.checkins.push(d);
  } else {
    ST.checkins.push(d);
  }
  touch();
  await save();
  go("checkin-history");
}
function deleteCheckin(id){
  var entry = ST.checkins.find(function(c){ return c.id === id; });
  if (!entry || entry.withdrawnAt) return;
  if (entry.seq){
    // Receipted: the record is append-only, so this is a withdrawal -
    // words and ratings erased everywhere, existence preserved. The
    // server assigns the real withdrawal time on push (0003 trigger);
    // the local stamp is provisional until then.
    if (!confirm("Withdraw this check-in?\n\nYour words and ratings will be permanently erased everywhere. The date, and the fact that an entry existed, will remain visible in your record.\n\nThis cannot be undone.")) return;
    entry.withdrawnAt = new Date().toISOString();
    entry.note = ""; entry.moodWord = "";
    entry.mood = null; entry.fatigue = null; entry.pain = null; entry.clarity = null;
  } else {
    // Never backed up: nothing has been received, so a true delete is
    // honest - the record's guarantees start at receipt.
    if (!confirm("Delete this check-in? It has not been backed up yet, so it will be gone completely. This cannot be undone.")) return;
    ST.checkins = ST.checkins.filter(function(c){ return c.id !== id; });
  }
  touch(); save();
  refresh();
}
function focusRoleSection(){
  var h = document.getElementById("scr-h");
  if (h){ h.setAttribute("tabindex", "-1"); h.focus(); h.scrollIntoView({ behavior: "smooth", block: "center" }); }
}
function dlCheckinPDFUI(){
  var f = document.getElementById("ck-from"), t = document.getElementById("ck-to");
  pdfCheckin(f ? f.value : "", t ? t.value : "");
}
function dlCheckinTextUI(){
  var f = document.getElementById("ck-from"), t = document.getElementById("ck-to");
  txtCheckin(f ? f.value : "", t ? t.value : "");
}

// ---- advocacy / psych ----
function setAdv(key, val){ ST.adv[key] = val; touch(); }
function setPsych(key, val){ ST.psych[key] = val; touch(); }

// ---- small DOM-only handlers that used to be inline script ----
// (auth.js's "show my password" checkbox, report.js's hidden file
// input trigger for data import) - now real handlers instead of
// literal JS sitting in an HTML attribute.
function toggleShowPassword(checked){
  var el = document.getElementById("auth-pass");
  if (el) el.type = checked ? "text" : "password";
}
function triggerFileImport(){
  var el = document.getElementById("jimp");
  if (el) el.click();
}
function printReport(){ window.print(); }

// ---- window.IAM namespace ----
const IAM = {
  touch: touch, save: save, refresh: refresh, go: go, gd: gd, doBreak: doBreak,
  giveConsent: giveConsent, setRole: setRole, continueFromRole: continueFromRole, confirmStartFresh: confirmStartFresh,
  keepCloud: keepCloud, keepLocal: keepLocal,
  submitAuth: submitAuth, forgotPassword: forgotPassword, setAuthMode: setAuthMode, goOffline: goOffline,
  signOut: signOut, setDeleteConfirmText: setDeleteConfirmText, confirmDeleteAccount: confirmDeleteAccount, backFromAccount: backFromAccount,
  setPart: setPart,
  setPreq: setPreq, setBrate: setBrate, lockBrate: lockBrate,
  setDomTab: setDomTab, setDom: setDom, setDomFlag: setDomFlag, setDomPFlag: setDomPFlag,
  toggleExamples: toggleExamplesUI,
  useEx: useEx, saveDom: saveDom, skipDom: skipDom,
  addSup: addSup, rmSup: rmSup, setSup: setSup,
  setAdv: setAdv, setPsych: setPsych,
  startCheckin: startCheckin, editCheckin: editCheckin, leaveCheckin: leaveCheckin,
  setCheckin: setCheckin, setCheckinNote: setCheckinNote, saveCheckin: saveCheckin,
  deleteCheckin: deleteCheckin, focusRoleSection: focusRoleSection,
  dlCheckinPDF: dlCheckinPDFUI, dlCheckinText: dlCheckinTextUI,
  dlPDF: dlPDF, dlText: dlText, expJSON: expJSON, impJSON: impJSON,
  toggleShowPassword: toggleShowPassword, triggerFileImport: triggerFileImport, printReport: printReport
};
Object.defineProperty(IAM, "ST", { get: function(){ return ST; } });
window.IAM = IAM;
initDelegation(document.getElementById("root"), IAM);

// Live-patches the save-status bar without a full re-render, so
// typing in a field never loses cursor focus, while save failures are
// still surfaced immediately and visibly (the original tool only
// logged storage errors to the console - see Phase 1 review).
onStatus(function(s){
  var dot = document.querySelector(".sdot");
  var msg = document.getElementById("smsg");
  if (!dot || !msg) return;
  if (s.state === "unsaved"){ dot.classList.add("u"); dot.style.background = ""; msg.textContent = "Unsaved changes"; }
  else if (s.state === "saving"){ msg.textContent = "Saving..."; }
  else if (s.state === "saved"){ dot.classList.remove("u"); dot.style.background = ""; msg.textContent = "Saved " + new Date(s.at).toLocaleTimeString(); }
  else if (s.state === "offline"){ msg.textContent = "Saved on this device - will sync once you are back online"; }
  else if (s.state === "error"){ dot.style.background = "#c0392b"; msg.setAttribute("role", "alert"); msg.textContent = s.message; }
});

async function bootstrap(){
  await loadInitial();
  if (localOnly){
    console.warn("Supabase not configured (www/js/config.js) - running in local-only mode: no accounts, no sync.");
    draw();
    focusScreenHeading();
    return;
  }
  session = await authApi.getSession();
  await refreshOfflineAllowed();
  authApi.onAuthChange(function(event, newSession){
    session = newSession;
    if (newSession){
      offlineGuest = false;
      loadInitial().then(function(){ refreshOfflineAllowed().then(draw); });
    } else {
      draw();
    }
  });
  try{
    var status = await Network.getStatus();
    if (status.connected) trySync();
  }catch(e){}
  onNetworkChange(function(connected){ if (connected) trySync(); });
  draw();
  focusScreenHeading();
}

bootstrap();
