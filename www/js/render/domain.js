import { esc } from "../util.js";
import { ST } from "../state.js";
import { DOM, FREQ, STYP, IMP } from "../data.js";
import { sb, selO, progressBar } from "./shared.js";

export function rDomain(i){
  var d = DOM[i], s = ST.d[i];
  var isP = ST.role === "participant", isS = ST.role === "support", isPsy = ST.role === "psych";
  var tab = s.tab || "good";
  var dc = "";
  var idp = "dom" + i + "-";

  if (isP || isPsy){
    var goodActive = tab === "good", hardActive = tab === "bad";
    dc += '<div class="trow" role="group" aria-label="Day type">' +
      '<button type="button" class="tbtn' + (goodActive ? " act" : "") + '" aria-pressed="' + goodActive + '" onclick="IAM.setDomTab(' + i + ',\'good\')">Good day</button>' +
      '<button type="button" class="tbtn' + (hardActive ? " act" : "") + '" aria-pressed="' + hardActive + '" onclick="IAM.setDomTab(' + i + ',\'bad\')">Hard day</button></div>';
    if (tab === "good"){
      dc += '<div class="tip"><p><strong>Good day:</strong> ' + (isP ? "Describe what you can do on a typical or better day, and what help you need." : "Participant&rsquo;s good day - what they can do with support.") + '</p></div>';
      dc += '<div class="exb"><p style="font-size:11px;font-weight:600;color:#8a9e82;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Example statements - select to use</p>' +
        d.ex.map(function(ex, ei){ return '<div class="exi"><p>&ldquo;' + esc(ex) + '&rdquo;</p><button type="button" class="btn sm" onclick="IAM.useEx(' + i + ',' + ei + ')">Use this</button></div>'; }).join("") + '</div>';
      dc += '<label for="' + idp + 'gs">' + (isP ? "I can... (on a good day)" : "Good day statement") + '</label>' +
        '<textarea id="' + idp + 'gs" oninput="IAM.setDom(' + i + ',\'gs\',this.value)" placeholder="' + (isP ? "Start with I can..." : "Enter the participant&rsquo;s good day statement.") + '">' + esc(s.gs) + '</textarea>';
    } else {
      dc += '<div class="tip am"><p><strong>Hard day:</strong> ' + (isP ? "Describe what a difficult day looks like. What changes? What extra help do you need?" : "What does a hard or high-support day look like?") + '</p></div>';
      dc += '<label for="' + idp + 'bs">' + (isP ? "On a hard day, I..." : "Hard day - what changes") + '</label>' +
        '<textarea id="' + idp + 'bs" oninput="IAM.setDom(' + i + ',\'bs\',this.value)" placeholder="' + (isP ? "e.g. On a hard day I cannot get out of bed without full physical assistance." : "Describe what changes on a hard day.") + '">' + esc(s.bs) + '</textarea>';
    }
    dc += '<div class="g2" style="margin-top:10px">' +
      '<div><label for="' + idp + 'freq">How often is support needed?</label><select id="' + idp + 'freq" onchange="IAM.setDom(' + i + ',\'freq\',this.value)">' + selO(FREQ, s.freq) + '</select></div>' +
      '<div><label for="' + idp + 'stype">Type of support</label><select id="' + idp + 'stype" onchange="IAM.setDom(' + i + ',\'stype\',this.value)">' + selO(STYP, s.stype) + '</select></div></div>' +
      '<label for="' + idp + 'impact">Impact if support not provided</label><select id="' + idp + 'impact" onchange="IAM.setDom(' + i + ',\'impact\',this.value)">' + selO(IMP, s.impact) + '</select>' +
      '<label for="' + idp + 'change">Has this need changed over time?</label>' +
      '<textarea id="' + idp + 'change" oninput="IAM.setDom(' + i + ',\'change\',this.value)" style="min-height:56px" placeholder="Describe any worsening or progression.">' + esc(s.change) + '</textarea>' +
      '<label for="' + idp + 'notes">Anything else the assessor should know?</label>' +
      '<textarea id="' + idp + 'notes" oninput="IAM.setDom(' + i + ',\'notes\',this.value)" style="min-height:56px" placeholder="Equipment, who helps, context.">' + esc(s.notes) + '</textarea>';
  }
  if (isS){
    dc += '<div class="tip"><p>Describe what you observe in this area. Be specific.</p></div>' +
      '<label for="' + idp + 'so">What do you observe?</label>' +
      '<textarea id="' + idp + 'so" oninput="IAM.setDom(' + i + ',\'so\',this.value)" placeholder="Describe what you see day to day.">' + esc(s.so) + '</textarea>' +
      '<div style="margin-top:10px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0">' +
      '<input type="checkbox" id="' + idp + 'sf" ' + (s.sf ? "checked" : "") + ' onchange="IAM.setDomFlag(' + i + ',this.checked)" style="width:auto;margin:0">' +
      '<span>My observation differs from what the participant wrote</span></label></div>' +
      (s.sf ? '<div class="flag"><span style="color:#d4900a;font-size:18px;flex-shrink:0" aria-hidden="true">&#9873;</span>' +
        '<div style="flex:1"><label for="' + idp + 'sfn" style="font-size:12px;font-weight:600;color:#6b3d08;margin-bottom:5px">Describe the difference</label>' +
        '<textarea id="' + idp + 'sfn" oninput="IAM.setDom(' + i + ',\'sfn\',this.value)" style="background:transparent" placeholder="Explain how your observation differs.">' + esc(s.sfn) + '</textarea></div></div>' : "");
  }
  if (isPsy){
    dc += '<hr style="border:none;border-top:1px solid #eef2ec;margin:1rem 0">' +
      '<div class="sec" style="margin-top:0">Psychologist notes - ' + esc(d.name) + '</div>' +
      '<label for="' + idp + 'pn">Clinical notes</label>' +
      '<textarea id="' + idp + 'pn" oninput="IAM.setDom(' + i + ',\'pn\',this.value)" style="min-height:56px" placeholder="Clinical observations or questions to explore.">' + esc(s.pn) + '</textarea>' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px">' +
      '<input type="checkbox" ' + (s.pf ? "checked" : "") + ' onchange="IAM.setDomPFlag(' + i + ',this.checked)" style="width:auto;margin:0">' +
      '<span>Flag for priority interview focus</span></label>';
  }
  return sb() +
    progressBar(i, DOM.length, "Section " + (i + 1) + " of " + DOM.length) +
    '<div class="card">' +
    '<h2 id="scr-h" style="margin-bottom:5px">' + esc(isP ? d.plain : d.name) + '</h2>' +
    '<p class="body" style="font-size:13px;color:#6a8a62">' + esc(d.desc) + '</p>' +
    '<div class="sdg">' + d.subs.map(function(x){ return '<div class="sdt">' + esc(x) + '</div>'; }).join("") + '</div>' +
    dc + '</div>' +
    '<div class="nav">' +
    (i > 0 ? '<button type="button" class="btn" onclick="IAM.gd(' + (i - 1) + ')">&larr; Back</button>' :
             '<button type="button" class="btn" onclick="IAM.go(\'part\')">&larr; Back</button>') +
    '<button type="button" class="btn primary" onclick="IAM.saveDom(' + i + ')">Save and continue &rarr;</button>' +
    '<button type="button" class="skip" onclick="IAM.skipDom(' + i + ')">Skip</button></div>';
}
