// Bootstrap. Wires every render/*.js screen's inline onclick handlers
// (kept as plain onclick="IAM.foo(...)" strings, same pattern as the
// original single-file tool - the lowest-risk way to preserve the
// original's tested interaction logic through this refactor) to a
// single window.IAM namespace.

import { Network } from "@capacitor/network";
import { DOM } from "./data.js";
import { ST, touch, save, loadInitial, resetAll, nextSid, onStatus, trySync } from "./state.js";
import { renderScreen } from "./render.js";
import { focusScreenHeading } from "./render/shared.js";
import { giveConsentAction } from "./render/consent.js";
import * as authUi from "./render/auth.js";
import * as authApi from "./auth.js";
import { onNetworkChange, deleteAccountEverywhere } from "./supabase.js";
import { isConfigured } from "./config.js";
import { dlPDF, dlText, expJSON, impJSON } from "./pdf.js";

let session = null;
let deleteState = { confirmText: "", busy: false, error: "" };
const localOnly = !isConfigured();

function ctx(){
  var hasSaved = !!ST.savedAt && ((ST.p && ST.p.name) || ST.d.some(function(d){ return d.gs; }));
  return {
    session: session,
    localOnly: localOnly,
    user: session ? session.user : null,
    deleteState: deleteState,
    hasSaved: hasSaved,
    savedLabel: (ST.p && ST.p.name) || "Previous assessment",
    savedDate: ST.savedAt ? new Date(ST.savedAt).toLocaleDateString() : ""
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
    '<button type="button" class="btn primary" onclick="IAM.refresh()">Continue &rarr;</button></div>';
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
    authUi.setAuthMsg((e && e.message) || "Something went wrong. Please try again.");
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
    authUi.setAuthMsg("Could not send a reset email right now.");
  }
  refresh();
}

function setAuthMode(m){ authUi.setAuthMode(m); refresh(); }

async function signOut(){
  await authApi.signOut();
  // onAuthStateChange redraws to the sign-in screen.
}

function setDeleteConfirmText(v){ deleteState.confirmText = v; deleteState.error = ""; refresh(); }

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

// ---- advocacy / psych ----
function setAdv(key, val){ ST.adv[key] = val; touch(); }
function setPsych(key, val){ ST.psych[key] = val; touch(); }

// ---- window.IAM namespace ----
const IAM = {
  touch: touch, save: save, refresh: refresh, go: go, gd: gd, doBreak: doBreak,
  giveConsent: giveConsent, setRole: setRole, continueFromRole: continueFromRole, confirmStartFresh: confirmStartFresh,
  submitAuth: submitAuth, forgotPassword: forgotPassword, setAuthMode: setAuthMode,
  signOut: signOut, setDeleteConfirmText: setDeleteConfirmText, confirmDeleteAccount: confirmDeleteAccount,
  setPreq: setPreq, setBrate: setBrate, lockBrate: lockBrate,
  setDomTab: setDomTab, setDom: setDom, setDomFlag: setDomFlag, setDomPFlag: setDomPFlag,
  useEx: useEx, saveDom: saveDom, skipDom: skipDom,
  addSup: addSup, rmSup: rmSup, setSup: setSup,
  setAdv: setAdv, setPsych: setPsych,
  dlPDF: dlPDF, dlText: dlText, expJSON: expJSON, impJSON: impJSON
};
Object.defineProperty(IAM, "ST", { get: function(){ return ST; } });
window.IAM = IAM;

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
  authApi.onAuthChange(function(event, newSession){
    session = newSession;
    if (newSession){
      loadInitial().then(draw);
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
