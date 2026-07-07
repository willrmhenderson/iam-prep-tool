import { ST } from "../state.js";

export function rConsent(){
  return '<div style="margin-bottom:1.5rem">' +
    '<h2 id="scr-h" style="color:#2d4a1e;margin-bottom:6px">Informed Consent and AI Disclosure</h2>' +
    '<p class="body">Please read this information carefully before proceeding.</p></div>' +
    '<div class="card card-green">' +
    '<h3 style="margin-bottom:8px">What this tool is</h3>' +
    '<p class="body">The I-AM Preparation Tool helps people with disability prepare for the NDIS support needs assessment. It guides you through 12 areas of daily life and generates a preparation report.</p>' +
    '<p class="body"><strong style="color:#2d4a1e">This tool is NOT a formal NDIS assessment.</strong> It does not determine NDIS eligibility or funding. It is a preparation and self-advocacy resource only.</p></div>' +
    '<div class="card">' +
    '<h3 style="margin-bottom:8px">AI disclosure</h3>' +
    '<p class="body" style="margin-bottom:8px">This tool uses artificial intelligence to generate guided questions, suggested statements, and preparation reports. In line with AHPRA guidance on AI in healthcare and the Psychology Board of Australia Code of Conduct:</p>' +
    '<ul style="padding-left:1.2rem;display:flex;flex-direction:column;gap:6px">' +
    '<li style="font-size:14px;color:#555;line-height:1.6">AI assists this tool but does not replace professional clinical judgment</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">All AI-generated content is reviewed and approved by the supervising psychologist</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">The registered psychologist overseeing your use remains fully accountable for all clinical decisions</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">AI outputs are assistive only and are not clinical assessments or funding recommendations</li>' +
    '</ul></div>' +
    '<div class="card">' +
    '<h3 style="margin-bottom:8px">Your privacy</h3>' +
    '<ul style="padding-left:1.2rem;display:flex;flex-direction:column;gap:6px">' +
    '<li style="font-size:14px;color:#555;line-height:1.6">You own all information you enter</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">Your answers are encrypted on this device, and - once you sign in - securely synced to our database so you can pick up where you left off on another device. That database is hosted in Sydney, Australia, and your data never leaves Australia</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">Nobody but you can see your data - it is protected by account sign-in and database rules that restrict every record to its owner</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">There is no advertising, analytics, or third-party tracking of any kind in this app</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">The PDF and text report you generate belong to you</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">You can permanently delete your account and all of your data at any time from the Account screen</li>' +
    '<li style="font-size:14px;color:#555;line-height:1.6">This tool is used under the supervision of a registered psychologist with AHPRA registration</li>' +
    '</ul></div>' +
    '<div class="card card-green">' +
    '<h3 style="margin-bottom:8px;color:#0a5c38">Your consent</h3>' +
    '<p class="body" style="color:#0a5c38;margin-bottom:10px">By selecting "I understand and I agree" you confirm that:</p>' +
    '<ul style="padding-left:1.2rem;display:flex;flex-direction:column;gap:6px;margin-bottom:10px">' +
    '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You have read and understood this information</li>' +
    '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You consent to AI being used to assist in generating questions and reports</li>' +
    '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You understand this is a preparation tool and not a formal NDIS assessment</li>' +
    '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You are participating voluntarily and can stop at any time</li>' +
    '<li style="font-size:14px;color:#0a5c38;line-height:1.6">You understand the supervising psychologist retains full clinical accountability</li>' +
    '</ul>' +
    '<button type="button" class="btn primary" style="width:100%;justify-content:center;padding:14px;font-size:15px;font-weight:600" onclick="IAM.giveConsent()">&#10003; I understand and I agree</button>' +
    '</div>' +
    '<p style="font-size:12px;color:#aaa;text-align:center;margin-top:12px">If you do not wish to proceed, simply close the app.</p>';
}

export function giveConsentAction(){
  ST.consentDate = new Date().toISOString();
}
