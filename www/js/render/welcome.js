import { esc } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

export function rWelcome(){
  var isP = ST.role === "participant", isS = ST.role === "support", isPsy = ST.role === "psych";
  var comp = ST.d.filter(function(d){ return d.gs && d.gs.trim(); }).length;
  var hiCount = ST.d.filter(function(d){ return d.impact === "High" || d.impact === "Critical"; }).length;
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (isP ? "Welcome. Let&rsquo;s prepare together." : isS ? "Support person section" : "Psychologist section") + '</h2>' +
    '<p class="body">' + esc(isP ? "This tool walks you through 12 areas of daily life. Describe what you can do and what help you need. Stop any time - your answers save automatically." : isS ? "Add your observations. Assessors look for consistent information from people who see the participant daily." : "Review all data, add clinical notes, and prepare your interview focus areas.") + '</p></div>' +
    (isP ? '<div class="card card-green"><h3 style="margin-bottom:8px">How this works</h3><ul style="margin-top:4px;padding-left:1.2rem;display:flex;flex-direction:column;gap:6px">' +
      '<li style="font-size:14px;color:#0a5c38;line-height:1.6">12 sections covering different parts of daily life</li>' +
      '<li style="font-size:14px;color:#0a5c38;line-height:1.6">Describe what you CAN do and what help you need</li>' +
      '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You can also describe what a hard day looks like</li>' +
      '<li style="font-size:14px;color:#0a5c38;line-height:1.6">Skip anything that does not apply</li>' +
      '<li style="font-size:14px;color:#0a5c38;line-height:1.6">Your answers save automatically. Use the Break button any time.</li></ul></div>' : "") +
    (isS ? '<div class="card card-blue"><h3 style="margin-bottom:8px">Your role</h3><ul style="margin-top:4px;padding-left:1.2rem;display:flex;flex-direction:column;gap:6px">' +
      '<li style="font-size:14px;color:#1a4f7a;line-height:1.6">Add observations for each of the 12 domains</li>' +
      '<li style="font-size:14px;color:#1a4f7a;line-height:1.6">Flag where your view differs from the participant&rsquo;s</li>' +
      '<li style="font-size:14px;color:#1a4f7a;line-height:1.6">Be specific and honest. Detail strengthens the case.</li></ul></div>' : "") +
    (isPsy ? '<div class="card card-blue"><h3>Data so far</h3><div class="g3" style="margin-top:10px">' +
      '<div class="met"><div class="n">' + comp + '</div><div class="l">Domains done</div></div>' +
      '<div class="met"><div class="n" style="' + (hiCount > 0 ? "color:#8B1A1A" : "") + '">' + hiCount + '</div><div class="l">High/critical</div></div>' +
      '<div class="met"><div class="n">' + ST.sups.length + '</div><div class="l">Support persons</div></div></div></div>' : "") +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go(\'role\')">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.go(' + (isPsy ? "'psych'" : "'part'") + ')">' + (isP ? "Start: your details" : isS ? "Go to participant details" : "Go to psychologist section") + ' &rarr;</button></div>';
}
