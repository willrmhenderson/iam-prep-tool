// First-sync conflict screen: shown only when this device and the
// signed-in account both already have real, different answers, so
// nothing is ever silently overwritten. Ported from the proven
// rChoice()/keepCloud()/keepLocal() design.

import { esc } from "../util.js";
import { ST } from "../state.js";

export function rChoice(choice){
  var ca = choice.a || {};
  var cp = ca.participant || {};
  return '<div style="margin-bottom:1.5rem"><h2 id="scr-h" style="color:#2d4a1e;margin-bottom:6px">We found two sets of answers</h2>' +
    '<p class="body">There are saved answers in your account, and different saved answers on this device. Please choose which set to keep. The other set will be replaced.</p></div>' +
    '<div class="card card-blue"><h3 style="margin-bottom:6px">Answers in your account</h3>' +
    '<p class="body">Last saved ' + esc(ca.saved_at ? new Date(ca.saved_at).toLocaleString() : "(time unknown)") + (cp.name ? " — for " + esc(cp.name) : "") + '</p>' +
    '<button type="button" class="btn primary" style="width:100%;justify-content:center;padding:14px;margin-top:8px" onclick="IAM.keepCloud()">Keep the answers in my account</button></div>' +
    '<div class="card card-green"><h3 style="margin-bottom:6px">Answers on this device</h3>' +
    '<p class="body">Last saved ' + esc(ST.savedAt ? new Date(ST.savedAt).toLocaleString() : "(time unknown)") + (ST.p.name ? " — for " + esc(ST.p.name) : "") + '</p>' +
    '<button type="button" class="btn primary" style="width:100%;justify-content:center;padding:14px;margin-top:8px" onclick="IAM.keepLocal()">Keep the answers on this device</button></div>' +
    '<p style="font-size:0.75rem;color:#555;margin-top:1rem">If you are not sure, choose the one with the most recent save time.</p>';
}
