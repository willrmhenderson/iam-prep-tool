// Daily check-in: Notice, Name, Note. One screen, ~30 seconds.
// Not gated by assessment progress - reachable from the home screen
// at any time, in any state.

import { esc, uuid } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";
import { checkCrisisLanguage, safetyCardHtml } from "../safety.js";

// Draft being edited. When editingId is set we are updating an
// existing entry in place; otherwise saving appends a new one.
var draft = null;
var editingId = null;

export function startDraft(entryId){
  if (entryId){
    var existing = ST.checkins.find(function(c){ return c.id === entryId; });
    if (existing){
      draft = JSON.parse(JSON.stringify(existing));
      editingId = entryId;
      return;
    }
  }
  draft = { id: uuid(), at: new Date().toISOString(), mood: null, moodWord: "", fatigue: null, pain: null, clarity: null, note: "" };
  editingId = null;
}

export function getDraft(){ return draft; }
export function isEditing(){ return editingId !== null; }

export function setDraftField(key, val){ if (draft) draft[key] = val; }

export function supFirstNames(){
  return ST.sups
    .map(function(s){ return (s.name || "").trim().split(/\s+/)[0]; })
    .filter(function(n){ return n; });
}

function ratingRow(key, label, endLow, endHigh){
  var val = draft[key];
  var btns = [0, 1, 2, 3, 4].map(function(n){
    var active = val === n;
    return '<button type="button" class="tbtn' + (active ? " act" : "") + '" aria-pressed="' + active + '" onclick="IAM.setCheckin(\'' + key + '\',' + n + ')">' + n + '</button>';
  }).join("");
  return '<div style="margin-bottom:14px">' +
    '<p id="ck-' + key + '-lbl" style="font-size:0.9375rem;color:#1a1a1a;margin-bottom:6px">' + esc(label) + '</p>' +
    '<div class="trow" role="group" aria-labelledby="ck-' + key + '-lbl" style="margin-bottom:4px">' + btns + '</div>' +
    '<div style="display:flex;justify-content:space-between"><span class="muted" style="font-size:0.75rem">' + esc(endLow) + '</span><span class="muted" style="font-size:0.75rem">' + esc(endHigh) + '</span></div>' +
    '</div>';
}

export function rCheckin(){
  if (!draft) startDraft(null);
  var check = checkCrisisLanguage(draft.note);
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (editingId ? "Edit check-in" : "Daily check-in") + '</h2>' +
    (editingId ? '<p class="body">Editing your entry from ' + esc(new Date(draft.at).toLocaleString()) + '. Saving updates it in place.</p>' : "") +
    '</div>' +

    '<div class="card card-green">' +
    '<div class="sec" style="margin-top:0;color:#0a5c38">Notice</div>' +
    '<p class="body" style="color:#0a5c38">Take a breath. Notice how you are, right now, today. There is no right answer.</p>' +
    '</div>' +

    '<div class="card">' +
    '<div class="sec" style="margin-top:0">Name</div>' +
    ratingRow("mood", "How are you feeling?", "Very low", "Really good") +
    '<label for="ck-moodword" style="margin-top:-4px">A word for it, if you have one (optional)</label>' +
    '<input id="ck-moodword" type="text" maxlength="60" value="' + esc(draft.moodWord) + '" oninput="IAM.setCheckin(\'moodWord\',this.value)" placeholder="e.g. flat, hopeful, wrung out">' +
    '<div style="height:14px"></div>' +
    ratingRow("fatigue", "How tired are you?", "Not tired", "Exhausted") +
    ratingRow("pain", "How much pain today?", "No pain", "Severe") +
    ratingRow("clarity", "How clear is your thinking?", "Clear", "Very foggy") +
    '</div>' +

    '<div class="card">' +
    '<div class="sec" style="margin-top:0">Note</div>' +
    '<label for="ck-note">What&rsquo;s going on for you today, in your own words?</label>' +
    '<textarea id="ck-note" oninput="IAM.setCheckinNote(this.value)" placeholder="Anything or nothing. This is your space.">' + esc(draft.note) + '</textarea>' +
    '<div id="safety-card">' + safetyCardHtml(check.level, supFirstNames()) + '</div>' +
    '</div>' +

    '<div class="nav">' +
    '<button type="button" class="btn" onclick="IAM.leaveCheckin()">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.saveCheckin()">' + (editingId ? "Update entry" : "Save check-in") + '</button>' +
    '<button type="button" class="btn" onclick="IAM.go(\'checkin-history\')">Past check-ins</button>' +
    '</div>';
}
