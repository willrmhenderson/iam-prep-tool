import { esc, dataArgs } from "../util.js";
import { ST } from "../state.js";
import { sb } from "./shared.js";

function toggleBtn(field, val, label){
  var active = ST.preq[field] === val;
  return '<button type="button" class="tbtn' + (active ? " act" : "") + '" aria-pressed="' + active + '" data-action="setPreq" data-args="' + dataArgs([field, val]) + '">' + esc(label) + '</button>';
}
function pf(field){ return 'data-field="setPreq" data-args="' + dataArgs([field]) + '"'; }

export function rPreq(){
  var q = ST.preq;
  var isPsy = ST.role === "psych";
  var note = isPsy ?
    '<div class="card card-blue" style="margin-bottom:1rem"><p style="font-size:13px;color:#1a4f7a"><strong>Clinician note:</strong> Read each question aloud. Record the participant&rsquo;s verbal response. Do not prompt or suggest answers. Observe and note any non-verbal responses. These questions are not scored. They establish clinical context for interpreting the before rating.</p></div>' : "";
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">Pre-questions</h2>' +
    '<p class="body">Step 1 of 4 &mdash; Complete before any psychoeducation.</p></div>' +
    note +
    '<div class="card"><div class="sec" style="margin-top:0">About today</div>' +
    '<p id="dayRatingLbl">How is today compared to a typical day?</p>' +
    '<div class="trow" role="group" aria-labelledby="dayRatingLbl" style="margin-bottom:10px">' +
      toggleBtn("dayRating", "good", "Good day") + toggleBtn("dayRating", "typical", "Typical day") + toggleBtn("dayRating", "hard", "Hard day") +
    '</div>' +
    (q.dayRating === "hard" ? '<div class="tip am"><p>High fatigue or pain today may produce a lower before rating than usual. Note this in clinical observations.</p></div>' : "") +
    '<label for="q-daynote">Anything happening today that might affect focus or ability to describe yourself clearly?</label>' +
    '<textarea id="q-daynote" ' + pf("dayNote") + ' placeholder="Record response or note: nothing significant reported">' + esc(q.dayNote) + '</textarea>' +
    '</div>' +
    '<div class="card"><div class="sec" style="margin-top:0">About your disability</div>' +
    '<label for="q-disdesc">Tell me briefly about your disability or health condition. What were you diagnosed with, when did it start, and how does it affect you on a typical day?</label>' +
    '<textarea id="q-disdesc" ' + pf("disabilityDesc") + ' placeholder="Record participant&rsquo;s response">' + esc(q.disabilityDesc) + '</textarea>' +
    '<p id="trajLbl">Is your condition stable, improving, or getting worse?</p>' +
    '<div class="trow" role="group" aria-labelledby="trajLbl" style="margin-bottom:10px">' +
      toggleBtn("trajectory", "stable", "Stable") + toggleBtn("trajectory", "improving", "Improving") + toggleBtn("trajectory", "worsening", "Getting worse") +
    '</div>' +
    '<label for="q-change">Optional: Anything significantly better or worse than 12 months ago?</label>' +
    '<textarea id="q-change" ' + pf("changeNote") + ' placeholder="Record if raised">' + esc(q.changeNote) + '</textarea>' +
    '<label for="q-variation">Are there things that change day to day?</label>' +
    '<textarea id="q-variation" ' + pf("dayVariation") + ' placeholder="Record response">' + esc(q.dayVariation) + '</textarea>' +
    '</div>' +
    '<div class="card"><div class="sec" style="margin-top:0">About assessment history</div>' +
    '<label for="q-history">Have you had a functional capacity assessment before? What was that experience like?</label>' +
    '<textarea id="q-history" ' + pf("assessHistory") + ' placeholder="Record response">' + esc(q.assessHistory) + '</textarea>' +
    '<label for="q-difficulty">Was there anything that made it hard to describe yourself accurately in past assessments?</label>' +
    '<textarea id="q-difficulty" ' + pf("assessDifficulty") + ' placeholder="Record response">' + esc(q.assessDifficulty) + '</textarea>' +
    '</div>' +
    '<div class="card"><div class="sec" style="margin-top:0">Communication and access needs</div>' +
    '<p id="commLbl">Do you prefer to talk things through, have things read to you, or a mix of both?</p>' +
    '<div class="trow" role="group" aria-labelledby="commLbl" style="margin-bottom:10px">' +
      toggleBtn("commPref", "talk", "Talk through") + toggleBtn("commPref", "read", "Read to me") + toggleBtn("commPref", "mix", "Mix of both") +
    '</div>' +
    '<label for="q-combarrier">Is anything making it harder to concentrate or communicate today? (pain, fatigue, noise)</label>' +
    '<textarea id="q-combarrier" ' + pf("commBarrier") + ' placeholder="Record response or: nothing reported">' + esc(q.commBarrier) + '</textarea>' +
    '<label for="q-comadjust">Do you need any breaks, a different pace, or adjustments today?</label>' +
    '<textarea id="q-comadjust" ' + pf("commAdjust") + ' placeholder="Record agreed adjustments">' + esc(q.commAdjust) + '</textarea>' +
    '</div>' +
    '<div class="card card-green"><div class="sec" style="margin-top:0;color:#0a5c38">Session orientation</div>' +
    '<p class="body" style="color:#0a5c38;margin-bottom:10px">Say to participant:</p>' +
    '<p class="body" style="color:#0a5c38;font-style:italic;margin-bottom:10px">&ldquo;Before we go any further, I want to give you a quick map of what we are going to cover today. We are going to work through 12 areas of your daily life. We will start by getting your first impressions of each area, then later we will go through each one properly. The 12 areas are: personal care, moving around, communication, household tasks, getting out into the community, learning and making decisions, relationships, employment and study, leisure and recreation, safety and managing risks, mental health and wellbeing, and managing your physical health. You will know more about some of these areas than others. That is fine. Is there anything you want to flag before we start?&rdquo;</p>' +
    '<label for="q-sessionflag">Participant flags or notes before starting</label>' +
    '<textarea id="q-sessionflag" ' + pf("sessionFlag") + ' placeholder="Record anything raised">' + esc(q.sessionFlag) + '</textarea>' +
    '</div>' +
    '<div class="nav"><button type="button" class="btn" data-action="go" data-args="' + dataArgs(["part"]) + '">&larr; Back</button>' +
    '<button type="button" class="btn primary" data-action="go" data-args="' + dataArgs(["brate"]) + '">Next: Before ratings &rarr;</button></div>';
}
