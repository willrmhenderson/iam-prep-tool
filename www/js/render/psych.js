import { esc, dataArgs } from "../util.js";
import { ST } from "../state.js";
import { DOM } from "../data.js";
import { sb } from "./shared.js";

export function genIQs(){
  var qs = [];
  ST.d.forEach(function(d, i){
    var dn = DOM[i].name;
    if (d.impact === "Critical" || d.impact === "High") qs.push(dn + ' is rated "' + d.impact + '" impact. Ask for a recent specific example where this became a safety concern.');
    if (d.sf && d.sfn) qs.push("A support person flagged a difference in " + dn + '. Explore: "' + d.sfn.substring(0, 80) + '"');
    if (!d.gs || !d.gs.trim()) qs.push(dn + " has no data. Ask the participant to describe their support needs here.");
    if (d.gs && d.gs.trim() && d.bs && d.bs.trim()) qs.push(dn + " shows variation between good and hard days. Explore frequency and triggers.");
  });
  if (!ST.adv.informal || !ST.adv.informal.trim()) qs.push("Informal support not documented. Ask about family involvement and hours per week.");
  if (ST.p.barriers && ST.p.barriers.trim()) qs.push('Participant barriers: "' + ST.p.barriers.substring(0, 100) + '". Explore how each affects daily functioning.');
  if (!qs.length) qs.push("Review all completed domains to confirm accuracy and explore areas needing clarification.");
  return qs.slice(0, 8);
}

export function rPsych(){
  var py = ST.psych;
  var flagged = ST.d.filter(function(d){ return d.pf || d.sf || d.impact === "High" || d.impact === "Critical"; });
  var gaps = DOM.filter(function(_, i){ return !ST.d[i].gs || !ST.d[i].gs.trim(); });
  var iqs = genIQs();
  return sb() + '<div style="margin-bottom:1rem"><h2 id="scr-h">Psychologist section</h2></div>' +
    '<div class="card"><h3>Overview</h3><div class="g3" style="margin-top:10px;margin-bottom:1rem">' +
    '<div class="met"><div class="n">' + ST.d.filter(function(d){ return d.gs && d.gs.trim(); }).length + '</div><div class="l">Domains done</div></div>' +
    '<div class="met"><div class="n" style="' + (flagged.length > 0 ? "color:#8B1A1A" : "") + '">' + flagged.length + '</div><div class="l">Flagged</div></div>' +
    '<div class="met"><div class="n">' + gaps.length + '</div><div class="l">Gaps</div></div></div>' +
    (flagged.length ? '<div class="sec" style="margin-top:0">Priority domains</div>' + flagged.map(function(d){ var di = ST.d.indexOf(d); return '<button type="button" class="tag tr" style="cursor:pointer;border:none" data-action="gd" data-args="' + dataArgs([di]) + '">' + esc(DOM[di] ? DOM[di].name : "") + '</button>'; }).join("") : "") +
    (gaps.length ? '<div class="sec">Not completed</div>' + gaps.map(function(d){ return '<span class="tag tn">' + esc(d.name) + '</span>'; }).join("") : "") +
    '</div>' +
    '<div class="card"><h3>Suggested interview questions</h3>' + iqs.map(function(q){ return '<div class="iqb"><p>' + esc(q) + '</p></div>'; }).join("") + '</div>' +
    '<div class="card"><h3>Clinical notes</h3>' +
    '<label for="py-overview">Clinical overview</label><textarea id="py-overview" data-field="setPsych" data-args="' + dataArgs(["overview"]) + '" placeholder="Summarise your clinical impression.">' + esc(py.overview) + '</textarea>' +
    '<label for="py-goals">Interview goals</label><textarea id="py-goals" data-field="setPsych" data-args="' + dataArgs(["goals"]) + '" placeholder="What do you want to explore?">' + esc(py.goals) + '</textarea>' +
    '<label for="py-notes">Pre-interview clinical notes</label><textarea id="py-notes" data-field="setPsych" data-args="' + dataArgs(["notes"]) + '" placeholder="Diagnoses, history, context.">' + esc(py.notes) + '</textarea>' +
    '<label for="py-readiness">Participant readiness</label><textarea id="py-readiness" data-field="setPsych" data-args="' + dataArgs(["readiness"]) + '" placeholder="Fatigue tolerance, communication needs, best time of day.">' + esc(py.readiness) + '</textarea></div>' +
    '<div class="nav"><button type="button" class="btn" data-action="gd" data-args="' + dataArgs([DOM.length - 1]) + '">&larr; Back</button>' +
    '<button type="button" class="btn primary" data-action="go" data-args="' + dataArgs(["review"]) + '">Review and generate &rarr;</button></div>';
}
