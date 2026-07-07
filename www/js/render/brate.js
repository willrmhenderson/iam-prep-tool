import { esc } from "../util.js";
import { ST } from "../state.js";
import { BDOM } from "../data.js";
import { sb } from "./shared.js";

function brKey(di, ii){ return "d" + di + "i" + ii; }

export function rBrate(){
  var locked = ST.brate.locked;
  var isPsy = ST.role === "psych";
  var clinNote = isPsy ?
    '<div class="card card-blue" style="margin-bottom:1rem"><p style="font-size:13px;color:#1a4f7a"><strong>Clinician note:</strong> Read each item aloud. The participant responds verbally with a number 0 to 4. Record the rating. Do not discuss ratings. Do not revisit them once recorded. Lock all ratings before proceeding to psychoeducation. The before rating is the uncontaminated baseline. It cannot be changed after locking.</p></div>' : "";
  var scaleCard = '<div class="card card-green" style="margin-bottom:1rem">' +
    '<p style="font-size:13px;color:#0a5c38;font-weight:600;margin-bottom:6px">Rating scale</p>' +
    '<p style="font-size:13px;color:#0a5c38;">Say to participant: <em>&ldquo;I will read each area out to you. For each one, give me a number from 0 to 4. Zero means you need no support at all. Four means you need full support and cannot do it without help. There are no right or wrong answers. Just your honest first impression. We come back to each area in more detail later.&rdquo;</em></p>' +
    '<p style="font-size:11px;color:#0a5c38;margin-top:6px">This first-impressions scale is informal and separate from the two-part frequency and support-level scoring used in the formal I-CAN assessment itself.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px">' +
    ["0 None", "1 Minimal", "2 Moderate", "3 Substantial", "4 Full"].map(function(l){
      var parts = l.split(" ");
      return '<div style="background:#fff;border:1px solid #8ad4b0;border-radius:6px;padding:6px;text-align:center"><div style="font-size:18px;font-weight:600;color:#1D9E75">' + parts[0] + '</div><div style="font-size:11px;color:#0a5c38">' + parts[1] + '</div></div>';
    }).join("") + '</div></div>';
  var domsHtml = BDOM.map(function(dom, di){
    var domHtml = '<div class="card" style="margin-bottom:0.75rem">' +
      '<h3 style="margin-bottom:10px;color:#2d4a1e">' + esc(dom.name) + '</h3>' +
      (di === 9 ? '<div class="tip am" style="margin-bottom:10px"><p>Approach with care. If an item does not apply, record 0 and move on without elaboration.</p></div>' : "") +
      dom.items.map(function(item, ii){
        var k = brKey(di, ii);
        var val = ST.brate.items[k] !== undefined ? ST.brate.items[k] : "";
        var selId = "br-" + k;
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0f4ee">' +
          '<label for="' + selId + '" style="flex:1;font-size:13px;color:#333;margin:0">' + esc(item) + '</label>' +
          (locked ?
            '<span style="font-size:15px;font-weight:600;color:#1D9E75;min-width:24px;text-align:center">' + (val !== "" ? val : "&mdash;") + '</span>' :
            '<select id="' + selId + '" style="width:90px" onchange="IAM.setBrate(\'' + k + '\',this.value)">' +
            '<option value="">--</option>' +
            [0, 1, 2, 3, 4].map(function(n){ return '<option value="' + n + '"' + (val === n || val === String(n) ? " selected" : "") + '>' + n + '</option>'; }).join("") +
            '</select>');
      }).join("") + '</div>';
    return domHtml + '</div>';
  }).join("");
  var allRated = BDOM.every(function(dom, di){
    return dom.items.every(function(_, ii){
      var k = brKey(di, ii);
      return ST.brate.items[k] !== undefined && ST.brate.items[k] !== "";
    });
  });
  var lockBtn = !locked && allRated ?
    '<button type="button" class="btn primary" style="background:#0a5c38;border-color:#0a5c38" onclick="IAM.lockBrate()">Lock all ratings and continue &rarr;</button>' :
    !locked ? '<button type="button" class="btn" disabled style="opacity:0.5;cursor:not-allowed">Complete all ratings to continue</button>' :
    '<button type="button" class="btn primary" onclick="IAM.go(\'edusheet\')">Continue to next step &rarr;</button>';
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">Before ratings</h2>' +
    '<p class="body">Step 2 of 4 &mdash; Record all ratings before any psychoeducation. Once locked, these ratings cannot be changed.</p></div>' +
    clinNote + scaleCard +
    (locked ? '<div class="card card-green" style="margin-bottom:1rem"><p style="font-size:13px;color:#0a5c38;font-weight:600">&#10003; Before ratings locked on ' + esc(new Date(ST.brateLockedAt).toLocaleString()) + '</p><p style="font-size:12px;color:#0a5c38;margin-top:4px">These ratings are the baseline. They cannot be changed.</p></div>' : "") +
    domsHtml +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go(\'preq\')">&larr; Back</button>' + lockBtn + '</div>';
}
