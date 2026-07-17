// Check-in history: scrollable list, most recent first, with edit /
// delete per entry and a participant-initiated date-range export that
// reuses the pdf.js delivery pattern. Nothing shares automatically.

import { esc } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

var RATING_LABELS = {
  mood: "Feeling", fatigue: "Tired", pain: "Pain", clarity: "Foggy"
};

function summaryLine(c){
  var parts = [];
  if (c.mood !== null && c.mood !== undefined) parts.push(RATING_LABELS.mood + " " + c.mood + (c.moodWord ? " (" + esc(c.moodWord) + ")" : ""));
  if (c.fatigue !== null && c.fatigue !== undefined) parts.push(RATING_LABELS.fatigue + " " + c.fatigue);
  if (c.pain !== null && c.pain !== undefined) parts.push(RATING_LABELS.pain + " " + c.pain);
  if (c.clarity !== null && c.clarity !== undefined) parts.push(RATING_LABELS.clarity + " " + c.clarity);
  return parts.join(" &middot; ");
}

export function rCheckinHistory(){
  var entries = ST.checkins.slice().sort(function(a, b){ return new Date(b.at) - new Date(a.at); });
  var list = entries.length ? entries.map(function(c){
    return '<div class="card" style="padding:0.875rem;margin-bottom:8px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">' +
      '<div><strong style="font-size:0.875rem;font-weight:600">' + esc(new Date(c.at).toLocaleDateString()) + '</strong> ' +
      '<span class="muted" style="font-size:0.75rem">' + esc(new Date(c.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })) + '</span><br>' +
      '<span style="font-size:0.8125rem;color:#555">' + summaryLine(c) + '</span></div>' +
      '<div style="display:flex;gap:4px">' +
      '<button type="button" class="btn sm" onclick="IAM.editCheckin(\'' + c.id + '\')">Edit</button>' +
      '<button type="button" class="btn danger sm" onclick="IAM.deleteCheckin(\'' + c.id + '\')">Delete</button>' +
      '</div></div>' +
      (c.note && c.note.trim() ? '<p style="font-size:0.8125rem;color:#444;margin-top:6px;line-height:1.6">' + esc(c.note) + '</p>' : "") +
      '</div>';
  }).join("") :
    '<div class="card"><p class="body" style="font-style:italic;color:#888">No check-ins yet. Your entries will appear here, newest first.</p></div>';

  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">Past check-ins</h2>' +
    '<p class="body">' + (entries.length ? entries.length + ' ' + (entries.length === 1 ? 'entry' : 'entries') + ', newest first.' : '') + '</p></div>' +
    list +
    (entries.length ?
      '<div class="card" style="margin-top:1rem">' +
      '<div class="sec" style="margin-top:0">Share a summary</div>' +
      '<p class="body">Pick a date range and create a summary to share with someone you choose - for example an allied health practitioner. It shows your ratings and your notes exactly as you wrote them. Nothing is ever shared unless you share it.</p>' +
      '<div class="g2">' +
      '<div><label for="ck-from">From</label><input id="ck-from" type="date"></div>' +
      '<div><label for="ck-to">To</label><input id="ck-to" type="date"></div></div>' +
      '<p class="muted" style="font-size:0.75rem;margin-top:4px">Leave both blank to include everything.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<button type="button" class="btn primary" onclick="IAM.dlCheckinPDF()">Download PDF summary</button>' +
      '<button type="button" class="btn" onclick="IAM.dlCheckinText()">Download plain text</button></div>' +
      '<div id="dmsg" role="status" aria-live="polite" style="font-size:0.75rem;color:#1D9E75;margin-top:8px;display:none"></div>' +
      '</div>' : "") +
    '<div class="nav">' +
    '<button type="button" class="btn" onclick="IAM.startCheckin()">+ New check-in</button>' +
    '<button type="button" class="btn" onclick="IAM.go(\'role\')">&larr; Home</button>' +
    '</div>';
}
