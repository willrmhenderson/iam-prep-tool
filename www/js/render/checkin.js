// Daily check-in: Notice, Name, Note. One screen, ~30 seconds.
// Not gated by assessment progress - reachable from the home screen
// at any time, in any state.

import { esc, uuid, dataArgs } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";
import { checkCrisisLanguage, safetyCardHtml } from "../safety.js";

// Draft being edited. Three modes:
//   new        - editingId null, correcting false: saving appends
//   in-place   - editingId set: the entry has never been backed up
//                (no server seq), so editing it directly is honest -
//                the record's guarantees start at receipt
//   correction - correcting true: the entry HAS been backed up, so it
//                can never change; saving appends a new entry that
//                points at the original via supersedesId. Both stay
//                in the record.
var draft = null;
var editingId = null;
var correcting = false;

export function startDraft(entryId){
  if (entryId){
    var existing = ST.checkins.find(function(c){ return c.id === entryId; });
    if (existing && !existing.withdrawnAt){
      draft = JSON.parse(JSON.stringify(existing));
      if (existing.seq){
        // Receipted: build a correction. Same claimed day (at), fresh
        // identity, no inherited chain fields - the server assigns
        // those when the correction is received.
        draft.id = uuid();
        draft.supersedesId = String(existing.id);
        delete draft.seq; delete draft.receivedAt; delete draft.entryHash;
        editingId = null;
        correcting = true;
      } else {
        editingId = entryId;
        correcting = false;
      }
      return;
    }
  }
  draft = { id: uuid(), at: new Date().toISOString(), mood: null, moodWord: "", fatigue: null, pain: null, clarity: null, note: "" };
  editingId = null;
  correcting = false;
}

export function getDraft(){ return draft; }
export function isEditing(){ return editingId !== null; }
export function isCorrecting(){ return correcting; }

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
    return '<button type="button" class="tbtn' + (active ? " act" : "") + '" aria-pressed="' + active + '" data-action="setCheckin" data-args="' + dataArgs([key, n]) + '">' + n + '</button>';
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
    '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (editingId || correcting ? "Edit check-in" : "Daily check-in") + '</h2>' +
    (editingId ? '<p class="body">Editing your entry from ' + esc(new Date(draft.at).toLocaleString()) + '. Saving updates it in place.</p>' : "") +
    (correcting ? '<p class="body">This entry from ' + esc(new Date(draft.at).toLocaleDateString()) + ' has already been backed up, so it can&rsquo;t be changed. Saving writes a correction &mdash; the original stays in your record, marked as corrected.</p>' : "") +
    '</div>' +

    '<div class="card card-green">' +
    '<div class="sec" style="margin-top:0;color:#0a5c38">Notice</div>' +
    '<p class="body" style="color:#0a5c38">Take a breath. Notice how you are, right now, today. There is no right answer.</p>' +
    '</div>' +

    '<div class="card">' +
    '<div class="sec" style="margin-top:0">Name</div>' +
    ratingRow("mood", "How are you feeling?", "Very low", "Really good") +
    '<label for="ck-moodword" style="margin-top:-4px">A word for it, if you have one (optional)</label>' +
    '<input id="ck-moodword" type="text" maxlength="60" value="' + esc(draft.moodWord) + '" data-field="setCheckin" data-args="' + dataArgs(["moodWord"]) + '" placeholder="e.g. flat, hopeful, wrung out">' +
    '<div style="height:14px"></div>' +
    ratingRow("fatigue", "How tired are you?", "Not tired", "Exhausted") +
    ratingRow("pain", "How much pain today?", "No pain", "Severe") +
    ratingRow("clarity", "How clear is your thinking?", "Clear", "Very foggy") +
    '</div>' +

    '<div class="card">' +
    '<div class="sec" style="margin-top:0">Note</div>' +
    '<label for="ck-note">What&rsquo;s going on for you today, in your own words?</label>' +
    '<textarea id="ck-note" data-field="setCheckinNote" placeholder="Anything or nothing. This is your space.">' + esc(draft.note) + '</textarea>' +
    '<div id="safety-card">' + safetyCardHtml(check.level, supFirstNames()) + '</div>' +
    '</div>' +

    '<div class="nav">' +
    '<button type="button" class="btn" data-action="leaveCheckin">&larr; Back</button>' +
    '<button type="button" class="btn primary" data-action="saveCheckin">' + (editingId ? "Update entry" : (correcting ? "Save correction" : "Save check-in")) + '</button>' +
    '<button type="button" class="btn" data-action="go" data-args="' + dataArgs(["checkin-history"]) + '">Past check-ins</button>' +
    '</div>';
}
