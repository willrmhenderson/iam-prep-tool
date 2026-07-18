import { dataArgs } from "../util.js";

export function rReport(){
  return '<div style="margin-bottom:1rem"><h2 id="scr-h">Your preparation report is ready</h2>' +
    '<p class="body">Download the report to bring to your support needs assessment meeting.</p></div>' +
    '<div class="card">' +
    '<div class="sec" style="margin-top:0">Download</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">' +
    '<button type="button" class="btn primary" data-action="dlPDF">Download PDF</button>' +
    '<button type="button" class="btn" data-action="dlText">Download plain text</button>' +
    '<button type="button" class="btn" data-action="printReport">Print</button></div>' +
    '<div class="sec">Transfer data between devices</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
    '<button type="button" class="btn" data-action="expJSON">Export data file</button>' +
    '<button type="button" class="btn" data-action="triggerFileImport">Import data file</button>' +
    '<input type="file" id="jimp" accept=".json" style="display:none" data-onchange="impJSON"></div>' +
    '<p style="font-size:12px;color:#888;margin-top:4px">If you are signed in, your data already syncs automatically. Use export/import only if you need an offline backup file - keep that file somewhere private, as it is not encrypted.</p>' +
    '<div id="dmsg" role="status" aria-live="polite" style="font-size:12px;color:#1D9E75;margin-top:8px;display:none"></div></div>' +
    '<div class="nav"><button type="button" class="btn" data-action="go" data-args="' + dataArgs(["review"]) + '">&larr; Back</button></div>';
}
