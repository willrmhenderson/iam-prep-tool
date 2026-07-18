import { esc } from "../util.js";

export let authMode = "signin";
export let authMsg = "";
export let authBusy = false;

export function setAuthMode(m){ authMode = m; authMsg = ""; }
export function setAuthMsg(m){ authMsg = m; }
export function setAuthBusy(b){ authBusy = b; }

function pwField(){
  return '<label for="auth-pass">Password</label>' +
    '<input id="auth-pass" type="password" autocomplete="' + (authMode === "signin" ? "current-password" : "new-password") + '" placeholder="At least 8 characters">' +
    '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-weight:normal;font-size:0.8125rem;color:#555">' +
    '<input type="checkbox" style="width:auto" onchange="document.getElementById(\'auth-pass\').type=this.checked?\'text\':\'password\'"> Show my password</label>';
}

export function rAuth(offlineAllowed){
  var isSignIn = authMode === "signin";
  return '<div style="margin-bottom:1.25rem">' +
    '<h2 id="scr-h">' + (isSignIn ? "Sign in" : "Create your account") + '</h2>' +
    '<p class="body">' + (isSignIn ?
      "Sign in so your answers can sync securely across your devices." :
      "Create an account so your answers are backed up and available on any device you sign in on.") + '</p></div>' +
    (authMsg ? '<div class="card" style="border-left:4px solid #c0392b;background:#fdf2f2"><p class="body" role="alert" style="color:#8B1A1A;margin:0">' + esc(authMsg) + '</p></div>' : "") +
    '<div class="card">' +
    '<label for="auth-email">Email address</label>' +
    '<input id="auth-email" type="text" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="you@example.com">' +
    pwField() +
    '<button type="button" class="btn primary" style="width:100%;justify-content:center;margin-top:12px;padding:12px" ' +
      (authBusy ? "disabled" : "") + ' onclick="IAM.submitAuth()">' +
      (authBusy ? "Please wait..." : (isSignIn ? "Sign in" : "Create account")) + '</button>' +
    (isSignIn ? '<button type="button" class="btn" style="width:100%;justify-content:center;margin-top:8px" onclick="IAM.forgotPassword()">Forgot password?</button>' : "") +
    '</div>' +
    '<p style="text-align:center;font-size:13px;color:#666">' +
      (isSignIn ? "New here? " : "Already have an account? ") +
      '<button type="button" class="btn sm" onclick="IAM.setAuthMode(\'' + (isSignIn ? "signup" : "signin") + '\')">' +
      (isSignIn ? "Create an account" : "Sign in") + '</button></p>' +
    (isSignIn && offlineAllowed ?
      '<div class="card card-blue"><p class="body" style="margin-bottom:8px">No internet right now? This device has signed in before, so you can keep working on your last-saved answers - they will sync once you are back online and signed in.</p>' +
      '<button type="button" class="btn" style="width:100%;justify-content:center" onclick="IAM.goOffline()">Keep working offline</button></div>' : "") +
    '<p style="font-size:12px;color:#aaa;text-align:center;margin-top:1rem">Your data is encrypted on this device and synced to a Supabase database hosted in Sydney, Australia. Nobody else can see it.</p>';
}

export function rAccount(user, deleteState){
  var email = user && user.email ? user.email : "Unknown";
  return '<div style="margin-bottom:1.25rem"><h2 id="scr-h">Account</h2></div>' +
    '<div class="card"><div class="sec" style="margin-top:0">Signed in as</div>' +
    '<p class="body" style="font-weight:600">' + esc(email) + '</p>' +
    '<button type="button" class="btn" onclick="IAM.signOut()">Sign out</button></div>' +
    '<div class="card" style="border-left:4px solid #c0392b">' +
    '<h3 style="margin-bottom:8px;color:#8B1A1A">Delete my account and all my data</h3>' +
    '<p class="body">This permanently deletes your account and every answer you have entered, both on this device and from our servers. This cannot be undone.</p>' +
    '<label for="del-confirm">Type DELETE to confirm</label>' +
    '<input id="del-confirm" type="text" autocapitalize="off" oninput="IAM.setDeleteConfirmText(this.value)" value="' + esc(deleteState.confirmText || "") + '">' +
    (deleteState.error ? '<p class="body" role="alert" style="color:#8B1A1A">' + esc(deleteState.error) + '</p>' : "") +
    '<button type="button" class="btn danger" ' + (deleteState.confirmText === "DELETE" && !deleteState.busy ? "" : "disabled") + ' onclick="IAM.confirmDeleteAccount()">' +
      (deleteState.busy ? "Deleting..." : "Permanently delete my account") + '</button>' +
    '</div>' +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go(IAM.ST.role ? \'welcome\' : \'role\')">&larr; Back</button></div>';
}
