import { esc } from "../util.js";
import { BARRIERS } from "../data.js";
import { sb, progressBar } from "./shared.js";

export function rBarrier(i){
  var b = BARRIERS[i];
  var isLast = (i === BARRIERS.length - 1);
  return sb() +
    progressBar(i + 1, BARRIERS.length, "Disclosure barrier " + (i + 1) + " of " + BARRIERS.length) +
    '<div class="card card-blue" style="margin-bottom:0.75rem"><p style="font-size:13px;color:#1a4f7a"><strong>Clinician note:</strong> Read each sheet aloud with the participant. The participant does not read independently. Observe the participant&rsquo;s response. Note any barriers that produce visible recognition or distress. These observations inform the domain conversation in Section 6.</p></div>' +
    '<div class="card">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
    '<div style="background:#2d4a1e;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0" aria-hidden="true">' + (i + 1) + '</div>' +
    '<h2 id="scr-h" style="font-size:17px;margin:0">' + esc(b.title) + '</h2></div>' +
    b.body +
    '</div>' +
    '<div class="nav">' +
    (i > 0 ? '<button type="button" class="btn" onclick="IAM.go({t:\'b\',i:' + (i - 1) + '})">&larr; Back</button>' :
             '<button type="button" class="btn" onclick="IAM.go(\'edusheet\')">&larr; Back</button>') +
    (isLast ?
      '<button type="button" class="btn primary" onclick="IAM.gd(0)">Begin domain conversation &rarr;</button>' :
      '<button type="button" class="btn primary" onclick="IAM.go({t:\'b\',i:' + (i + 1) + '})">&rarr; Next barrier</button>') +
    '</div>';
}
