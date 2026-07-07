import { esc } from "../util.js";
import { ST } from "../state.js";
import { DOM } from "../data.js";
import { sb } from "./shared.js";

export function rSups(){
  var cards = ST.sups.map(function(s, idx){
    var p = "sup" + idx + "-";
    return '<div class="supc">' +
      '<button type="button" class="btn danger sm" style="position:absolute;top:8px;right:8px" onclick="IAM.rmSup(' + idx + ')">Remove</button>' +
      '<div class="g2">' +
      '<div><label for="' + p + 'name">Name</label><input id="' + p + 'name" type="text" value="' + esc(s.name) + '" oninput="IAM.setSup(' + idx + ',\'name\',this.value)" placeholder="Full name"></div>' +
      '<div><label for="' + p + 'rel">Relationship</label><input id="' + p + 'rel" type="text" value="' + esc(s.rel) + '" oninput="IAM.setSup(' + idx + ',\'rel\',this.value)" placeholder="e.g. daughter, carer"></div></div>' +
      '<label for="' + p + 'dur">How long have you known the participant?</label>' +
      '<input id="' + p + 'dur" type="text" value="' + esc(s.dur) + '" oninput="IAM.setSup(' + idx + ',\'dur\',this.value)" placeholder="e.g. 3 years">' +
      '<label for="' + p + 'support">What support do you provide?</label>' +
      '<textarea id="' + p + 'support" oninput="IAM.setSup(' + idx + ',\'support\',this.value)" placeholder="Describe what you do and how often.">' + esc(s.support) + '</textarea>' +
      '<label for="' + p + 'without">What would happen without your support?</label>' +
      '<textarea id="' + p + 'without" oninput="IAM.setSup(' + idx + ',\'without\',this.value)" placeholder="Be specific and honest.">' + esc(s.without) + '</textarea>' +
      '<label for="' + p + 'msg">What most needs the assessor to understand?</label>' +
      '<textarea id="' + p + 'msg" oninput="IAM.setSup(' + idx + ',\'msg\',this.value)" placeholder="What is the daily reality?">' + esc(s.msg) + '</textarea></div>';
  }).join("");
  return sb() + '<div style="margin-bottom:1rem"><h2 id="scr-h">Support circle observations</h2>' +
    '<p class="body">Family, carers, and support workers add their perspective.</p></div>' +
    '<div class="card card-blue"><p style="font-size:13px;color:#1a4f7a"><strong>Why this matters:</strong> Assessors look for consistency. Informal carer support is often invisible - naming it makes it visible.</p></div>' +
    cards +
    '<button type="button" class="btn" style="margin-bottom:1rem" onclick="IAM.addSup()">+ Add a support person</button>' +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.gd(' + (DOM.length - 1) + ')">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.go(\'adv\')">Continue &rarr;</button></div>';
}
