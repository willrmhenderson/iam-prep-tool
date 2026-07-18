// Shared render helpers used across every screen.

import { esc } from "../util.js";
import { ST, dirty, getStatus } from "../state.js";

// Save-status bar. The status text sits in an aria-live region so
// screen reader users hear "Saved" / "Unsaved..." without having to
// poll the screen - the original tool only updated this visually.
export function sb(){
  var s = getStatus();
  var label = s.dirty ? "Unsaved changes" : (s.savedAt ? "Saved " + new Date(s.savedAt).toLocaleTimeString() : "Not saved yet");
  return '<div class="sbar">' +
    '<div class="sdot' + (s.dirty ? " u" : "") + '" aria-hidden="true"></div>' +
    '<span id="smsg" role="status" aria-live="polite">' + esc(label) + '</span>' +
    '<button type="button" class="btn sm" style="margin-left:auto" data-action="save">Save</button>' +
    '<button type="button" class="btn sm" style="background:#fdf3e3;color:#7a4a0a;border-color:#e8b86d" data-action="doBreak">Break</button>' +
    '</div>';
}

export function selO(opts, cur){
  var h = "";
  for (var i = 0; i < opts.length; i++)
    h += '<option value="' + esc(opts[i].v) + '"' + (cur === opts[i].v ? " selected" : "") + '>' + esc(opts[i].l) + '</option>';
  return h;
}

// A real, programmatically-exposed progress indicator (the original
// used a plain styled div with no role or values attached to it).
export function progressBar(current, total, label){
  var pct = Math.round((current / total) * 100);
  return '<div class="prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label) + '">' +
    '<div class="progf" style="width:' + pct + '%"></div></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">' +
    '<span class="muted">' + esc(label) + '</span><span class="muted">' + pct + '%</span></div>';
}

// Moves focus to the new screen's heading after every render so
// keyboard and screen-reader users land somewhere sensible instead of
// keeping focus on a button that no longer exists in the DOM. Screens
// should give their top heading id="scr-h".
export function focusScreenHeading(){
  requestAnimationFrame(function(){
    var h = document.getElementById("scr-h");
    if (h){
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: false });
    }
  });
}

export function fieldRow(id, labelText, inputHtml){
  return '<div><label for="' + id + '">' + esc(labelText) + '</label>' + inputHtml + '</div>';
}
