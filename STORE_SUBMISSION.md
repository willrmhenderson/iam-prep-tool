# Store submission checklist — I-AM Preparation Tool

Work top to bottom. Items marked **(honesty)** are places where you must declare health-data collection accurately — under-declaring is the single most common reason health apps get rejected or later removed.

---

## Part A — Before either store

- [ ] **Host the privacy policy at a public URL.** Both stores require a link, not a PDF. Put `PRIVACY_POLICY.md` content on a page like `willhenderson.ai/iam/privacy`. Keep the URL stable — it goes into both store listings and the app's Account screen.
- [ ] **Decide the support contact.** Both stores require a support email shown publicly. A dedicated address (e.g. iam@...) keeps it out of your personal inbox.
- [ ] **Confirm Supabase is on a paid plan before launch.** Free-tier projects pause after inactivity, which would break sync for real users.
- [ ] **App icons and splash.** Put a 1024×1024 PNG master icon in `resources/` and generate platform assets with `npx @capacitor/assets generate`. Keep it simple — the green palette, plain type.
- [ ] **Screenshots.** Both stores want them. Take them on-device from the consent, domain, and report screens with *fictional* data only. Never screenshot real participant data.
- [ ] **Final content check.** The app's consent screen says a supervising psychologist oversees use. Make sure that is operationally true for everyone who can download it from a public store, or reword the consent screen for public distribution before submitting. This is the one item on this list only you can resolve.

---

## Part B — Apple App Store

### Account and signing
- [ ] Enrol in the **Apple Developer Program** (developer.apple.com, US$99/year). Enrol as an individual, or as an organisation if W & S Henderson has an ABN you want on the listing (organisation enrolment needs a D-U-N-S number — allow 2 weeks).
- [ ] On the Mac, sign in to Xcode with that Apple ID (Xcode → Settings → Accounts). Xcode manages certificates and provisioning automatically ("Automatically manage signing" in Signing & Capabilities). You do not need to create certificates by hand.
- [ ] In App Store Connect (appstoreconnect.apple.com): **My Apps → + → New App**. Bundle ID `au.com.wshenderson.iam` (must match `capacitor.config.json`), name "I-AM Preparation Tool".

### Build and upload
- [ ] `npm run sync`, open Xcode, select **Any iOS Device**, then **Product → Archive**.
- [ ] In the Organizer window: **Distribute App → App Store Connect → Upload**.
- [ ] Wait for processing (~15 min), then attach the build to your app version in App Store Connect.

### App Privacy ("nutrition label") **(honesty)**
Declare exactly this in App Store Connect → App Privacy:
- [ ] **Data is collected:** Yes.
- [ ] **Contact Info → Email Address** — collected, linked to identity, used for App Functionality (account sign-in). Not used for tracking.
- [ ] **Health & Fitness → Health** — collected, linked to identity, used for App Functionality. Not used for tracking. This covers the disability and support-needs information users enter.
- [ ] **Sensitive Info** — collected, linked to identity, App Functionality. (Disability information is "sensitive information"; declare it even though it overlaps with Health.)
- [ ] **Tracking:** No. **Third-party advertising:** No. **Analytics:** No.
- [ ] Privacy policy URL: the page from Part A.

### Review information
- [ ] Provide a **demo account** (create a test login on your Supabase project) in the "App Review Information" notes — reviewers must be able to get past the sign-in screen or they will reject with "Guideline 2.1 — information needed".
- [ ] In the notes, state plainly: "This app helps NDIS participants (Australian disability scheme) prepare notes for a planning meeting. It is a preparation tool, not a medical device, and provides no diagnosis or treatment." This heads off both the 4.2 web-wrapper question and any medical-app misclassification.
- [ ] Age rating questionnaire: answers produce 4+ / "Medical/Treatment Information: None" — the app presents no treatment advice.
- [ ] Category: **Medical** or **Health & Fitness** (Medical is the honest fit; reviewers accept either for planning tools).

### Accessibility
- [ ] Apple has no formal accessibility declaration form, but test with VoiceOver before submitting (README §6) — accessibility complaints are a removal risk for a disability-audience app, and you should honestly be able to say it was screen-reader tested.
- [ ] In the App Store description, state the accessibility features (VoiceOver support, Dynamic Type, large touch targets). This is your public accessibility declaration.

---

## Part C — Google Play

### Account and signing
- [ ] Register a **Google Play Console** developer account (play.google.com/console, US$25 one-off). Identity verification can take a few days.
- [ ] Create the app in Play Console: name "I-AM Preparation Tool", package `au.com.wshenderson.iam`.
- [ ] Build a signed **Android App Bundle**: in Android Studio, **Build → Generate Signed App Bundle**, create a new keystore, and **back the keystore file and its passwords up somewhere safe** (password manager + offline copy). Opt in to **Play App Signing** when uploading (Google keeps the signing key; your keystore becomes the upload key — this is the safe default).

### Data safety form **(honesty)**
Play Console → App content → Data safety. Declare:
- [ ] **Collects data:** Yes. **Shares data:** No. (Supabase is your processor, not a third party you "share" with, per Google's definitions — but say Yes to "data transferred off device".)
- [ ] **Personal info → Email address** — collected, required, account management.
- [ ] **Health info → Health information** — collected, required, app functionality. This covers disability/support-needs content.
- [ ] **Encryption in transit:** Yes. **User can request deletion:** Yes — and fill in the **account deletion URL/flow** question pointing at the in-app Account → Delete flow (Google now requires apps with accounts to offer deletion; this app does).
- [ ] **Data deletion:** state that account deletion removes all server data immediately.
- [ ] No advertising ID usage, no analytics, no tracking.

### Health apps declaration
- [ ] Play Console → App content → **Health apps**: declare the app under "Health & wellness" / manages sensitive health information. Answer that it is **not** a medical device and does not provide diagnosis/treatment.

### Accessibility
- [ ] Google has no mandatory accessibility form, but run **TalkBack** through the full flow (README §6) and mention accessibility features in the store listing description, as with Apple.

### Rollout
- [ ] Content rating questionnaire (IARC): answers give "Everyone".
- [ ] Target audience: 18+ (avoids the child-safety policy track entirely).
- [ ] Category: Medical.
- [ ] Start with **Internal testing** (add your own email), promote to **Closed testing**, then **Production**. Note: new personal developer accounts must run a closed test with at least 12 testers for 14 days before production access — plan for this; recruit testers from your own circle.

---

## Part D — After launch

- [ ] Check Supabase → Database → daily backups are on (they are by default on paid plans).
- [ ] Calendar reminder: Apple developer membership renews yearly; expired membership removes the app from sale.
- [ ] When you change any data practice (e.g. add a new field), update the privacy policy page AND both store privacy forms in the same release.
