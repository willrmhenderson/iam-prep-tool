import { esc } from "../util.js";
import { ST } from "../state.js";
import { BDOM } from "../data.js";
import { sb, progressBar } from "./shared.js";

function brKey(di, ii){ return "d" + di + "i" + ii; }

function isRated(di, ii){
  var v = ST.brate.items[brKey(di, ii)];
  return v !== undefined && v !== "";
}

function domainDone(di){
  return BDOM[di].items.every(function(_, ii){ return isRated(di, ii); });
}

function allDone(){
  return BDOM.every(function(_, di){ return domainDone(di); });
}

function firstIncompleteIndex(){
  for (var di = 0; di < BDOM.length; di++) if (!domainDone(di)) return di;
  return 0;
}

function anyStarted(){
  return Object.keys(ST.brate.items).some(function(k){ return ST.brate.items[k] !== undefined && ST.brate.items[k] !== ""; });
}

function scaleCard(){
  return '<div class="card card-green" style="margin-bottom:1rem">' +
    '<p style="font-size:0.8125rem;color:#0a5c38;font-weight:600;margin-bottom:6px">Rating scale</p>' +
    '<p style="font-size:0.8125rem;color:#0a5c38;">Say to participant: <em>&ldquo;I will read each area out to you. For each one, give me a number from 0 to 4. Zero means you need no support at all. Four means you need full support and cannot do it without help. There are no right or wrong answers. Just your honest first impression. We come back to each area in more detail later.&rdquo;</em></p>' +
    '<p style="font-size:0.6875rem;color:#0a5c38;margin-top:6px">This first-impressions scale is informal and separate from the two-part frequency and support-level scoring used in the formal I-CAN assessment itself.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px">' +
    ["0 None", "1 Minimal", "2 Moderate", "3 Substantial", "4 Full"].map(function(l){
      var parts = l.split(" ");
      return '<div style="background:#fff;border:1px solid #8ad4b0;border-radius:0.375rem;padding:6px;text-align:center"><div style="font-size:1.125rem;font-weight:600;color:#1D9E75">' + parts[0] + '</div><div style="font-size:0.6875rem;color:#0a5c38">' + parts[1] + '</div></div>';
    }).join("") + '</div></div>';
}

// Step 1 of 3: intro - the scale explanation, shown once, not stapled
// to a giant scrolling list of every domain (see Phase 1 review - the
// original packed all 12 domains and ~50 dropdowns onto one page).
export function rBrate(){
  var locked = ST.brate.locked;
  var isPsy = ST.role === "psych";
  var clinNote = isPsy ?
    '<div class="card card-blue" style="margin-bottom:1rem"><p style="font-size:0.8125rem;color:#1a4f7a"><strong>Clinician note:</strong> Read each item aloud. The participant responds verbally with a number 0 to 4. Record the rating. Do not discuss ratings. Do not revisit them once recorded. Lock all ratings before proceeding to psychoeducation. The before rating is the uncontaminated baseline. It cannot be changed after locking.</p></div>' : "";
  var started = anyStarted();
  var mainBtn = locked ?
    '<button type="button" class="btn primary" onclick="IAM.go(\'edusheet\')">Continue &rarr;</button>' :
    started ?
    '<button type="button" class="btn primary" onclick="IAM.go({t:\'r\',i:' + firstIncompleteIndex() + '})">Continue ratings &rarr;</button>' :
    '<button type="button" class="btn primary" onclick="IAM.go({t:\'r\',i:0})">Begin ratings &rarr;</button>';
  var reviewLink = (started || locked) ?
    '<button type="button" class="btn" onclick="IAM.go(\'brate-review\')">' + (locked ? "View all ratings" : "Review progress") + '</button>' : "";
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">Before ratings</h2>' +
    '<p class="body">Step 2 of 4 &mdash; Record all ratings before any psychoeducation. Each of the 12 areas is on its own page. Once locked, ratings cannot be changed.</p></div>' +
    clinNote + scaleCard() +
    (locked ? '<div class="card card-green" style="margin-bottom:1rem"><p style="font-size:0.8125rem;color:#0a5c38;font-weight:600">&#10003; Before ratings locked on ' + esc(new Date(ST.brateLockedAt).toLocaleString()) + '</p><p style="font-size:0.75rem;color:#0a5c38;margin-top:4px">These ratings are the baseline. They cannot be changed.</p></div>' : "") +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go(\'preq\')">&larr; Back</button>' + reviewLink + mainBtn + '</div>';
}

// Step 2 of 3: one domain's items per screen (4-5 items each instead
// of all ~50 at once).
export function rBrateDomain(i){
  var dom = BDOM[i];
  var locked = ST.brate.locked;
  var isPsy = ST.role === "psych";
  var isLast = i === BDOM.length - 1;
  var clinNote = isPsy ?
    '<div class="card card-blue" style="margin-bottom:0.75rem"><p style="font-size:0.8125rem;color:#1a4f7a"><strong>Clinician note:</strong> Read each item aloud. Record the rating. Do not discuss it. Do not revisit once recorded.</p></div>' : "";
  var itemsHtml = dom.items.map(function(item, ii){
    var k = brKey(i, ii);
    var val = ST.brate.items[k] !== undefined ? ST.brate.items[k] : "";
    var selId = "br-" + k;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f4ee">' +
      '<label for="' + selId + '" style="flex:1;font-size:0.9375rem;color:#333;margin:0">' + esc(item) + '</label>' +
      (locked ?
        '<span style="font-size:1rem;font-weight:600;color:#1D9E75;min-width:2rem;text-align:center">' + (val !== "" ? val : "&mdash;") + '</span>' :
        '<select id="' + selId + '" style="width:6rem" onchange="IAM.setBrate(\'' + k + '\',this.value)">' +
        '<option value="">--</option>' +
        [0, 1, 2, 3, 4].map(function(n){ return '<option value="' + n + '"' + (val === n || val === String(n) ? " selected" : "") + '>' + n + '</option>'; }).join("") +
        '</select>') +
      '</div>';
  }).join("");
  var nextBtn = isLast ?
    (locked ?
      '<button type="button" class="btn primary" onclick="IAM.go(\'edusheet\')">Continue &rarr;</button>' :
      '<button type="button" class="btn primary" onclick="IAM.go(\'brate-review\')">Review ratings &rarr;</button>') :
    '<button type="button" class="btn primary" onclick="IAM.go({t:\'r\',i:' + (i + 1) + '})">Next domain &rarr;</button>';
  return sb() +
    progressBar(i + 1, BDOM.length, "Rating " + (i + 1) + " of " + BDOM.length + ": " + dom.name) +
    clinNote +
    (i === 9 ? '<div class="tip am" style="margin-bottom:0.75rem"><p>Approach with care. If an item does not apply, record 0 and move on without elaboration.</p></div>' : "") +
    '<div class="card"><h2 id="scr-h" style="margin-bottom:6px;color:#2d4a1e">' + esc(dom.name) + '</h2>' +
    itemsHtml +
    '</div>' +
    '<div class="nav">' +
    (i > 0 ? '<button type="button" class="btn" onclick="IAM.go({t:\'r\',i:' + (i - 1) + '})">&larr; Back</button>' :
             '<button type="button" class="btn" onclick="IAM.go(\'brate\')">&larr; Back</button>') +
    nextBtn +
    '</div>';
}

// Step 3 of 3: a short checklist of all 12 domains with a rated-count
// per domain, a jump-to-edit link, and the lock action.
export function rBrateReview(){
  var locked = ST.brate.locked;
  var rows = BDOM.map(function(dom, di){
    var total = dom.items.length;
    var done = dom.items.filter(function(_, ii){ return isRated(di, ii); }).length;
    var complete = done === total;
    return '<div class="card" style="padding:0.875rem;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px">' +
      '<div><strong style="font-size:0.875rem;font-weight:500">' + esc(dom.name) + '</strong><br>' +
      '<span class="tag ' + (complete ? "tg" : "ta") + '">' + done + ' of ' + total + ' rated</span></div>' +
      '<button type="button" class="btn sm" onclick="IAM.go({t:\'r\',i:' + di + '})">' + (locked ? "View" : "Edit") + '</button>' +
      '</div>';
  }).join("");
  var complete = allDone();
  var lockBtn = locked ?
    '<button type="button" class="btn primary" onclick="IAM.go(\'edusheet\')">Continue &rarr;</button>' :
    complete ?
    '<button type="button" class="btn primary" style="background:#0a5c38;border-color:#0a5c38" onclick="IAM.lockBrate()">Lock all ratings and continue &rarr;</button>' :
    '<button type="button" class="btn" disabled style="opacity:0.5;cursor:not-allowed">Complete all ratings to continue</button>';
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">' + (locked ? "Your before ratings" : "Review before locking") + '</h2>' +
    '<p class="body">' + (locked ?
      "These ratings were locked on " + esc(new Date(ST.brateLockedAt).toLocaleString()) + " and cannot be changed." :
      "Check every domain is rated, then lock. Once locked, ratings cannot be changed.") + '</p></div>' +
    rows +
    '<div class="nav"><button type="button" class="btn" onclick="IAM.go({t:\'r\',i:' + (BDOM.length - 1) + '})">&larr; Back</button>' + lockBtn + '</div>';
}
