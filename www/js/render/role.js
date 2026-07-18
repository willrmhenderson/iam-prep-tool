import { esc, dataArgs } from "../util.js";
import { ST } from "../state.js";

// Role cards are real <button> elements with aria-pressed, replacing
// the original's <div onclick> cards, which were invisible to
// keyboard and screen-reader users (no role, no tabindex, no key
// handling). This was a Phase 1 accessibility blocker.
function roleCard(value, emoji, title, desc){
  var selected = ST.role === value;
  return '<button type="button" class="rc' + (selected ? " sel" : "") + '" aria-pressed="' + selected + '" data-action="setRole" data-args="' + dataArgs([value]) + '">' +
    '<span style="display:flex;align-items:center;gap:12px;text-align:left">' +
    '<span style="font-size:24px" aria-hidden="true">' + emoji + '</span>' +
    '<span><strong>' + esc(title) + '</strong><br><span class="muted">' + esc(desc) + '</span></span>' +
    '</span></button>';
}

export function rRole(hasSaved, savedLabel, savedDate){
  return (hasSaved ?
    '<div class="card card-green" style="margin-bottom:1rem"><div style="display:flex;align-items:center;gap:12px">' +
    '<span style="font-size:22px" aria-hidden="true">&#9989;</span>' +
    '<div><strong style="font-size:13px;color:#085041">Saved: ' + esc(savedLabel) + '</strong><br>' +
    '<span style="font-size:12px;color:#2d7a58">Last saved ' + esc(savedDate) + '</span></div>' +
    '<button type="button" class="btn primary sm" style="margin-left:auto" data-action="go" data-args="' + dataArgs(["welcome"]) + '">Continue &rarr;</button></div></div>' : "") +
    '<div class="g2" style="margin-bottom:1.5rem">' +
    '<button type="button" class="rc" data-action="focusRoleSection" style="text-align:center;padding:1.25rem 1rem">' +
    '<span style="font-size:26px;display:block;margin-bottom:6px" aria-hidden="true">&#128221;</span>' +
    '<strong>Start my preparation</strong><br><span class="muted">The 12-area support needs tool</span></button>' +
    '<button type="button" class="rc" data-action="startCheckin" style="text-align:center;padding:1.25rem 1rem">' +
    '<span style="font-size:26px;display:block;margin-bottom:6px" aria-hidden="true">&#127774;</span>' +
    '<strong>Daily check-in</strong><br><span class="muted">30 seconds. How are you today?</span></button>' +
    '</div>' +
    '<div style="margin-bottom:1.5rem"><h2 id="scr-h" style="margin-bottom:6px">Who are you?</h2><p class="body">Select your role to begin.</p></div>' +
    roleCard("participant", "&#128100;", "I am the participant", "I have a disability and am filling this in myself or with help.") +
    roleCard("support", "&#128101;", "I am a support person", "I am a family member, carer, or support worker.") +
    roleCard("psych", "&#129504;", "I am the psychologist", "I am reviewing data and preparing for the support needs assessment interview.") +
    '<div class="nav">' +
    (hasSaved ? '<button type="button" class="btn" data-action="confirmStartFresh">Start fresh</button>' : "") +
    '<button type="button" class="btn" data-action="go" data-args="' + dataArgs(["account"]) + '">Account</button>' +
    '<button type="button" class="btn primary" data-action="continueFromRole">Continue &rarr;</button></div>' +
    '<p id="role-err" role="alert" style="display:none;font-size:13px;color:#8B1A1A;margin-top:8px"></p>' +
    '<p style="font-size:12px;margin-top:1rem;color:#aaa">Your answers save automatically and sync securely once you are signed in.</p>';
}
