// Thin wrapper around Supabase Auth (email + password). Screen markup
// for sign-in/sign-up lives in render.js, same as every other screen.

import { supabase } from "./supabase.js";
import * as db from "./db.js";

export async function signUp(email, password){
  var { data, error } = await supabase.auth.signUp({ email: email, password: password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password){
  var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
  if (error) throw error;
  // A real login clears the offline-access lock set by the last
  // explicit sign-out (see signOut() below and offlineAllowed()).
  await db.setSyncLock(false);
  return data;
}

// Ported from the proven design's friendlyAuthError() - translates
// raw Supabase error text into plain sentences a participant can
// actually act on, instead of surfacing technical wording verbatim.
export function friendlyAuthError(err){
  var m = (err && err.message) ? err.message : "";
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(m))
    return "We could not connect to the internet. Check your connection and try again. Anything you typed is still saved on this device.";
  if (/Invalid login credentials/i.test(m))
    return "That email or password is not right. Please check and try again. If you forgot your password, use the ‘I forgot my password’ button.";
  if (/Email not confirmed/i.test(m))
    return "Your account needs to be confirmed first. Open the email we sent you and tap the link inside. Then come back here and log in.";
  if (/already registered|already exists/i.test(m))
    return "There is already an account with this email. Try logging in instead.";
  if (/rate limit|too many|429/i.test(m))
    return "Too many tries. Please wait a few minutes and try again.";
  if (/at least|password should|weak/i.test(m))
    return "Your password needs to be at least 8 characters long.";
  if (/email/i.test(m) && /invalid|valid/i.test(m))
    return "That does not look like an email address. Please check it and try again.";
  return m || "Something went wrong. Please try again.";
}

// Explicit sign-out sets a device lock disabling the "keep working
// offline" bypass (see offlineAllowed() below) until the next real
// login - a session simply expiring does NOT set this, only a
// deliberate sign-out, so a shared device can't be left in a state
// where anyone can keep using someone else's cached answers offline
// indefinitely after they meant to sign out.
export async function signOut(){
  await db.setSyncLock(true);
  await supabase.auth.signOut();
}

// True once this device has synced with some account at least once
// (db.getSyncMark()) and hasn't had an explicit sign-out since
// (db.getSyncLock()) - lets a returning, previously-synced participant
// keep working from their last-known answers when there is no
// internet, without forcing them through a login screen they can't
// complete offline anyway.
export async function offlineAllowed(){
  var mark = await db.getSyncMark();
  var locked = await db.getSyncLock();
  return !!mark && !locked;
}

export async function requestPasswordReset(email){
  var { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getSession(){
  var { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb){
  supabase.auth.onAuthStateChange(function(event, session){ cb(event, session); });
}
