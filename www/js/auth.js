// Thin wrapper around Supabase Auth (email + password). Screen markup
// for sign-in/sign-up lives in render.js, same as every other screen.

import { supabase } from "./supabase.js";

export async function signUp(email, password){
  var { data, error } = await supabase.auth.signUp({ email: email, password: password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password){
  var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
  if (error) throw error;
  return data;
}

export async function signOut(){
  await supabase.auth.signOut();
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
