// PDF and plain-text report generation, plus data transfer (export/
// import a backup file) and native share handling.
//
// jsPDF is vendored locally at www/vendor/jspdf.umd.min.js (loaded via
// a plain <script> tag in index.html) instead of fetched from a CDN at
// runtime - this closes two problems in the original tool: a
// supply-chain risk (an unpinned, no-SRI remote script with full page
// access) and an offline gap (report generation used to require a
// live network connection even though the rest of the app worked
// offline).

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { ST } from "./state.js";
import { DOM } from "./data.js";
import { genIQs } from "./render/psych.js";

function fm(text){
  var e = document.getElementById("dmsg");
  if (e){
    e.textContent = text;
    e.style.display = "block";
    setTimeout(function(){ e.style.display = "none"; }, 3500);
  }
}

async function deliverFile(filename, blob, mimeType){
  if (Capacitor.isNativePlatform()){
    var base64 = await blobToBase64(blob);
    var writeRes = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache
    });
    await Share.share({
      title: filename,
      url: writeRes.uri
    });
  } else {
    var u = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = u; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(u);
  }
}

function blobToBase64(blob){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onloadend = function(){ resolve(String(reader.result).split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function expJSON(){
  var b = new Blob([JSON.stringify(ST, null, 2)], { type: "application/json" });
  await deliverFile("IAM_" + (ST.p.name || "data").replace(/\s+/g, "_") + ".json", b, "application/json");
  fm("Data exported.");
}

export function impJSON(input){
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e){
    try{
      var incoming = JSON.parse(e.target.result);
      if (typeof incoming !== "object" || incoming === null || !Array.isArray(incoming.d)){
        fm("That file does not look like an I-AM data file.");
        return;
      }
      Object.assign(ST, incoming);
      fm("Imported.");
      window.IAM.refresh();
    }catch(err){ fm("Could not read file."); }
  };
  r.readAsText(f);
}

export async function dlPDF(){
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: "mm", format: "a4" });
  var W = 210, ML = 15, MR = 15, TW = W - ML - MR, y = 18;
  function chk(h){ if (y + h > 282){ doc.addPage(); y = 18; } }
  function gap(n){ y += (n || 3); }
  function rule(r, g, bl){ chk(2); doc.setDrawColor(r || 180, g || 180, bl || 180); doc.line(ML, y, W - MR, y); y += 4; }
  function wr(t, sz, bold, r, g, bl){
    doc.setFontSize(sz || 9); doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(r || 40, g || 40, bl || 40);
    var lines = doc.splitTextToSize(String(t || ""), TW);
    chk(lines.length * 6); doc.text(lines, ML, y); y += lines.length * 6 + (sz > 11 ? 2 : 0);
  }
  function kv(k, v){
    if (!v) return;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
    doc.text(String(k), ML, y); doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40);
    var lines = doc.splitTextToSize(String(v), TW - 44); doc.text(lines, ML + 44, y); y += lines.length * 6;
  }
  function h1(t){ gap(4); wr(t, 13, true, 45, 74, 30); gap(1); rule(45, 74, 30); }
  function h2(t){ gap(3); wr(t, 11, true, 40, 40, 40); gap(1); rule(); }
  function body(t){ if (!t || !String(t).trim()) return; wr(t, 9, false, 60, 60, 60); gap(2); }

  var p = ST.p, a = ST.adv, py = ST.psych;
  doc.setFillColor(45, 74, 30); doc.rect(0, 0, 210, 16, "F");
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("I-AM PREPARATION REPORT", ML, 8);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 220, 180);
  doc.text("A W & S Henderson Resource - Copyright 2025 William & Sandra Henderson", ML, 13);
  doc.setTextColor(200, 220, 200); doc.text("Date: " + (p.date || new Date().toISOString().split("T")[0]), 165, 8);
  y = 22;
  doc.setFillColor(235, 248, 238); doc.rect(ML - 2, y - 2, TW + 4, 14, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(40, 100, 60);
  doc.text("PREPARATION TOOL ONLY - Does not replace a formal NDIS assessment by a qualified assessor.", ML, y + 3);
  doc.text("AI consent recorded: " + (ST.consentDate ? new Date(ST.consentDate).toLocaleString() : "Not recorded"), ML, y + 8);
  y += 18;

  h1("Participant details");
  kv("Name:", p.name); kv("Date of birth:", p.dob); kv("NDIS number:", p.ndis);
  kv("Primary disability:", p.disability); kv("Prepared by:", p.by + (p.role ? " (" + p.role + ")" : ""));
  if (p.goals){ gap(2); wr("Goals:", 9, true); body(p.goals); }
  if (p.barriers){ wr("Key barriers:", 9, true); body(p.barriers); }

  var hi = ST.d.filter(function(d){ return d.impact === "High" || d.impact === "Critical"; });
  if (hi.length){
    h1("Executive summary - high and critical risk");
    hi.forEach(function(d){ var di = ST.d.indexOf(d); wr("- " + DOM[di].name + " [" + d.impact + "]", 9, true, 140, 30, 30); if (d.gs) body(d.gs.substring(0, 150)); });
  }

  h1("Support needs by domain");
  DOM.forEach(function(d, i){
    var s = ST.d[i]; if (!s.gs || !s.gs.trim()) return;
    h2("Domain " + (i + 1) + ": " + d.name);
    wr("Support needs statement:", 9, true); body(s.gs);
    if (s.bs && s.bs.trim()){ wr("Hard day:", 9, true); body(s.bs); }
    if (s.freq) kv("Frequency:", s.freq); if (s.stype) kv("Support type:", s.stype);
    if (s.impact) kv("Impact without support:", s.impact);
    if (s.change){ wr("Changes over time:", 9, true); body(s.change); }
    if (s.notes){ wr("Assessor notes:", 9, true); body(s.notes); }
    if (s.so){ wr("Support person observations:", 9, true); body(s.so); }
    if (s.sf && s.sfn){ wr("** Support flag **", 9, true, 140, 60, 10); body(s.sfn); }
    if (s.pn){ wr("Psychologist notes:", 9, true); body(s.pn); }
    if (s.pf) wr("** Priority interview focus **", 9, true, 20, 80, 140);
  });

  if (a && (a.typical || a.risks || a.myword)){
    h1("Advocacy and evidence");
    if (a.typical){ h2("Typical day"); body(a.typical); }
    if (a.hard){ h2("Difficult day"); body(a.hard); }
    if (a.risks){ h2("Risks if support removed"); body(a.risks); }
    if (a.informal){ h2("Informal support"); body(a.informal); }
    if (a.equip){ h2("Equipment and aids"); body(a.equip); }
    if (a.history){ h2("History of supports"); body(a.history); }
    if (a.worked){ h2("What has worked"); body(a.worked); }
    if (a.failed){ h2("What has not worked"); body(a.failed); }
    if (a.myword){ h2("Participant's own statement"); body(a.myword); }
  }

  if (ST.sups && ST.sups.length){
    h1("Support circle observations");
    ST.sups.forEach(function(s, i){
      h2((s.name || "Support person " + (i + 1)) + (s.rel ? " - " + s.rel : ""));
      if (s.dur) kv("Known participant:", s.dur);
      if (s.support){ wr("Support provided:", 9, true); body(s.support); }
      if (s.without){ wr("Without this support:", 9, true); body(s.without); }
      if (s.msg){ wr("Most important for assessor:", 9, true); body(s.msg); }
    });
  }

  if (py && (py.overview || py.notes)){
    h1("Psychologist pre-interview notes");
    if (py.overview){ h2("Clinical overview"); body(py.overview); }
    if (py.notes){ h2("Clinical notes"); body(py.notes); }
    if (py.goals){ h2("Interview goals"); body(py.goals); }
    if (py.readiness){ h2("Participant readiness"); body(py.readiness); }
    var iqs = genIQs();
    if (iqs.length){ h2("Suggested interview questions"); iqs.forEach(function(q, i){ body((i + 1) + ". " + q); }); }
  }

  var pages = doc.getNumberOfPages();
  for (var pg = 1; pg <= pages; pg++){
    doc.setPage(pg); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text("Page " + pg + " of " + pages + " | I-AM Preparation Report | W & S Henderson | Not a formal assessment | Copyright 2025 William & Sandra Henderson", ML, 292);
  }

  var filename = "IAM_Prep_" + (p.name || "participant").replace(/\s+/g, "_") + "_" + (p.date || "draft") + ".pdf";
  var blob = doc.output("blob");
  await deliverFile(filename, blob, "application/pdf");
}

function filterCheckins(fromStr, toStr){
  var entries = ST.checkins.slice().sort(function(a, b){ return new Date(a.at) - new Date(b.at); });
  if (fromStr){
    var from = new Date(fromStr + "T00:00:00");
    entries = entries.filter(function(c){ return new Date(c.at) >= from; });
  }
  if (toStr){
    var to = new Date(toStr + "T23:59:59");
    entries = entries.filter(function(c){ return new Date(c.at) <= to; });
  }
  return entries;
}

function checkinRangeLabel(fromStr, toStr){
  if (fromStr && toStr) return fromStr + " to " + toStr;
  if (fromStr) return "from " + fromStr;
  if (toStr) return "up to " + toStr;
  return "all entries";
}

function ratingText(c){
  var parts = [];
  if (c.mood !== null && c.mood !== undefined) parts.push("Feeling " + c.mood + (c.moodWord ? " (" + c.moodWord + ")" : ""));
  if (c.fatigue !== null && c.fatigue !== undefined) parts.push("Tired " + c.fatigue);
  if (c.pain !== null && c.pain !== undefined) parts.push("Pain " + c.pain);
  if (c.clarity !== null && c.clarity !== undefined) parts.push("Foggy " + c.clarity);
  return parts.length ? parts.join(", ") : "No ratings recorded";
}

// Check-in diary summary. Same structure and delivery as the main
// report: ratings shown plainly, then every note in full, verbatim,
// in the participant's own words. No interpretation, no commentary.
export async function dlCheckinPDF(fromStr, toStr){
  var entries = filterCheckins(fromStr, toStr);
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: "mm", format: "a4" });
  var W = 210, ML = 15, MR = 15, TW = W - ML - MR, y = 18;
  function chk(h){ if (y + h > 282){ doc.addPage(); y = 18; } }
  function gap(n){ y += (n || 3); }
  function rule(r, g, bl){ chk(2); doc.setDrawColor(r || 180, g || 180, bl || 180); doc.line(ML, y, W - MR, y); y += 4; }
  function wr(t, sz, bold, r, g, bl){
    doc.setFontSize(sz || 9); doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(r || 40, g || 40, bl || 40);
    var lines = doc.splitTextToSize(String(t || ""), TW);
    chk(lines.length * 6); doc.text(lines, ML, y); y += lines.length * 6 + (sz > 11 ? 2 : 0);
  }
  function h1(t){ gap(4); wr(t, 13, true, 45, 74, 30); gap(1); rule(45, 74, 30); }

  doc.setFillColor(45, 74, 30); doc.rect(0, 0, 210, 16, "F");
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("DAILY CHECK-IN SUMMARY", ML, 8);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 220, 180);
  doc.text("A W & S Henderson Resource - Copyright 2025 William & Sandra Henderson", ML, 13);
  y = 22;
  doc.setFillColor(235, 248, 238); doc.rect(ML - 2, y - 2, TW + 4, 10, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(40, 100, 60);
  doc.text("The participant's own record, in their own words. Not a clinical assessment. Ratings are self-rated 0-4.", ML, y + 3);
  y += 14;

  wr("Participant: " + (ST.p.name || "Not stated"), 10, true);
  wr("Period: " + checkinRangeLabel(fromStr, toStr) + "  |  Entries: " + entries.length, 9, false);

  h1("Ratings");
  wr("Scales: Feeling 0 very low - 4 really good. Tired 0 not tired - 4 exhausted. Pain 0 none - 4 severe. Foggy 0 clear - 4 very foggy.", 8, false, 100, 100, 100);
  gap(2);
  entries.forEach(function(c){
    wr(new Date(c.at).toLocaleDateString() + " " + new Date(c.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "  -  " + ratingText(c), 9, false);
  });

  var noted = entries.filter(function(c){ return c.note && c.note.trim(); });
  if (noted.length){
    h1("Notes, in the participant's own words");
    noted.forEach(function(c){
      gap(2);
      wr(new Date(c.at).toLocaleDateString(), 9, true);
      wr(c.note, 9, false, 60, 60, 60);
    });
  }

  var pages = doc.getNumberOfPages();
  for (var pg = 1; pg <= pages; pg++){
    doc.setPage(pg); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text("Page " + pg + " of " + pages + " | Daily Check-in Summary | W & S Henderson | Not a clinical assessment | Copyright 2025 William & Sandra Henderson", ML, 292);
  }

  var filename = "IAM_Checkins_" + (ST.p.name || "participant").replace(/\s+/g, "_") + ".pdf";
  await deliverFile(filename, doc.output("blob"), "application/pdf");
}

export async function dlCheckinText(fromStr, toStr){
  var entries = filterCheckins(fromStr, toStr);
  var lines = [];
  function line(t){ lines.push(t || ""); }
  line("DAILY CHECK-IN SUMMARY");
  line("A W & S Henderson Resource - Copyright 2025 William & Sandra Henderson");
  line("The participant's own record, in their own words. Not a clinical assessment.");
  line("");
  line("Participant: " + (ST.p.name || "Not stated"));
  line("Period: " + checkinRangeLabel(fromStr, toStr) + " | Entries: " + entries.length);
  line("");
  line("RATINGS");
  line("Scales: Feeling 0 very low - 4 really good. Tired 0 not tired - 4 exhausted. Pain 0 none - 4 severe. Foggy 0 clear - 4 very foggy.");
  entries.forEach(function(c){
    line(new Date(c.at).toLocaleDateString() + " " + new Date(c.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " - " + ratingText(c));
  });
  var noted = entries.filter(function(c){ return c.note && c.note.trim(); });
  if (noted.length){
    line("");
    line("NOTES, IN THE PARTICIPANT'S OWN WORDS");
    noted.forEach(function(c){
      line("");
      line(new Date(c.at).toLocaleDateString() + ":");
      line(c.note);
    });
  }
  var filename = "IAM_Checkins_" + (ST.p.name || "participant").replace(/\s+/g, "_") + ".txt";
  await deliverFile(filename, new Blob([lines.join("\n")], { type: "text/plain" }), "text/plain");
}

export async function dlText(){
  var p = ST.p, a = ST.adv, py = ST.psych;
  var lines = [];
  function line(t){ lines.push(t || ""); }
  function section(t){ line(""); line(t.toUpperCase()); line("-".repeat(t.length)); }

  line("I-AM PREPARATION REPORT");
  line("A W & S Henderson Resource - Copyright 2025 William & Sandra Henderson");
  line("Date: " + (p.date || new Date().toISOString().split("T")[0]));
  line("PREPARATION TOOL ONLY - Does not replace a formal NDIS assessment by a qualified assessor.");

  section("Participant details");
  line("Name: " + (p.name || ""));
  line("Date of birth: " + (p.dob || ""));
  line("NDIS number: " + (p.ndis || ""));
  line("Primary disability: " + (p.disability || ""));
  line("Prepared by: " + (p.by || "") + (p.role ? " (" + p.role + ")" : ""));
  if (p.goals) { line("Goals: " + p.goals); }
  if (p.barriers) { line("Key barriers: " + p.barriers); }

  var hi = ST.d.filter(function(d){ return d.impact === "High" || d.impact === "Critical"; });
  if (hi.length){
    section("Executive summary - high and critical risk");
    hi.forEach(function(d){ var di = ST.d.indexOf(d); line("- " + DOM[di].name + " [" + d.impact + "]"); if (d.gs) line("  " + d.gs); });
  }

  section("Support needs by domain");
  DOM.forEach(function(d, i){
    var s = ST.d[i]; if (!s.gs || !s.gs.trim()) return;
    line(""); line("Domain " + (i + 1) + ": " + d.name);
    line("Support needs statement: " + s.gs);
    if (s.bs && s.bs.trim()) line("Hard day: " + s.bs);
    if (s.freq) line("Frequency: " + s.freq);
    if (s.stype) line("Support type: " + s.stype);
    if (s.impact) line("Impact without support: " + s.impact);
    if (s.change) line("Changes over time: " + s.change);
    if (s.notes) line("Assessor notes: " + s.notes);
    if (s.so) line("Support person observations: " + s.so);
    if (s.sf && s.sfn) line("** Support flag **: " + s.sfn);
    if (s.pn) line("Psychologist notes: " + s.pn);
    if (s.pf) line("** Priority interview focus **");
  });

  if (a && (a.typical || a.risks || a.myword)){
    section("Advocacy and evidence");
    if (a.typical) line("Typical day: " + a.typical);
    if (a.hard) line("Difficult day: " + a.hard);
    if (a.risks) line("Risks if support removed: " + a.risks);
    if (a.informal) line("Informal support: " + a.informal);
    if (a.equip) line("Equipment and aids: " + a.equip);
    if (a.history) line("History of supports: " + a.history);
    if (a.worked) line("What has worked: " + a.worked);
    if (a.failed) line("What has not worked: " + a.failed);
    if (a.myword) line("Participant's own statement: " + a.myword);
  }

  if (ST.sups && ST.sups.length){
    section("Support circle observations");
    ST.sups.forEach(function(s, i){
      line(""); line((s.name || "Support person " + (i + 1)) + (s.rel ? " - " + s.rel : ""));
      if (s.dur) line("Known participant: " + s.dur);
      if (s.support) line("Support provided: " + s.support);
      if (s.without) line("Without this support: " + s.without);
      if (s.msg) line("Most important for assessor: " + s.msg);
    });
  }

  if (py && (py.overview || py.notes)){
    section("Psychologist pre-interview notes");
    if (py.overview) line("Clinical overview: " + py.overview);
    if (py.notes) line("Clinical notes: " + py.notes);
    if (py.goals) line("Interview goals: " + py.goals);
    if (py.readiness) line("Participant readiness: " + py.readiness);
    var iqs = genIQs();
    if (iqs.length){ line("Suggested interview questions:"); iqs.forEach(function(q, i){ line("  " + (i + 1) + ". " + q); }); }
  }

  var blob = new Blob([lines.join("\n")], { type: "text/plain" });
  var filename = "IAM_Prep_" + (p.name || "participant").replace(/\s+/g, "_") + "_" + (p.date || "draft") + ".txt";
  await deliverFile(filename, blob, "text/plain");
}
