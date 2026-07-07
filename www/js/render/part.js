import { esc } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

export function rPart(){
  var p = ST.p, isP = ST.role === "participant";
  return sb() + '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (isP ? "About you" : "Participant details") + '</h2></div>' +
    '<div class="card"><div class="g2">' +
    '<div><label for="p-name">' + (isP ? "Your full name" : "Full name") + '</label><input id="p-name" type="text" value="' + esc(p.name) + '" oninput="IAM.ST.p.name=this.value;IAM.touch()" placeholder="Full name"></div>' +
    '<div><label for="p-dob">Date of birth</label><input id="p-dob" type="date" value="' + esc(p.dob) + '" oninput="IAM.ST.p.dob=this.value;IAM.touch()"></div>' +
    '<div><label for="p-ndis">NDIS number</label><input id="p-ndis" type="text" value="' + esc(p.ndis) + '" oninput="IAM.ST.p.ndis=this.value;IAM.touch()" placeholder="Optional"></div>' +
    '<div><label for="p-dis">Primary disability</label><input id="p-dis" type="text" value="' + esc(p.disability) + '" oninput="IAM.ST.p.disability=this.value;IAM.touch()" placeholder="e.g. TBI, MS, ASD"></div>' +
    '<div><label for="p-by">Prepared by</label><input id="p-by" type="text" value="' + esc(p.by) + '" oninput="IAM.ST.p.by=this.value;IAM.touch()" placeholder="Your name"></div>' +
    '<div><label for="p-role">Role</label><input id="p-role" type="text" value="' + esc(p.role) + '" oninput="IAM.ST.p.role=this.value;IAM.touch()" placeholder="e.g. participant, carer"></div>' +
    '</div><label for="p-date">Date</label><input id="p-date" type="date" value="' + esc(p.date) + '" oninput="IAM.ST.p.date=this.value;IAM.touch()" style="width:200px">' +
    '<label for="p-goals">' + (isP ? "What do you most want to achieve with NDIS support?" : "Main NDIS goals") + '</label>' +
    '<textarea id="p-goals" oninput="IAM.ST.p.goals=this.value;IAM.touch()" placeholder="' + (isP ? "In your own words..." : "What does the participant most want to achieve?") + '">' + esc(p.goals) + '</textarea>' +
    '<label for="p-barriers">' + (isP ? "What are the biggest things stopping you?" : "Key barriers to participation") + '</label>' +
    '<textarea id="p-barriers" oninput="IAM.ST.p.barriers=this.value;IAM.touch()" placeholder="' + (isP ? "e.g. fatigue, memory, pain, anxiety" : "e.g. cognitive fatigue, mobility, mental health") + '">' + esc(p.barriers) + '</textarea>' +
    '</div><div class="nav"><button type="button" class="btn" onclick="IAM.go(\'welcome\')">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.go(\'preq\')">Next: Pre-questions &rarr;</button></div>';
}
