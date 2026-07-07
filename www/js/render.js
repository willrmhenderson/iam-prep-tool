import { ST } from "./state.js";
import { rConsent } from "./render/consent.js";
import { rAuth, rAccount } from "./render/auth.js";
import { rRole } from "./render/role.js";
import { rWelcome } from "./render/welcome.js";
import { rPart } from "./render/part.js";
import { rPreq } from "./render/preq.js";
import { rBrate } from "./render/brate.js";
import { rEdusheet } from "./render/edusheet.js";
import { rBarrier } from "./render/barrier.js";
import { rDomain } from "./render/domain.js";
import { rSups } from "./render/sups.js";
import { rAdv } from "./render/adv.js";
import { rPsych } from "./render/psych.js";
import { rReview } from "./render/review.js";
import { rReport } from "./render/report.js";

// ctx carries the bits of runtime context that live outside ST
// (auth session, the account-deletion confirmation UI state, and the
// "you have a saved assessment" banner shown on the role screen).
export function renderScreen(ctx){
  var s = ST.step;
  if (ctx.localOnly && (s === "auth" || s === "account")){
    return '<div style="margin-bottom:1.25rem"><h2 id="scr-h">Account</h2></div>' +
      '<div class="card"><p class="body">Accounts and sync are not set up yet - the app is running in local-only mode and your answers stay on this device. See README.md (Supabase project setup) to enable accounts.</p></div>' +
      '<div class="nav"><button type="button" class="btn" onclick="IAM.go(\'role\')">&larr; Back</button></div>';
  }
  if (s === "auth") return rAuth();
  if (s === "account") return rAccount(ctx.user, ctx.deleteState);
  // localOnly = Supabase not configured yet (see config.js). The app
  // runs without accounts or sync so the UI can be tested locally.
  if (!ctx.session && !ctx.localOnly) return rAuth();
  if (s === "consent") return rConsent();
  if (s === "role") return rRole(ctx.hasSaved, ctx.savedLabel, ctx.savedDate);
  if (s === "welcome") return rWelcome();
  if (s === "part") return rPart();
  if (s === "preq") return rPreq();
  if (s === "brate") return rBrate();
  if (s === "edusheet") return rEdusheet();
  if (s && s.t === "b") return rBarrier(s.i);
  if (s && s.t === "d") return rDomain(s.i);
  if (s === "sups") return rSups();
  if (s === "adv") return rAdv();
  if (s === "psych") return rPsych();
  if (s === "review") return rReview();
  if (s === "report") return rReport();
  return rConsent();
}
