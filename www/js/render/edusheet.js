import { dataArgs } from "../util.js";
import { sb } from "./shared.js";

export function rEdusheet(){
  return sb() +
    '<div style="margin-bottom:1rem"><h2 id="scr-h">Understanding functional capacity</h2>' +
    '<p class="body">Step 3 of 4 &mdash; Read this with the participant before the disclosure barrier sheets.</p></div>' +
    '<div class="card card-green"><p style="font-size:13px;color:#0a5c38;font-style:italic;margin-bottom:8px">Sandy reads this section aloud with the participant.</p></div>' +
    '<div class="card">' +
    '<h3 style="margin-bottom:10px;color:#2d4a1e">A different way of looking at your disability</h3>' +
    '<p class="body">Most people describe their disability by talking about their diagnosis. Their condition. Their medical history.</p>' +
    '<p class="body">That information matters. But it is not what an assessor needs most.</p>' +
    '<p class="body">An assessor needs to understand your life. What you can do. What you cannot do. What happens in between.</p>' +
    '<p class="body">There are four questions that get to the heart of this. Every area of your daily life we look at together will come back to these four questions.</p>' +
    '</div>' +
    '<div class="card" style="border-left:4px solid #1D9E75">' +
    '<p style="font-size:13px;font-weight:600;color:#2d4a1e;margin-bottom:14px">The four questions</p>' +
    '<div style="display:flex;flex-direction:column;gap:14px">' +
    numberedQ(1, "What can you do?", "Not what you used to do. Not what you wish you could do. What you can actually do right now, on a typical day.") +
    numberedQ(2, "Under what conditions?", "Does it depend on the time of day? Whether you slept? Whether someone is with you? Whether the environment is quiet? The conditions matter as much as the activity.") +
    numberedQ(3, "With what supports in place?", "What help do you need to do it at all? That includes equipment, another person, medication, routines, or anything else that makes the activity possible.") +
    numberedQ(4, "At what cost to you?", "What does it take out of you? Pain, fatigue, recovery time, time away from other things, reliance on others? The cost is part of the picture.") +
    '</div></div>' +
    '<div class="card card-green">' +
    '<p style="font-size:13px;color:#0a5c38;font-weight:600;margin-bottom:6px">What this means for you today</p>' +
    '<p style="font-size:13px;color:#0a5c38;line-height:1.7">As we go through each area of your life, these are the four things I want you to think about. You do not need to remember the questions themselves. I will ask them. Your job is just to answer honestly about your life. What you actually do. What it actually takes. What it actually costs you.</p>' +
    '<p style="font-size:13px;color:#0a5c38;margin-top:8px;font-weight:600">There are no right answers. There are only honest ones.</p>' +
    '</div>' +
    '<div class="nav"><button type="button" class="btn" data-action="go" data-args="' + dataArgs(["brate"]) + '">&larr; Back</button>' +
    '<button type="button" class="btn primary" data-action="go" data-args="' + dataArgs([{ t: "b", i: 0 }]) + '">Continue to disclosure barriers &rarr;</button></div>';
}

function numberedQ(n, title, body){
  return '<div style="display:flex;gap:14px;align-items:flex-start">' +
    '<div style="background:#1D9E75;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0" aria-hidden="true">' + n + '</div>' +
    '<div><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin-bottom:4px">' + title + '</p>' +
    '<p style="font-size:13px;color:#555;line-height:1.6">' + body + '</p></div></div>';
}
