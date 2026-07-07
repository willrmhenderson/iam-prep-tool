import { esc } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

export function rAdv(){
  var a = ST.adv, isP = ST.role === "participant";
  function ta(id, k, ph, rows){
    return '<textarea id="' + id + '" oninput="IAM.setAdv(\'' + k + '\',this.value)" style="min-height:' + (rows || 3) * 27 + 'px" placeholder="' + ph + '">' + esc(a[k]) + '</textarea>';
  }
  function lbl(id, text){ return '<label for="' + id + '">' + esc(text) + '</label>'; }
  return sb() + '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (isP ? "Your daily life and advocacy" : "Advocacy and evidence") + '</h2></div>' +
    '<div class="card"><h3 style="margin-bottom:8px">Daily reality</h3>' +
    lbl("adv-typical", isP ? "Describe a typical day from when you wake up to when you go to sleep" : "Typical day") + ta("adv-typical", "typical", isP ? "Walk through your day. What help do you need at each stage?" : "Walk through a typical day.", 4) +
    lbl("adv-hard", isP ? "Describe a hard day" : "Difficult day") + ta("adv-hard", "hard", isP ? "What happens on a bad day?" : "What changes on a bad day?", 4) + '</div>' +
    '<div class="card"><h3 style="margin-bottom:8px">Risk and safety</h3>' +
    lbl("adv-risks", isP ? "What would happen if your support was removed?" : "Risks if support removed") + ta("adv-risks", "risks", isP ? "Falls, missed medications, mental health crisis?" : "Falls, medication errors, crisis, hospitalisation.", 4) +
    lbl("adv-informal", isP ? "Who helps you informally?" : "Informal support") + ta("adv-informal", "informal", isP ? "Name them and describe what they do." : "Who, what they do, hours per week.", 3) + '</div>' +
    '<div class="card"><h3 style="margin-bottom:8px">Equipment and history</h3>' +
    lbl("adv-equip", "Equipment and aids") + ta("adv-equip", "equip", isP ? "e.g. walking stick, shower chair, grab rails" : "List all equipment and aids.", 3) +
    lbl("adv-history", "Previous NDIS supports") + ta("adv-history", "history", isP ? "What have you had funded before?" : "Previous funding and current plan.", 3) +
    lbl("adv-worked", "What has worked well?") + ta("adv-worked", "worked", "Supports that have made a real difference.", 2) +
    lbl("adv-failed", "What has not worked?") + ta("adv-failed", "failed", "Supports that were inadequate or not right.", 2) + '</div>' +
    '<div class="card"><h3 style="margin-bottom:8px">' + (isP ? "Your own words" : "Participant&rsquo;s own statement") + '</h3>' +
    lbl("adv-myword", isP ? "What do you most want the assessor to know?" : "Participant&rsquo;s own statement") + ta("adv-myword", "myword", isP ? "Write in your own words." : "The participant&rsquo;s own words carry significant weight.", 5) + '</div>' +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go(\'sups\')">&larr; Back</button>' +
    '<button type="button" class="btn primary" onclick="IAM.go(\'review\')">Review and generate &rarr;</button></div>';
}
