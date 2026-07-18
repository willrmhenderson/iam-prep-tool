import { esc, dataArgs } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

function pf(key){ return 'data-field="setPart" data-args="' + dataArgs([key]) + '"'; }

export function rPart(){
  var p = ST.p, isP = ST.role === "participant";
  return sb() + '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (isP ? "About you" : "Participant details") + '</h2></div>' +
    '<div class="card"><div class="g2">' +
    '<div><label for="p-name">' + (isP ? "Your full name" : "Full name") + '</label><input id="p-name" type="text" value="' + esc(p.name) + '" ' + pf("name") + ' placeholder="Full name"></div>' +
    '<div><label for="p-dob">Date of birth</label><input id="p-dob" type="date" value="' + esc(p.dob) + '" ' + pf("dob") + '></div>' +
    '<div><label for="p-ndis">NDIS number</label><input id="p-ndis" type="text" value="' + esc(p.ndis) + '" ' + pf("ndis") + ' placeholder="Optional"></div>' +
    '<div><label for="p-dis">Primary disability</label><input id="p-dis" type="text" value="' + esc(p.disability) + '" ' + pf("disability") + ' placeholder="e.g. TBI, MS, ASD"></div>' +
    '<div><label for="p-by">Prepared by</label><input id="p-by" type="text" value="' + esc(p.by) + '" ' + pf("by") + ' placeholder="Your name"></div>' +
    '<div><label for="p-role">Role</label><input id="p-role" type="text" value="' + esc(p.role) + '" ' + pf("role") + ' placeholder="e.g. participant, carer"></div>' +
    '</div><label for="p-date">Date</label><input id="p-date" type="date" value="' + esc(p.date) + '" ' + pf("date") + ' style="width:200px">' +
    '<label for="p-goals">' + (isP ? "What do you most want to achieve with NDIS support?" : "Main NDIS goals") + '</label>' +
    '<textarea id="p-goals" ' + pf("goals") + ' placeholder="' + (isP ? "In your own words..." : "What does the participant most want to achieve?") + '">' + esc(p.goals) + '</textarea>' +
    '<label for="p-barriers">' + (isP ? "What are the biggest things stopping you?" : "Key barriers to participation") + '</label>' +
    '<textarea id="p-barriers" ' + pf("barriers") + ' placeholder="' + (isP ? "e.g. fatigue, memory, pain, anxiety" : "e.g. cognitive fatigue, mobility, mental health") + '">' + esc(p.barriers) + '</textarea>' +
    '</div><div class="nav"><button type="button" class="btn" data-action="go" data-args="' + dataArgs(["welcome"]) + '">&larr; Back</button>' +
    '<button type="button" class="btn primary" data-action="go" data-args="' + dataArgs(["preq"]) + '">Next: Pre-questions &rarr;</button></div>';
}
