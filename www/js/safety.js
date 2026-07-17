// Local, instant crisis-language check for free-text fields.
//
// Runs entirely on-device: pure string matching, no network call of
// any kind, so it works identically offline. Two tiers:
//   "concern" - language suggesting a heavy day / low mood / self-harm
//   "urgent"  - language reading as immediate intent or danger
//
// ============================================================
// PLACEHOLDER WORD LISTS - NOT CLINICALLY REVIEWED - DO NOT SHIP
// These lists and the card wording below BOTH require clinical
// sign-off from Sandy before this feature is used with any real
// participant. They exist only so the two-tier detection structure
// and UI can be built and tested. Do not treat them as final.
// ============================================================
var CONCERN_TERMS = [
  "hopeless", "worthless", "can't go on", "cant go on", "give up",
  "self harm", "self-harm", "hurt myself", "hurting myself",
  "no point", "better off without me", "burden to everyone"
];
var URGENT_TERMS = [
  "kill myself", "end my life", "suicide", "suicidal",
  "want to die", "going to hurt myself", "end it all", "end it tonight"
];

export function checkCrisisLanguage(text){
  if (!text || !text.trim()) return { level: "none" };
  var t = text.toLowerCase();
  for (var i = 0; i < URGENT_TERMS.length; i++)
    if (t.indexOf(URGENT_TERMS[i]) !== -1) return { level: "urgent" };
  for (var j = 0; j < CONCERN_TERMS.length; j++)
    if (t.indexOf(CONCERN_TERMS[j]) !== -1) return { level: "concern" };
  return { level: "none" };
}

// Builds the card HTML for a given level. supNames is an array of
// support-circle first names (may be empty) - used by the urgent tier
// only, to gently point the person at their own people alongside the
// crisis lines, never instead of them.
//
// PLACEHOLDER WORDING - needs clinical sign-off (see note above).
export function safetyCardHtml(level, supNames){
  if (level === "concern"){
    return '<div class="safety-concern" role="status">' +
      '<p style="font-weight:600;margin-bottom:4px">That sounds like a genuinely hard day.</p>' +
      '<p>Whatever is going on, you do not have to carry it alone. You can talk to someone right now &mdash; <strong>Lifeline 13 11 14</strong>, any time, day or night.</p>' +
      '</div>';
  }
  if (level === "urgent"){
    var supLine;
    if (supNames && supNames.length){
      var names = supNames.slice(0, 3).join(", ");
      supLine = 'You listed <strong>' + names + '</strong> in your support circle. If you can, consider reaching out to one of them right now as well.';
    } else {
      supLine = 'If there is someone you trust nearby, consider reaching out to them right now as well.';
    }
    return '<div class="safety-urgent" role="alert">' +
      '<p class="su-head">We hear you. What you just wrote matters.</p>' +
      '<p>Please talk to someone right now:</p>' +
      '<p class="su-line"><strong>Lifeline 13 11 14</strong> &mdash; free, 24 hours, they will listen</p>' +
      '<p class="su-line"><strong>Triple Zero (000)</strong> &mdash; if you are in immediate danger</p>' +
      '<p style="margin-top:8px">' + supLine + '</p>' +
      '</div>';
  }
  return "";
}
