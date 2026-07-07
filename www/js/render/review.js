import { esc } from "../util.js";
import { ST } from "../state.js";
import { DOM } from "../data.js";

export function rReview(){
  var comp = ST.d.filter(function(d){ return d.gs && d.gs.trim(); }).length;
  var sc = ST.d.filter(function(d){ return d.freq && d.stype; }).length;
  var hi = ST.d.filter(function(d){ return d.impact === "High" || d.impact === "Critical"; }).length;
  return '<div style="margin-bottom:1rem"><h2 id="scr-h">Review before generating</h2></div>' +
    '<div class="g3" style="margin-bottom:1rem">' +
    '<div class="met"><div class="n">' + comp + '</div><div class="l">Domains recorded</div></div>' +
    '<div class="met"><div class="n">' + sc + '</div><div class="l">Fully scored</div></div>' +
    '<div class="met"><div class="n" style="' + (hi > 0 ? "color:#8B1A1A" : "") + '">' + hi + '</div><div class="l">High/critical</div></div></div>' +
    '<div class="g2" style="margin-bottom:1rem">' +
    '<div class="met"><div class="n">' + ST.sups.length + '</div><div class="l">Support circle</div></div>' +
    '<div class="met"><div class="n">' + (ST.psych.overview && ST.psych.overview.trim() ? "Yes" : "No") + '</div><div class="l">Psych notes</div></div></div>' +
    '<div class="sec">Domains</div>' +
    ST.d.map(function(s, i){
      var d = DOM[i], has = s.gs && s.gs.trim();
      return '<div class="card" style="padding:0.875rem;margin-bottom:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<strong style="font-size:13px;font-weight:500">' + esc(d.name) + '</strong>' +
        '<button type="button" class="btn sm" onclick="IAM.gd(' + i + ')">Edit</button></div>' +
        (has ? '<p style="margin:4px 0 6px;font-size:13px;color:#555">' + esc(s.gs.substring(0, 100)) + (s.gs.length > 100 ? "..." : "") + '</p>' +
        (s.freq ? '<span class="tag tg">' + esc(s.freq) + '</span>' : "") +
        (s.stype ? '<span class="tag tb">' + esc(s.stype) + '</span>' : "") +
        (s.impact ? '<span class="tag ' + (s.impact === "Critical" || s.impact === "High" ? "tr" : "tn") + '">' + esc(s.impact) + '</span>' : "") +
        (s.sf ? '<span class="tag ta">Support flagged</span>' : "") +
        (s.pf ? '<span class="tag tb">Psych priority</span>' : "") :
        '<p style="font-size:13px;color:#bbb;margin-top:4px;font-style:italic">Not recorded</p>') + '</div>';
    }).join("") +
    '<div class="nav" style="margin-top:1.5rem">' +
    '<button type="button" class="btn" onclick="IAM.go(\'adv\')">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.go(\'report\')">Generate report</button></div>';
}
