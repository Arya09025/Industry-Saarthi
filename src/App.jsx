/* ============================================================================
 *  IndustrySaarthi — Industrial Approvals & Compliance Platform
 *  ----------------------------------------------------------------------------
 *  Smart India Hackathon 2026
 *  Problem Statement ID : SIH26130
 *  Team                 : Stack_OF  (Team ID: SIH396)
 *  Category             : Software   |   Theme: Miscellaneous
 *
 *  PROBLEM
 *  Businesses in India deal with many departments, many portals, confusing
 *  paperwork and language barriers just to get basic approvals running.
 *
 *  WHAT THIS PROTOTYPE DOES
 *   1. Approval identification  — enter your business profile, get the exact
 *                                 list of approvals you legally need.
 *   2. Roadmap + dependency map — splits approvals into ones that can be filed
 *                                 in parallel and ones that must wait on others.
 *   3. Channel routing          — each approval is tagged online / offline /
 *                                 hybrid. Online ones link straight to the real
 *                                 government portal. Offline ones open an
 *                                 office-visit panel with address, the regional
 *                                 head to meet, step-by-step instructions, the
 *                                 document checklist, and slot booking.
 *   4. Document check           — OCR-style upload validation PLUS a FORMAT
 *                                 verifier: file type/size/resolution, the
 *                                 published number pattern, the real check
 *                                 digit (Verhoeff for Aadhaar, mod-36 for
 *                                 GSTIN) and internal consistency between
 *                                 numbers. Format only — no records lookup,
 *                                 since the official APIs are not available
 *                                 to the prototype.
 *   5. Scan & translate         — two modes. Filled forms in a local language
 *                                 are translated field-by-field and each value
 *                                 is checked for correctness. Blank English
 *                                 forms are translated INTO the user's language
 *                                 so they know what to fill.
 *   6. Scheme matching          — matches government incentives to the sector.
 *
 *  NOTE ON DATA
 *  All AI/OCR/translation behaviour here is SIMULATED with deterministic
 *  fixtures so the demo runs offline with no API keys. In production these
 *  hooks map to:
 *      OCR          -> Tesseract / Google Cloud Vision
 *      Translation  -> Bhashini API (Govt. of India) or IndicTrans2
 *      Approval data-> NSWS + DPIIT department APIs
 *      Backend      -> Node.js + Express + MySQL, Dockerised
 *      Security     -> JWT auth + Role Based Access Control + AES at rest
 *
 *  The office addresses, phone numbers and officer designations used below are
 *  representative sample records for the Nashik region, kept in one place
 *  (APPROVAL_CHANNELS) so they can be swapped for a live database call.
 * ==========================================================================*/

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  FileText, Shield, Clock, Bell, CheckCircle, AlertTriangle,
  ChevronRight, Plus, Upload, Search, BarChart3, Users, Building2,
  MapPin, IndianRupee, Globe, Eye, Trash2, ArrowRight, X,
  LayoutDashboard, FolderOpen, Route, FileCheck, Gift, Languages,
  ChevronDown, AlertCircle, Timer, Zap, TrendingUp, Calendar,
  ImageIcon, ScanLine, Type, ShieldCheck, XCircle, RotateCcw,
  CalendarDays, Navigation, Phone, Mail, User, ExternalLink,
  Bell as BellIcon, Settings, ChevronLeft, HelpCircle, MessageCircle, Send, Sparkles, PhoneCall,
  Landmark, Laptop, UserCheck, Fingerprint, GitCompare, Clock3
} from "lucide-react";

// ==========================================================================
//  INDUSTRY SAARTHI VISUAL THEME
//  Reference-inspired palette: soft mint surfaces + deep teal actions.
//  All legacy purple/blue accents are intentionally removed.
// ==========================================================================
const UI_THEME = {
  page: "#EAF8F5",
  surface: "#F7FCFB",
  card: "#FFFFFF",
  primary: "#176B63",
  primaryDark: "#0F5B54",
  mint: "#E8F7F4",
  mintStrong: "#CFE9E3",
  border: "#B8DDD5",
};

// ==========================================================================
//  REFERENCE DATA
// --------------------------------------------------------------------------
//  Static lookup tables that drive the whole app. In production each of these
//  becomes a MySQL table read through the Express API.
//  
//    SECTORS / STATES     -> dropdown options on the New Project form
//    APPROVAL_DB          -> the approval master list, keyed by sector.
//                            Each entry carries the issuing department, the
//                            documents required, the typical processing time,
//                            whether it can be filed in parallel, and which
//                            other approval it depends on (if any).
//    SCHEMES_DB           -> government incentive schemes + eligibility
//    DOC_VALIDATION_RULES -> regex patterns used by the OCR upload checker
// ==========================================================================
const SECTORS = ["Manufacturing", "IT/Software", "Food Processing", "Pharmaceuticals", "Textiles", "Renewable Energy", "Construction", "E-Commerce"];
const STATES = ["Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Delhi", "Uttar Pradesh", "Rajasthan", "Telangana"];

const APPROVAL_DB = {
  Manufacturing: [
    { id: "mfg-1", name: "Factory License", dept: "Dept. of Industrial Policy", docs: ["Application Form", "Site Plan", "NOC from Pollution Board", "Building Stability Certificate"], timeline: 30, status: "pending", parallel: false, dependency: null },
    { id: "mfg-2", name: "Pollution Control Board Consent", dept: "State PCB", docs: ["Environmental Impact Assessment", "Water Usage Plan", "Waste Management Plan"], timeline: 45, status: "not_started", parallel: true, dependency: null },
    { id: "mfg-3", name: "Fire Safety Certificate", dept: "Fire Department", docs: ["Fire Safety Plan", "Building Layout", "Equipment List"], timeline: 15, status: "not_started", parallel: true, dependency: null },
    { id: "mfg-4", name: "GST Registration", dept: "CBIC", docs: ["PAN Card", "Aadhaar", "Business Address Proof", "Bank Statement"], timeline: 7, status: "not_started", parallel: true, dependency: null },
    { id: "mfg-5", name: "MSME Registration (Udyam)", dept: "Ministry of MSME", docs: ["Aadhaar", "PAN", "Business Details"], timeline: 1, status: "not_started", parallel: true, dependency: null },
    { id: "mfg-6", name: "Operating Permission", dept: "District Industries Centre", docs: ["Factory License", "PCB Consent", "Fire Certificate"], timeline: 20, status: "not_started", parallel: false, dependency: "mfg-1" },
  ],
  "IT/Software": [
    { id: "it-1", name: "Company Registration (MCA)", dept: "Ministry of Corporate Affairs", docs: ["MOA", "AOA", "Director KYC", "Registered Office Proof"], timeline: 10, status: "pending", parallel: false, dependency: null },
    { id: "it-2", name: "GST Registration", dept: "CBIC", docs: ["PAN Card", "Aadhaar", "Business Address Proof", "Bank Statement"], timeline: 7, status: "not_started", parallel: true, dependency: null },
    { id: "it-3", name: "Professional Tax Registration", dept: "State Commercial Tax Dept.", docs: ["PAN", "Company Registration Certificate", "Employee List"], timeline: 14, status: "not_started", parallel: true, dependency: null },
    { id: "it-4", name: "STPI/SEZ Registration", dept: "STPI/SEZ Authority", docs: ["Company Registration", "Business Plan", "Export Projections"], timeline: 30, status: "not_started", parallel: false, dependency: "it-1" },
    { id: "it-5", name: "Data Protection Compliance", dept: "MeitY", docs: ["Privacy Policy", "Data Processing Agreement", "Security Audit Report"], timeline: 21, status: "not_started", parallel: true, dependency: null },
  ],
  "Food Processing": [
    { id: "fp-1", name: "FSSAI License", dept: "Food Safety Authority", docs: ["Application Form", "Food Safety Plan", "Lab Test Reports", "Site Layout"], timeline: 60, status: "pending", parallel: false, dependency: null },
    { id: "fp-2", name: "Factory License", dept: "Dept. of Industrial Policy", docs: ["Application Form", "Site Plan", "NOC from Pollution Board"], timeline: 30, status: "not_started", parallel: true, dependency: null },
    { id: "fp-3", name: "Pollution Control Board Consent", dept: "State PCB", docs: ["EIA Report", "Waste Management Plan", "Water Usage Plan"], timeline: 45, status: "not_started", parallel: true, dependency: null },
    { id: "fp-4", name: "GST Registration", dept: "CBIC", docs: ["PAN Card", "Aadhaar", "Address Proof", "Bank Statement"], timeline: 7, status: "not_started", parallel: true, dependency: null },
    { id: "fp-5", name: "Trade License", dept: "Municipal Corporation", docs: ["Identity Proof", "Address Proof", "NOC from Fire Dept"], timeline: 15, status: "not_started", parallel: true, dependency: null },
  ],
};

// Default to Manufacturing for sectors not in DB
const getApprovals = (sector) => APPROVAL_DB[sector] || APPROVAL_DB["Manufacturing"];

const SCHEMES_DB = [
  { id: "s1", name: "MSME Technology Upgrade Scheme", applyUrl: "https://msme.gov.in", portalName: "MSME Ministry portal", ministry: "Ministry of MSME", benefit: "Up to ₹15 Lakhs subsidy on technology upgrades", sectors: ["Manufacturing", "Food Processing", "Textiles"], eligibility: "MSME registered, turnover < ₹50 Cr" },
  { id: "s2", name: "Startup India Seed Fund", applyUrl: "https://seedfund.startupindia.gov.in", portalName: "Startup India Seed Fund portal", ministry: "DPIIT", benefit: "Up to ₹50 Lakhs for proof of concept", sectors: ["IT/Software", "E-Commerce", "Pharmaceuticals"], eligibility: "DPIIT recognized startup, < 2 years old" },
  { id: "s3", name: "PLI Scheme", applyUrl: "https://www.investindia.gov.in/production-linked-incentives-schemes-india", portalName: "Invest India PLI portal", ministry: "Ministry of Commerce", benefit: "4-6% incentive on incremental sales", sectors: ["Manufacturing", "Pharmaceuticals", "Renewable Energy"], eligibility: "Minimum investment threshold met" },
  { id: "s4", name: "PM Vishwakarma Yojana", applyUrl: "https://pmvishwakarma.gov.in", portalName: "PM Vishwakarma portal", ministry: "Ministry of MSME", benefit: "Collateral-free loan up to ₹3 Lakhs", sectors: ["Manufacturing", "Textiles", "Food Processing", "Construction"], eligibility: "Traditional artisans and craftspeople" },
  { id: "s5", name: "Stand-Up India", applyUrl: "https://www.standupmitra.in", portalName: "Stand-Up Mitra portal", ministry: "Ministry of Finance", benefit: "Loan ₹10 Lakhs to ₹1 Crore", sectors: ["Manufacturing", "IT/Software", "Food Processing", "E-Commerce", "Textiles", "Renewable Energy", "Construction", "Pharmaceuticals"], eligibility: "SC/ST/Women entrepreneurs" },
  { id: "s6", name: "Software Technology Parks Scheme", applyUrl: "https://www.stpi.in", portalName: "STPI portal", ministry: "MeitY", benefit: "100% FDI, duty-free imports, tax benefits", sectors: ["IT/Software"], eligibility: "Software export units" },
  { id: "s7", name: "Green Energy Subsidy", applyUrl: "https://pmsuryaghar.gov.in", portalName: "PM Surya Ghar portal", ministry: "MNRE", benefit: "Up to 40% subsidy on solar installations", sectors: ["Renewable Energy", "Manufacturing"], eligibility: "Units installing renewable energy systems" },
];

const DOC_VALIDATION_RULES = {
  "PAN Card": { format: "ABCDE1234F", regex: /^[A-Z]{5}[0-9]{4}[A-Z]$/, fields: ["PAN Number", "Name", "Date of Birth"] },
  "Aadhaar": { format: "1234 5678 9012", regex: /^\d{4}\s?\d{4}\s?\d{4}$/, fields: ["Aadhaar Number", "Name", "Address"] },
  "GST Certificate": { format: "22AAAAA0000A1Z5", regex: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, fields: ["GSTIN", "Legal Name", "Trade Name", "Registration Date"] },
};

const LANGUAGES = { hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu", bn: "Bengali", gu: "Gujarati", kn: "Kannada" };

const SAMPLE_TRANSLATIONS = {
  hi: { original: "कारखाना लाइसेंस आवेदन पत्र", translated: "Factory License Application Form" },
  mr: { original: "प्रदूषण नियंत्रण मंडळ संमती प्रमाणपत्र", translated: "Pollution Control Board Consent Certificate" },
  ta: { original: "தொழிற்சாலை அனுமதி விண்ணப்பம்", translated: "Factory Permission Application" },
};


// ==========================================================================
//  INTERNATIONALISATION (i18n)
// --------------------------------------------------------------------------
//  The whole interface can switch between English and Hindi at any time. The
//  toggle lives in the top-right corner and is present on every screen,
//  including the login and declaration pages, so a user who cannot read
//  English is never stuck on the first screen.
//
//  HOW IT WORKS
//    UI          -> flat key/value dictionary, one object per language
//    LangCtx     -> React context carrying { lang, setLang, t }
//    t(key, ...) -> looks up the key in the active language, falls back to
//                   English, then to the key itself. Supports {0} {1}
//                   placeholders so numbers can be injected without breaking
//                   Hindi word order.
//
//  WHAT IS AND IS NOT TRANSLATED
//    Translated     : every label, heading, button, tab, status, hint and
//                     notice the interface itself generates.
//    Not translated : real-world data — officer names, office addresses,
//                     department names, government scheme names, portal URLs
//                     and the OCR sample text. These are proper nouns and
//                     official records; translating them would make them
//                     wrong. A production build would carry an official Hindi
//                     name field alongside the English one in the database.
//
//  Adding a language is a matter of adding one more object to UI. Nothing in
//  the components needs to change.
// ==========================================================================

const UI = {
  en: {
    // — login —
    "login.tagline": "Industrial approvals, compliance and schemes in one place",
    "login.email": "Email", "login.emailPh": "you@company.com",
    "login.password": "Password", "login.passwordPh": "Any value works in this demo",
    "login.signInAs": "Sign in as",
    "login.roleOwner": "Business Owner", "login.roleOfficer": "Govt. Officer",
    "login.signIn": "Sign in", "login.signingIn": "Signing in...",
    "login.or": "or", "login.guest": "Skip and continue as guest",
    "login.noticeTitle": "Demo login.",
    "login.notice": "Nothing you type here is saved, sent anywhere, or checked. Any email and password will get you in. Refreshing the page signs you out.",

    // — declaration —
    "decl.title": "Declaration & Terms of Use",
    "decl.subtitle": "Please read before continuing",
    "decl.h1": "1. Nature of this platform",
    "decl.p1": "IndustrySaarthi is an assistive tool. It helps you identify, organise and track industrial approvals. It is not a government portal and it does not itself grant, issue, reject or process any approval. Every application is finally decided by the competent authority.",
    "decl.h2": "2. Accuracy of information",
    "decl.p2": "Approval lists, processing times, fee amounts, office addresses and officer details shown here are indicative and may change without notice. You are responsible for confirming current requirements with the concerned department before acting on anything shown in this application.",
    "decl.h3": "3. Document checks are format checks",
    "decl.p3": "The verification features check the structure, check digit and file quality of a document. They do not verify a document against government records. A document passing these checks may still be rejected by a department.",
    "decl.h4": "4. Truthfulness of what you submit",
    "decl.p4": "You declare that the information and documents you enter are true and belong to you or to an entity you are authorised to act for. Submitting false information to a government authority is an offence under applicable law.",
    "decl.h5": "5. Data handling in this prototype",
    "decl.p5": "This is a hackathon prototype. Data you enter stays in your browser's memory for the duration of the session and is discarded when you refresh or close the tab. Nothing is transmitted to a server. Do not enter real Aadhaar numbers or other sensitive identifiers.",
    "decl.checkbox": "I have read and understood the above, and I accept these terms.",
    "decl.mustAccept": "You must accept the declaration to continue.",
    "decl.accept": "Accept and continue",
    "decl.back": "Back to sign in",
    "decl.signedInAs": "Signed in as",

    // — chrome / nav —
    "nav.dashboard": "Dashboard", "nav.new": "New Project", "nav.roadmap": "Approval Roadmap",
    "nav.documents": "Document Check", "nav.schemes": "Schemes", "nav.translate": "Scan & Translate",
    "nav.signOut": "Sign out", "nav.brandSub": "Industrial Compliance",
    "hdr.search": "Search",
    "hdr.notifications": "Notifications", "hdr.settings": "Settings",
    "help.title": "Help & Support", "help.callUs": "CUSTOMER CARE",
    "help.askSahayak": "Ask Sahayak", "help.botHint": "Sahayak answers instantly, any time of day",
    "bot.name": "Sahayak", "bot.tagline": "Your approvals assistant",
    "bot.placeholder": "Ask about approvals, offices, documents...",
    "bot.send": "Send", "bot.close": "Close",
    "bot.disclaimer": "Sahayak answers from this app's own data. For anything else, call 1800-233-4455.",
    "lang.label": "Language", "lang.switchTo": "हिन्दी में देखें",

    // — status —
    "status.approved": "Approved", "status.pending": "In Progress", "status.rejected": "Rejected",
    "status.not_started": "Not Started", "status.issue": "Issue Found", "status.valid": "Valid",

    // — dashboard —
    "dash.title": "Dashboard", "dash.subtitle": "Overview of your approval journey",
    "dash.newProject": "New Project",
    "dash.totalApprovals": "Total Approvals", "dash.approved": "Approved",
    "dash.inProgress": "In Progress", "dash.nextDeadline": "Next Deadline",
    "dash.complete": "{0}% complete", "dash.awaiting": "Awaiting response", "dash.noPending": "No pending",
    "dash.noProjects": "No projects yet",
    "dash.noProjectsSub": "Register your first project to get a personalized approval roadmap",
    "dash.registerProject": "Register Project",
    "dash.progress": "Approval Progress", "dash.viewRoadmap": "View Roadmap",
    "dash.alerts": "Alerts", "dash.dueIn": "Due in {0} days",
    "dash.parallelTitle": "Parallel approvals available", "dash.parallelSub": "{0} can run simultaneously",
    "dash.officeTitle": "Office visits required",
    "dash.officeSub": "{0} approvals need an in-person visit — start them in the roadmap to book a slot",
    "dash.schemesTitle": "Schemes matched", "dash.schemesSub": "{0} government schemes found",
    "dash.soonest": "Soonest due {0}", "dash.inDays": "in {0} days",
    "dash.onlineCount": "{0} fully online",
    "dash.nothingDue": "Nothing due on {0}", "dash.upcoming": "UPCOMING DEADLINES",
    "dash.projectInfo": "Project Info", "dash.name": "Name", "dash.sector": "Sector",
    "dash.state": "State", "dash.estTime": "Est. Time", "dash.daysUnit": "days",

    // — new project —
    "np.back": "← Back to Dashboard", "np.title": "Register New Project",
    "np.subtitle": "Tell us about your business and we'll identify required approvals",
    "np.tab1": "Business Details", "np.tab2": "Review & Submit",
    "np.name": "Project / Business Name", "np.namePh": "e.g. GreenTech Pvt Ltd",
    "np.sector": "Industry Sector", "np.selectSector": "Select sector",
    "np.state": "State", "np.selectState": "Select state",
    "np.type": "Business Type", "np.size": "Enterprise Size",
    "np.continue": "Continue", "np.backBtn": "Back",
    "np.project": "Project",
    "np.aiTitle": "AI Analysis Complete",
    "np.identified": "Identified Approvals:",
    "np.create": "Create Project & View Roadmap",
    "np.parallel": "Parallel", "np.docsUnit": "documents",

    // — roadmap —
    "rm.title": "Approval Roadmap",
    "rm.legApproved": "Approved", "rm.legProgress": "In Progress",
    "rm.legNotStarted": "Not Started", "rm.legParallel": "Parallel",
    "rm.completeOf": "{0}/{1} complete",
    "rm.onlineCount": "{0} can be finished online",
    "rm.offlineCount": "{0} need an office visit",
    "rm.bookedCount": "{0} appointments booked",
    "rm.hint": "Press Start Application on any approval below to see whether it is online or needs a visit, along with the office address, the authority to meet, and slot booking.",
    "rm.phase1": "Phase 1 — Parallel Applications",
    "rm.phase2": "Phase 2 — Sequential / Dependent",
    "rm.phase1sub": "These approvals have no dependencies and can be applied for simultaneously, saving significant time.",
    "rm.parallel": "Parallel", "rm.daysApprox": "~{0} days", "rm.docsCount": "{0} documents",
    "rm.fullyOnline": "Fully online", "rm.officeNeeded": "Office visit needed", "rm.onlinePlusVisit": "Online + visit",
    "rm.slotBooked": "Slot booked", "rm.dependsOn": "Depends on {0}",
    "rm.docsRequired": "DOCUMENTS REQUIRED", "rm.checkDocs": "Check these documents", "rm.docPack": "View Complete Document Pack", "rm.docPackHint": "See visual examples, preparation guidance and the office-visit checklist.",
    "rm.docsHint": "Run these through Document Check before you apply — it catches unreadable scans, wrong number patterns and invalid check digits.",
    "rm.start": "Start Application", "rm.markApproved": "Mark Approved",
    "rm.hideDetails": "Hide details", "rm.showPortal": "Show portal link", "rm.showOffice": "Show office visit details",
    "rm.noProject": "No project selected",

    // — office visit panel —
    "ov.noVisit": "No office visit needed", "ov.openPortal": "Continue on official portal",
    "ov.fileFirst": "Step 1: File online first",
    "ov.visitRequired": "This one requires an office visit",
    "ov.onlineThenVisit": "File online, then visit the office",
    "ov.whereToGo": "WHERE TO GO", "ov.maps": "Open in Google Maps",
    "ov.head": "REGIONAL HEAD / AUTHORITY",
    "ov.steps": "WHAT TO DO, STEP BY STEP",
    "ov.carry": "DOCUMENTS TO CARRY", "ov.carrySub": "Bring originals plus one photocopy set of each",
    "ov.book": "BOOK YOUR APPOINTMENT", "ov.pickDate": "Pick a date", "ov.pickSlot": "Pick a time slot",
    "cal.selected": "Selected", "cal.window": "Processing window", "cal.event": "Event",
    "cal.urgent": "≤ 2 days", "cal.soon": "≤ 5 days", "cal.ok": "≤ 10 days", "cal.later": "Later",
    "cal.appt": "Appointment", "cal.deadlinesOn": "Deadlines · {0}", "cal.apptsOn": "Appointments · {0}",
    "ov.dateHint": "Bookable from tomorrow up to 45 days ahead.",
    "ov.slotsFull": "Struck-out slots are already full.",
    "ov.confirm": "Confirm appointment", "ov.booking": "Booking...",
    "ov.confirmed": "Appointment confirmed", "ov.meeting": "Meeting: {0}",
    "ov.fetching": "Application started. Channel details for this approval are being fetched from the department portal.",

    // — document check —
    "doc.title": "Document Check",
    "doc.subtitle": "Catch problems before you submit — unreadable scans, wrong number patterns, and invalid check digits",
    "doc.tabUpload": "Upload & Scan", "doc.tabUploadDesc": "OCR-based checks on an uploaded document",
    "doc.tabVerify": "Format Verification", "doc.tabVerifyDesc": "Check file, number pattern and check digit — no records lookup",

    // — format verification —
    "vf.scopeTitle": "Format verification only",
    "vf.scopeBody": "This checks whether the document is structurally well-formed — correct pattern, valid check digit, readable file, internally consistent. It does not confirm the document exists in government records. Doing that needs licensed access to the NSDL, UIDAI, GSTN and Udyam APIs, which sits outside this prototype. Everything reported below is provable from the document alone.",
    "vf.docType": "Document type", "vf.issuedBy": "issued by",
    "vf.upload": "Upload the document", "vf.uploadOpt": "(optional — enables file checks)",
    "vf.drop": "Drop the document here or click to browse",
    "vf.upTo": "up to", "vf.remove": "Remove",
    "vf.numberLabel": "{0} number as printed on the document",
    "vf.validSample": "Valid sample", "vf.brokenSample": "Broken sample",
    "vf.expected": "Expected shape: {0}",
    "vf.panPair": "PAN on the same entity",
    "vf.panPairOpt": "(optional — enables the consistency check)",
    "vf.panPairHint": "Characters 3-12 of a GSTIN are the holder's PAN, so the two can be checked against each other with no lookup.",
    "vf.check": "Check format", "vf.checking": "Checking format...",
    "vf.invalid": "Format invalid — {0} problems to fix",
    "vf.validWarn": "Format valid, with points to review",
    "vf.allValid": "Format valid on every check",
    "vf.tally": "{0} passed · {1} warnings · {2} errors",
    "vf.afterNote": "A valid format means the document is well-formed and worth submitting. It is not proof that the number is registered — that check happens at the department.",
    "vf.g1": "1. File format", "vf.g1sub": "Type, size and resolution against what portals accept",
    "vf.g2": "2. Number structure", "vf.g2sub": "Against the pattern published by the {0}",
    "vf.g3": "3. Check digit", "vf.g3sub": "Pure arithmetic on the number itself — catches typos and fabricated numbers",
    "vf.g4": "4. Internal consistency", "vf.g4sub": "Whether the numbers on the document agree with each other",

    // — upload & scan —
    "up.title": "Upload & Validate Document", "up.docType": "Document Type",
    "up.docNumber": "Document Number (for validation)", "up.upload": "Upload & Validate",
    "up.ocrFields": "OCR will check for these fields:",
    "up.results": "Validation Results", "up.uploading": "Uploading document...",
    "up.validating": "Running OCR & AI validation...",
    "up.allPassed": "All checks passed. Document is ready for submission.",
    "up.uploadedAt": "Uploaded at",

    // — schemes —
    "sc.title": "Government Schemes", "sc.subtitle": "Matched to your {0} project",
    "sc.banner": "{0} schemes match your project profile. Review eligibility and apply directly.",
    "sc.matched": "Matched", "sc.benefit": "BENEFIT", "sc.eligibility": "ELIGIBILITY",
    "sc.sectors": "APPLICABLE SECTORS", "sc.apply": "Check Eligibility & Apply",
    "sc.opens": "Opens the official {0}",
    "sc.other": "Other Available Schemes", "sc.notMatching": "Not matching",

    // — scan & translate —
    "tr.title": "Scan & Translate",
    "tr.subtitle": "Upload a document image — we'll translate it and check if everything is correct",
    "tr.selectMode": "Select this mode",
    "tr.mFilled": "Filled Document / Form",
    "tr.mFilledDesc": "Upload a filled form in any local language. We'll translate every field to English, show you what's filled, and flag what's wrong or missing.",
    "tr.mBlank": "Blank / Unfilled Form",
    "tr.mBlankDesc": "Upload an unfilled English form. We'll translate all labels, instructions, and sections into your chosen language so you know exactly what to fill.",
    "tr.mText": "Type & Translate",
    "tr.mTextDesc": "No document needed. Type in English and read it in your language, or type in your language and read it in English. Works both ways — useful when you're standing at the counter and need to ask something.",
    "tr.textTitle": "Type & Translate", "tr.textSub": "Type in either language and read it in the other",
    "tr.yourLang": "Your language", "tr.direction": "Direction",
    "tr.from": "FROM", "tr.to": "TO",
    "tr.swapHint": "Press the swap button to reverse. Your last result carries over as the new input.",
    "tr.typeIn": "Type in {0}", "tr.translateTo": "Translate to {0}", "tr.translating": "Translating...",
    "tr.clear": "Clear", "tr.fullTranslation": "Full translation", "tr.partial": "Partial — key terms only",
    "tr.termsFound": "TERMS RECOGNISED",
    "tr.common": "Common phrases",
    "tr.commonSub": "Tap any phrase to translate it instantly. These are the questions people actually ask at an approvals counter.",
    "tr.filledTitle": "Check Filled Document",
    "tr.filledSub": "Upload a filled form in a local language → translated → each field validated",
    "tr.blankTitle": "Translate Blank Form",
    "tr.blankSub": "Upload an unfilled English form → choose a language → get a fully translated version",
    "tr.scenarios": "Demo scenarios", "tr.useDemo": "Use demo document →", "tr.useDemoBlank": "Use demo blank form →",
    "tr.dropFilled": "Drop filled document image here or click to browse",
    "tr.dropBlank": "Drop blank form image here or click to browse",
    "tr.scanValidate": "Scan, Translate & Validate", "tr.scanTranslate": "Scan & Translate Form",
    "tr.reset": "Reset", "tr.processing": "Processing",
    "tr.translateInto": "Translate form into", "tr.willTranslate": "Will translate to:",
    "tr.fieldReview": "Field-by-Field Review",
    "tr.fieldReviewSub": "Each field from your document — original, translated, and what to fix",
    "tr.original": "ORIGINAL", "tr.translated": "TRANSLATED",
    "tr.fixNeeded": "Fix needed:",
    "tr.fullDoc": "Full Document — Original & Translation",
    "tr.english": "ENGLISH TRANSLATION",
    "tr.sideBySide": "Side-by-Side: English → {0}",
    "tr.formTranslated": "Form translated to {0}",
    "tr.howToUse": "How to use:",
    "tr.howToUseBody": "Print or save the translated version. Each field label maps to the English original on the left. Fill the official English form using the translated version as your guide.",

    // — government officer portal —
    "gov.portal":"Government Officer Portal","gov.goodMorning":"Good morning, {0}","gov.dashboardSub":"Review applications, verify submitted documents and manage today's appointments.","gov.division":"Nashik Division","gov.industrialApprovals":"Industrial Approvals",
    "gov.pending":"Pending Approvals","gov.awaitingAction":"Awaiting officer action","gov.todayAppointments":"Today's Appointments","gov.scheduledToday":"Scheduled for today","gov.priorityCases":"Priority Cases","gov.processedWeek":"Processed This Week","gov.applicationsCompleted":"Applications completed",
    "gov.approvalQueue":"Approval Queue","gov.openCase":"Open a case to inspect documents and take action","gov.viewAll":"View all","gov.allProcessed":"All assigned applications have been processed.","gov.days":"days","gov.inQueue":"in queue","gov.reviewCase":"Review case","gov.openSchedule":"Open full appointment schedule →",
    "gov.reviewDocuments":"Review Documents","gov.reviewDocumentsSub":"Open pending applications and verify submitted files","gov.slaWatchlist":"SLA Watchlist","gov.slaWatchlistSub":"Applications approaching processing limits","gov.translateDocuments":"Translate Documents","gov.translateDocumentsSub":"Translate applicant forms and official communication",
    "gov.pendingTitle":"Pending Approvals","gov.pendingSub":"Open an application to review the business owner's submitted document checklist and approve or decline the request.","gov.pendingCount":"{0} pending","gov.noPending":"No pending approvals.","gov.reviewDocumentsBtn":"Review documents",
    "gov.applicationReview":"Application Review","gov.status":"Status","gov.priority":"Priority","gov.submittedDocuments":"Submitted Documents","gov.checklistSub":"Checklist submitted by the business owner","gov.verified":"verified","gov.awaitingReview":"{0} document(s) still awaiting review.","gov.decline":"Decline Request","gov.approve":"Approve Request","gov.approveQuestion":"Approve this request?","gov.declineQuestion":"Decline this request?","gov.updateNotice":"This will update {0} in the officer's queue for this demo session.","gov.cancel":"Cancel","gov.yesApprove":"Yes, Approve","gov.yesDecline":"Yes, Decline",
    "gov.appointmentsTitle":"Today's Appointments","gov.reportsTitle":"Department Reports","gov.reportsSub":"A quick operational view for today's workload.","gov.weeklySummary":"Weekly Processing Summary","gov.approval":"Approval","gov.received":"Received","gov.processed":"Processed","gov.avgTime":"Avg. Time","gov.urgent":"Urgent","gov.high":"High","gov.pendingReview":"Pending Review","gov.scheduled":"Scheduled",
    // — shared —
    "common.days": "days", "common.back": "Back",
  },

  hi: {
    // — login —
    "login.tagline": "औद्योगिक अनुमतियाँ, अनुपालन और योजनाएँ — एक ही जगह",
    "login.email": "ईमेल", "login.emailPh": "you@company.com",
    "login.password": "पासवर्ड", "login.passwordPh": "इस डेमो में कोई भी मान चलेगा",
    "login.signInAs": "किस रूप में साइन इन करें",
    "login.roleOwner": "व्यवसाय स्वामी", "login.roleOfficer": "सरकारी अधिकारी",
    "login.signIn": "साइन इन करें", "login.signingIn": "साइन इन हो रहा है...",
    "login.or": "अथवा", "login.guest": "छोड़ें और अतिथि के रूप में आगे बढ़ें",
    "login.noticeTitle": "डेमो लॉगिन।",
    "login.notice": "यहाँ लिखी गई कोई भी जानकारी सहेजी नहीं जाती, कहीं भेजी नहीं जाती और जाँची नहीं जाती। कोई भी ईमेल और पासवर्ड काम करेगा। पेज रीफ्रेश करने पर आप साइन आउट हो जाएँगे।",

    // — declaration —
    "decl.title": "घोषणा एवं उपयोग की शर्तें",
    "decl.subtitle": "आगे बढ़ने से पहले कृपया पढ़ें",
    "decl.h1": "1. इस मंच की प्रकृति",
    "decl.p1": "IndustrySaarthi एक सहायक साधन है। यह आपको औद्योगिक अनुमतियाँ पहचानने, व्यवस्थित करने और उन पर नज़र रखने में मदद करता है। यह कोई सरकारी पोर्टल नहीं है और यह स्वयं किसी अनुमति को जारी, अस्वीकृत या संसाधित नहीं करता। हर आवेदन पर अंतिम निर्णय सक्षम प्राधिकारी ही लेता है।",
    "decl.h2": "2. जानकारी की सटीकता",
    "decl.p2": "यहाँ दिखाई गई अनुमतियों की सूची, प्रक्रिया अवधि, शुल्क, कार्यालय पते और अधिकारियों का विवरण केवल संकेतात्मक है और बिना सूचना के बदल सकता है। इस ऐप में दिखाई गई किसी भी बात पर कार्य करने से पहले संबंधित विभाग से वर्तमान आवश्यकताओं की पुष्टि करने की ज़िम्मेदारी आपकी है।",
    "decl.h3": "3. दस्तावेज़ जाँच केवल प्रारूप की जाँच है",
    "decl.p3": "सत्यापन सुविधाएँ दस्तावेज़ की संरचना, जाँच अंक और फ़ाइल गुणवत्ता की जाँच करती हैं। ये दस्तावेज़ का सरकारी अभिलेखों से मिलान नहीं करतीं। इन जाँचों में उत्तीर्ण दस्तावेज़ भी विभाग द्वारा अस्वीकृत किया जा सकता है।",
    "decl.h4": "4. प्रस्तुत जानकारी की सत्यता",
    "decl.p4": "आप घोषित करते हैं कि आपके द्वारा दर्ज जानकारी और दस्तावेज़ सत्य हैं तथा आपके हैं या उस संस्था के हैं जिसकी ओर से कार्य करने के लिए आप अधिकृत हैं। सरकारी प्राधिकारी को झूठी जानकारी देना लागू कानून के अंतर्गत दंडनीय अपराध है।",
    "decl.h5": "5. इस प्रोटोटाइप में डेटा का प्रबंधन",
    "decl.p5": "यह एक हैकाथॉन प्रोटोटाइप है। आपके द्वारा दर्ज डेटा केवल सत्र की अवधि तक आपके ब्राउज़र की मेमोरी में रहता है और टैब रीफ्रेश या बंद करने पर मिट जाता है। कुछ भी सर्वर पर नहीं भेजा जाता। कृपया वास्तविक आधार संख्या या अन्य संवेदनशील पहचानकर्ता दर्ज न करें।",
    "decl.checkbox": "मैंने उपरोक्त पढ़ और समझ लिया है, और मैं इन शर्तों को स्वीकार करता/करती हूँ।",
    "decl.mustAccept": "आगे बढ़ने के लिए घोषणा स्वीकार करना आवश्यक है।",
    "decl.accept": "स्वीकार करें और आगे बढ़ें",
    "decl.back": "साइन इन पर वापस जाएँ",
    "decl.signedInAs": "साइन इन किया गया",

    // — chrome / nav —
    "nav.dashboard": "डैशबोर्ड", "nav.new": "नई परियोजना", "nav.roadmap": "अनुमति रोडमैप",
    "nav.documents": "दस्तावेज़ जाँच", "nav.schemes": "योजनाएँ", "nav.translate": "स्कैन और अनुवाद",
    "nav.signOut": "साइन आउट", "nav.brandSub": "औद्योगिक अनुपालन",
    "hdr.search": "खोजें",
    "hdr.notifications": "सूचनाएँ", "hdr.settings": "सेटिंग्स",
    "help.title": "सहायता एवं समर्थन", "help.callUs": "ग्राहक सेवा",
    "help.askSahayak": "सहायक से पूछें", "help.botHint": "सहायक किसी भी समय तुरंत उत्तर देता है",
    "bot.name": "सहायक", "bot.tagline": "आपका अनुमति सहायक",
    "bot.placeholder": "अनुमति, कार्यालय, दस्तावेज़ के बारे में पूछें...",
    "bot.send": "भेजें", "bot.close": "बंद करें",
    "bot.disclaimer": "सहायक इसी ऐप की जानकारी से उत्तर देता है। अन्य किसी बात के लिए 1800-233-4455 पर कॉल करें।",
    "lang.label": "भाषा", "lang.switchTo": "View in English",

    // — status —
    "status.approved": "स्वीकृत", "status.pending": "प्रक्रियाधीन", "status.rejected": "अस्वीकृत",
    "status.not_started": "शुरू नहीं हुआ", "status.issue": "समस्या मिली", "status.valid": "वैध",

    // — dashboard —
    "dash.title": "डैशबोर्ड", "dash.subtitle": "आपकी अनुमति यात्रा का विवरण",
    "dash.newProject": "नई परियोजना",
    "dash.totalApprovals": "कुल अनुमतियाँ", "dash.approved": "स्वीकृत",
    "dash.inProgress": "प्रक्रियाधीन", "dash.nextDeadline": "अगली समय-सीमा",
    "dash.complete": "{0}% पूर्ण", "dash.awaiting": "उत्तर की प्रतीक्षा", "dash.noPending": "कोई लंबित नहीं",
    "dash.noProjects": "अभी कोई परियोजना नहीं",
    "dash.noProjectsSub": "व्यक्तिगत अनुमति रोडमैप पाने के लिए अपनी पहली परियोजना पंजीकृत करें",
    "dash.registerProject": "परियोजना पंजीकृत करें",
    "dash.progress": "अनुमति प्रगति", "dash.viewRoadmap": "रोडमैप देखें",
    "dash.alerts": "सूचनाएँ", "dash.dueIn": "{0} दिनों में देय",
    "dash.parallelTitle": "समानांतर अनुमतियाँ उपलब्ध", "dash.parallelSub": "{0} एक साथ चलाई जा सकती हैं",
    "dash.officeTitle": "कार्यालय जाना आवश्यक",
    "dash.officeSub": "{0} अनुमतियों के लिए स्वयं उपस्थित होना होगा — समय बुक करने हेतु रोडमैप में शुरू करें",
    "dash.schemesTitle": "मिलती-जुलती योजनाएँ", "dash.schemesSub": "{0} सरकारी योजनाएँ मिलीं",
    "dash.soonest": "सबसे निकट देय {0}", "dash.inDays": "{0} दिनों में",
    "dash.onlineCount": "{0} पूर्णतः ऑनलाइन",
    "dash.nothingDue": "{0} को कुछ भी देय नहीं", "dash.upcoming": "आगामी समय-सीमाएँ",
    "dash.projectInfo": "परियोजना विवरण", "dash.name": "नाम", "dash.sector": "क्षेत्र",
    "dash.state": "राज्य", "dash.estTime": "अनुमानित समय", "dash.daysUnit": "दिन",

    // — new project —
    "np.back": "← डैशबोर्ड पर वापस", "np.title": "नई परियोजना पंजीकृत करें",
    "np.subtitle": "अपने व्यवसाय के बारे में बताएँ, हम आवश्यक अनुमतियाँ पहचान लेंगे",
    "np.tab1": "व्यवसाय विवरण", "np.tab2": "समीक्षा और प्रस्तुत करें",
    "np.name": "परियोजना / व्यवसाय का नाम", "np.namePh": "उदा. GreenTech Pvt Ltd",
    "np.sector": "उद्योग क्षेत्र", "np.selectSector": "क्षेत्र चुनें",
    "np.state": "राज्य", "np.selectState": "राज्य चुनें",
    "np.type": "व्यवसाय का प्रकार", "np.size": "उद्यम का आकार",
    "np.continue": "आगे बढ़ें", "np.backBtn": "पीछे",
    "np.project": "परियोजना",
    "np.aiTitle": "एआई विश्लेषण पूर्ण",
    "np.identified": "पहचानी गई अनुमतियाँ:",
    "np.create": "परियोजना बनाएँ और रोडमैप देखें",
    "np.parallel": "समानांतर", "np.docsUnit": "दस्तावेज़",

    // — roadmap —
    "rm.title": "अनुमति रोडमैप",
    "rm.legApproved": "स्वीकृत", "rm.legProgress": "प्रक्रियाधीन",
    "rm.legNotStarted": "शुरू नहीं हुआ", "rm.legParallel": "समानांतर",
    "rm.completeOf": "{1} में से {0} पूर्ण",
    "rm.onlineCount": "{0} ऑनलाइन पूरी की जा सकती हैं",
    "rm.offlineCount": "{0} के लिए कार्यालय जाना होगा",
    "rm.bookedCount": "{0} समय बुक किए गए",
    "rm.hint": "नीचे किसी भी अनुमति पर 'आवेदन शुरू करें' दबाएँ — पता चलेगा कि वह ऑनलाइन है या कार्यालय जाना होगा, साथ ही कार्यालय का पता, मिलने वाले अधिकारी और समय बुकिंग भी दिखेगी।",
    "rm.phase1": "चरण 1 — समानांतर आवेदन",
    "rm.phase2": "चरण 2 — क्रमिक / आश्रित",
    "rm.phase1sub": "इन अनुमतियों की कोई पूर्व-शर्त नहीं है और इन्हें एक साथ लगाया जा सकता है, जिससे काफ़ी समय बचता है।",
    "rm.parallel": "समानांतर", "rm.daysApprox": "लगभग {0} दिन", "rm.docsCount": "{0} दस्तावेज़",
    "rm.fullyOnline": "पूर्णतः ऑनलाइन", "rm.officeNeeded": "कार्यालय जाना आवश्यक", "rm.onlinePlusVisit": "ऑनलाइन + कार्यालय",
    "rm.slotBooked": "समय बुक हुआ", "rm.dependsOn": "{0} पर निर्भर",
    "rm.docsRequired": "आवश्यक दस्तावेज़", "rm.checkDocs": "इन दस्तावेज़ों की जाँच करें", "rm.docPack": "पूरा दस्तावेज़ पैक देखें", "rm.docPackHint": "दृश्य उदाहरण, तैयारी मार्गदर्शन और कार्यालय-भ्रमण चेकलिस्ट देखें।",
    "rm.docsHint": "आवेदन से पहले इन्हें दस्तावेज़ जाँच से गुज़ारें — इससे अपठनीय स्कैन, ग़लत संख्या प्रारूप और अमान्य जाँच अंक पकड़े जाते हैं।",
    "rm.start": "आवेदन शुरू करें", "rm.markApproved": "स्वीकृत चिह्नित करें",
    "rm.hideDetails": "विवरण छिपाएँ", "rm.showPortal": "पोर्टल लिंक देखें", "rm.showOffice": "कार्यालय भ्रमण विवरण देखें",
    "rm.noProject": "कोई परियोजना चयनित नहीं",

    // — office visit panel —
    "ov.noVisit": "कार्यालय जाने की आवश्यकता नहीं", "ov.openPortal": "आधिकारिक पोर्टल पर जारी रखें",
    "ov.fileFirst": "चरण 1: पहले ऑनलाइन आवेदन करें",
    "ov.visitRequired": "इसके लिए कार्यालय जाना आवश्यक है",
    "ov.onlineThenVisit": "पहले ऑनलाइन आवेदन, फिर कार्यालय भ्रमण",
    "ov.whereToGo": "कहाँ जाना है", "ov.maps": "गूगल मैप्स में खोलें",
    "ov.head": "क्षेत्रीय प्रमुख / प्राधिकारी",
    "ov.steps": "क्या करना है, चरण दर चरण",
    "ov.carry": "साथ ले जाने वाले दस्तावेज़", "ov.carrySub": "मूल प्रतियाँ तथा प्रत्येक की एक छायाप्रति साथ लाएँ",
    "ov.book": "अपना समय बुक करें", "ov.pickDate": "तिथि चुनें", "ov.pickSlot": "समय चुनें",
    "cal.selected": "चयनित", "cal.window": "प्रक्रिया अवधि", "cal.event": "कार्यक्रम",
    "cal.urgent": "2 दिन या कम", "cal.soon": "5 दिन या कम", "cal.ok": "10 दिन या कम", "cal.later": "बाद में",
    "cal.appt": "अपॉइंटमेंट", "cal.deadlinesOn": "समय-सीमाएँ · {0}", "cal.apptsOn": "अपॉइंटमेंट · {0}",
    "ov.dateHint": "कल से लेकर 45 दिन आगे तक बुक किया जा सकता है।",
    "ov.slotsFull": "काटे गए समय पहले ही भर चुके हैं।",
    "ov.confirm": "समय की पुष्टि करें", "ov.booking": "बुक हो रहा है...",
    "ov.confirmed": "समय की पुष्टि हो गई", "ov.meeting": "मुलाक़ात: {0}",
    "ov.fetching": "आवेदन शुरू हो गया। इस अनुमति का विवरण विभागीय पोर्टल से लिया जा रहा है।",

    // — document check —
    "doc.title": "दस्तावेज़ जाँच",
    "doc.subtitle": "जमा करने से पहले समस्याएँ पकड़ें — अपठनीय स्कैन, ग़लत संख्या प्रारूप और अमान्य जाँच अंक",
    "doc.tabUpload": "अपलोड और स्कैन", "doc.tabUploadDesc": "अपलोड किए गए दस्तावेज़ पर ओसीआर आधारित जाँच",
    "doc.tabVerify": "प्रारूप सत्यापन", "doc.tabVerifyDesc": "फ़ाइल, संख्या प्रारूप और जाँच अंक की जाँच — अभिलेख मिलान नहीं",

    // — format verification —
    "vf.scopeTitle": "केवल प्रारूप सत्यापन",
    "vf.scopeBody": "यह जाँचता है कि दस्तावेज़ संरचनात्मक रूप से सही है या नहीं — सही प्रारूप, वैध जाँच अंक, पठनीय फ़ाइल, आंतरिक संगति। यह पुष्टि नहीं करता कि दस्तावेज़ सरकारी अभिलेखों में मौजूद है। उसके लिए NSDL, UIDAI, GSTN और उद्यम एपीआई तक लाइसेंस प्राप्त पहुँच चाहिए, जो इस प्रोटोटाइप के दायरे से बाहर है। नीचे बताई गई हर बात केवल दस्तावेज़ से ही सिद्ध होती है।",
    "vf.docType": "दस्तावेज़ का प्रकार", "vf.issuedBy": "जारीकर्ता",
    "vf.upload": "दस्तावेज़ अपलोड करें", "vf.uploadOpt": "(वैकल्पिक — फ़ाइल जाँच सक्षम करता है)",
    "vf.drop": "दस्तावेज़ यहाँ छोड़ें या चुनने के लिए क्लिक करें",
    "vf.upTo": "अधिकतम", "vf.remove": "हटाएँ",
    "vf.numberLabel": "दस्तावेज़ पर छपी {0} संख्या",
    "vf.validSample": "वैध नमूना", "vf.brokenSample": "त्रुटिपूर्ण नमूना",
    "vf.expected": "अपेक्षित प्रारूप: {0}",
    "vf.panPair": "उसी संस्था का पैन",
    "vf.panPairOpt": "(वैकल्पिक — संगति जाँच सक्षम करता है)",
    "vf.panPairHint": "जीएसटीआईएन के अक्षर 3-12 धारक का पैन होते हैं, इसलिए दोनों की आपस में जाँच बिना किसी अभिलेख के की जा सकती है।",
    "vf.check": "प्रारूप जाँचें", "vf.checking": "प्रारूप जाँचा जा रहा है...",
    "vf.invalid": "प्रारूप अमान्य — {0} समस्याएँ ठीक करनी होंगी",
    "vf.validWarn": "प्रारूप वैध, कुछ बिंदु देखने योग्य",
    "vf.allValid": "हर जाँच में प्रारूप वैध",
    "vf.tally": "{0} उत्तीर्ण · {1} चेतावनी · {2} त्रुटियाँ",
    "vf.afterNote": "वैध प्रारूप का अर्थ है कि दस्तावेज़ सही बना है और जमा करने योग्य है। यह प्रमाण नहीं है कि संख्या पंजीकृत है — वह जाँच विभाग में होती है।",
    "vf.g1": "1. फ़ाइल प्रारूप", "vf.g1sub": "पोर्टल जो स्वीकार करते हैं उसके अनुसार प्रकार, आकार और रिज़ॉल्यूशन",
    "vf.g2": "2. संख्या संरचना", "vf.g2sub": "{0} द्वारा प्रकाशित प्रारूप के अनुसार",
    "vf.g3": "3. जाँच अंक", "vf.g3sub": "संख्या पर शुद्ध गणित — टाइपिंग की ग़लतियाँ और गढ़ी गई संख्याएँ पकड़ता है",
    "vf.g4": "4. आंतरिक संगति", "vf.g4sub": "क्या दस्तावेज़ की संख्याएँ आपस में मेल खाती हैं",

    // — upload & scan —
    "up.title": "दस्तावेज़ अपलोड और सत्यापन", "up.docType": "दस्तावेज़ का प्रकार",
    "up.docNumber": "दस्तावेज़ संख्या (सत्यापन हेतु)", "up.upload": "अपलोड और सत्यापन",
    "up.ocrFields": "ओसीआर इन क्षेत्रों की जाँच करेगा:",
    "up.results": "सत्यापन परिणाम", "up.uploading": "दस्तावेज़ अपलोड हो रहा है...",
    "up.validating": "ओसीआर और एआई सत्यापन चल रहा है...",
    "up.allPassed": "सभी जाँच उत्तीर्ण। दस्तावेज़ जमा करने के लिए तैयार है।",
    "up.uploadedAt": "अपलोड समय",

    // — schemes —
    "sc.title": "सरकारी योजनाएँ", "sc.subtitle": "आपकी {0} परियोजना से मेल खाती हैं",
    "sc.banner": "{0} योजनाएँ आपकी परियोजना से मेल खाती हैं। पात्रता देखें और सीधे आवेदन करें।",
    "sc.matched": "मेल खाती", "sc.benefit": "लाभ", "sc.eligibility": "पात्रता",
    "sc.sectors": "लागू क्षेत्र", "sc.apply": "पात्रता जाँचें और आवेदन करें",
    "sc.opens": "आधिकारिक {0} खोलता है",
    "sc.other": "अन्य उपलब्ध योजनाएँ", "sc.notMatching": "मेल नहीं खाती",

    // — scan & translate —
    "tr.title": "स्कैन और अनुवाद",
    "tr.subtitle": "दस्तावेज़ की छवि अपलोड करें — हम उसका अनुवाद करेंगे और जाँचेंगे कि सब कुछ सही है या नहीं",
    "tr.selectMode": "यह विकल्प चुनें",
    "tr.mFilled": "भरा हुआ दस्तावेज़ / फ़ॉर्म",
    "tr.mFilledDesc": "किसी भी स्थानीय भाषा में भरा हुआ फ़ॉर्म अपलोड करें। हम हर क्षेत्र का अंग्रेज़ी में अनुवाद करेंगे, भरी गई जानकारी दिखाएँगे, और जो ग़लत या छूटा हुआ है उसे चिह्नित करेंगे।",
    "tr.mBlank": "ख़ाली / अभरा फ़ॉर्म",
    "tr.mBlankDesc": "अंग्रेज़ी का ख़ाली फ़ॉर्म अपलोड करें। हम सभी लेबल, निर्देश और अनुभाग आपकी चुनी हुई भाषा में अनुवाद कर देंगे ताकि आपको ठीक-ठीक पता हो कि क्या भरना है।",
    "tr.mText": "लिखें और अनुवाद करें",
    "tr.mTextDesc": "किसी दस्तावेज़ की ज़रूरत नहीं। अंग्रेज़ी में लिखें और अपनी भाषा में पढ़ें, या अपनी भाषा में लिखें और अंग्रेज़ी में पढ़ें। दोनों दिशाओं में काम करता है — काउंटर पर खड़े होकर कुछ पूछना हो तो बहुत उपयोगी।",
    "tr.textTitle": "लिखें और अनुवाद करें", "tr.textSub": "किसी भी भाषा में लिखें और दूसरी में पढ़ें",
    "tr.yourLang": "आपकी भाषा", "tr.direction": "दिशा",
    "tr.from": "से", "tr.to": "में",
    "tr.swapHint": "दिशा बदलने के लिए अदला-बदली बटन दबाएँ। आपका पिछला परिणाम नए इनपुट के रूप में आ जाएगा।",
    "tr.typeIn": "{0} में लिखें", "tr.translateTo": "{0} में अनुवाद करें", "tr.translating": "अनुवाद हो रहा है...",
    "tr.clear": "साफ़ करें", "tr.fullTranslation": "पूर्ण अनुवाद", "tr.partial": "आंशिक — केवल मुख्य शब्द",
    "tr.termsFound": "पहचाने गए शब्द",
    "tr.common": "सामान्य वाक्य",
    "tr.commonSub": "तुरंत अनुवाद के लिए किसी भी वाक्य पर टैप करें। ये वही प्रश्न हैं जो लोग अनुमति काउंटर पर वास्तव में पूछते हैं।",
    "tr.filledTitle": "भरे हुए दस्तावेज़ की जाँच",
    "tr.filledSub": "स्थानीय भाषा में भरा फ़ॉर्म अपलोड करें → अनुवाद → हर क्षेत्र की जाँच",
    "tr.blankTitle": "ख़ाली फ़ॉर्म का अनुवाद",
    "tr.blankSub": "अंग्रेज़ी का ख़ाली फ़ॉर्म अपलोड करें → भाषा चुनें → पूरा अनूदित संस्करण पाएँ",
    "tr.scenarios": "डेमो परिदृश्य", "tr.useDemo": "डेमो दस्तावेज़ उपयोग करें →", "tr.useDemoBlank": "डेमो ख़ाली फ़ॉर्म उपयोग करें →",
    "tr.dropFilled": "भरे हुए दस्तावेज़ की छवि यहाँ छोड़ें या क्लिक करें",
    "tr.dropBlank": "ख़ाली फ़ॉर्म की छवि यहाँ छोड़ें या क्लिक करें",
    "tr.scanValidate": "स्कैन, अनुवाद और सत्यापन", "tr.scanTranslate": "फ़ॉर्म स्कैन और अनुवाद करें",
    "tr.reset": "रीसेट", "tr.processing": "प्रक्रिया जारी",
    "tr.translateInto": "फ़ॉर्म का अनुवाद करें", "tr.willTranslate": "अनुवाद होगा:",
    "tr.fieldReview": "क्षेत्रवार समीक्षा",
    "tr.fieldReviewSub": "आपके दस्तावेज़ का हर क्षेत्र — मूल, अनूदित, और क्या ठीक करना है",
    "tr.original": "मूल", "tr.translated": "अनूदित",
    "tr.fixNeeded": "सुधार आवश्यक:",
    "tr.fullDoc": "पूरा दस्तावेज़ — मूल और अनुवाद",
    "tr.english": "अंग्रेज़ी अनुवाद",
    "tr.sideBySide": "आमने-सामने: अंग्रेज़ी → {0}",
    "tr.formTranslated": "फ़ॉर्म का {0} में अनुवाद हुआ",
    "tr.howToUse": "उपयोग कैसे करें:",
    "tr.howToUseBody": "अनूदित संस्करण छापें या सहेजें। हर क्षेत्र का लेबल बाईं ओर के अंग्रेज़ी मूल से मेल खाता है। अनूदित संस्करण को मार्गदर्शक बनाकर आधिकारिक अंग्रेज़ी फ़ॉर्म भरें।",

    // — government officer portal —
    "gov.portal":"सरकारी अधिकारी पोर्टल","gov.goodMorning":"सुप्रभात, {0}","gov.dashboardSub":"आवेदनों की समीक्षा करें, जमा किए गए दस्तावेज़ सत्यापित करें और आज की नियुक्तियाँ प्रबंधित करें।","gov.division":"नासिक संभाग","gov.industrialApprovals":"औद्योगिक अनुमतियाँ",
    "gov.pending":"लंबित अनुमतियाँ","gov.awaitingAction":"अधिकारी की कार्रवाई की प्रतीक्षा","gov.todayAppointments":"आज की नियुक्तियाँ","gov.scheduledToday":"आज के लिए निर्धारित","gov.priorityCases":"प्राथमिकता वाले मामले","gov.processedWeek":"इस सप्ताह निपटाए गए","gov.applicationsCompleted":"पूरे किए गए आवेदन",
    "gov.approvalQueue":"अनुमति कतार","gov.openCase":"दस्तावेज़ देखने और कार्रवाई करने के लिए मामला खोलें","gov.viewAll":"सभी देखें","gov.allProcessed":"सभी आवंटित आवेदनों पर कार्रवाई हो चुकी है।","gov.days":"दिन","gov.inQueue":"कतार में","gov.reviewCase":"मामले की समीक्षा","gov.openSchedule":"पूरी नियुक्ति सूची खोलें →",
    "gov.reviewDocuments":"दस्तावेज़ों की समीक्षा","gov.reviewDocumentsSub":"लंबित आवेदन खोलें और जमा की गई फाइलें सत्यापित करें","gov.slaWatchlist":"SLA निगरानी सूची","gov.slaWatchlistSub":"प्रसंस्करण सीमा के करीब पहुँच रहे आवेदन","gov.translateDocuments":"दस्तावेज़ अनुवाद","gov.translateDocumentsSub":"आवेदक के फ़ॉर्म और आधिकारिक संचार का अनुवाद करें",
    "gov.pendingTitle":"लंबित अनुमतियाँ","gov.pendingSub":"व्यवसाय स्वामी द्वारा जमा किए गए दस्तावेज़ों की सूची की समीक्षा करने और अनुरोध को स्वीकृत या अस्वीकार करने के लिए आवेदन खोलें।","gov.pendingCount":"{0} लंबित","gov.noPending":"कोई लंबित अनुमति नहीं है।","gov.reviewDocumentsBtn":"दस्तावेज़ों की समीक्षा",
    "gov.applicationReview":"आवेदन की समीक्षा","gov.status":"स्थिति","gov.priority":"प्राथमिकता","gov.submittedDocuments":"जमा किए गए दस्तावेज़","gov.checklistSub":"व्यवसाय स्वामी द्वारा जमा की गई सूची","gov.verified":"सत्यापित","gov.awaitingReview":"{0} दस्तावेज़ की समीक्षा अभी बाकी है।","gov.decline":"अनुरोध अस्वीकार करें","gov.approve":"अनुरोध स्वीकृत करें","gov.approveQuestion":"क्या यह अनुरोध स्वीकृत करें?","gov.declineQuestion":"क्या यह अनुरोध अस्वीकार करें?","gov.updateNotice":"इससे डेमो सत्र के लिए अधिकारी की कतार में {0} अपडेट हो जाएगा।","gov.cancel":"रद्द करें","gov.yesApprove":"हाँ, स्वीकृत करें","gov.yesDecline":"हाँ, अस्वीकार करें",
    "gov.appointmentsTitle":"आज की नियुक्तियाँ","gov.reportsTitle":"विभागीय रिपोर्ट","gov.reportsSub":"आज के कार्यभार का त्वरित परिचालन विवरण।","gov.weeklySummary":"साप्ताहिक प्रसंस्करण सारांश","gov.approval":"अनुमति","gov.received":"प्राप्त","gov.processed":"निपटाए गए","gov.avgTime":"औसत समय","gov.urgent":"अति आवश्यक","gov.high":"उच्च","gov.pendingReview":"समीक्षा लंबित","gov.scheduled":"निर्धारित",
    // — shared —
    "common.days": "दिन", "common.back": "पीछे",
  },
};

/** React context carrying the active language and the lookup function. */
const LangCtx = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

/** Convenience hook. Every component that renders text calls this. */
const useT = () => useContext(LangCtx);

/**
 * makeT — builds the lookup function for a language.
 * Falls back to English, then to the raw key, so a missing translation
 * degrades to readable text instead of blanking the interface.
 * Positional {0} {1} placeholders keep numbers out of the sentence structure,
 * which matters because Hindi word order differs from English.
 */
function makeT(lang) {
  return (key, ...args) => {
    let str = (UI[lang] && UI[lang][key]) || UI.en[key] || key;
    args.forEach((a, i) => { str = str.split(`{${i}}`).join(String(a)); });
    return str;
  };
}

/**
 * LanguageToggle — the switch itself. Rendered on the login page, the
 * declaration page and inside the app header, so it is reachable at every
 * moment the user is on the site.
 */
function LanguageToggle({ compact = false }) {
  const { lang, setLang } = useT();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      title={lang === "en" ? "हिन्दी में बदलें" : "Switch to English"}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors ${compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"}`}>
      <Globe size={compact ? 13 : 15} className="text-slate-400" />
      <span className="font-medium">{lang === "en" ? "हिन्दी" : "English"}</span>
    </button>
  );
}


const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const WEEKDAY_HEADS = ["S","M","T","W","T","F","S"];

/**
 * urgencyTone — maps "days until due" onto a traffic-light tone.
 *
 *     <= 2 days   red      act now, you are almost out of time
 *     <= 5 days   amber    start this week
 *     <= 10 days  green    comfortable, but on the radar
 *      > 10 days  slate    far enough out to be background noise
 *
 * Thresholds are inclusive and checked in ascending order, so a deadline two
 * days out is red rather than falling through to amber.
 */
function urgencyTone(days) {
  if (days <= 2)  return "red";
  if (days <= 5)  return "amber";
  if (days <= 10) return "green";
  return "slate";
}

/** Tailwind classes for each tone, in the places a tone can appear. */
const TONE = {
  red:   { cell: "bg-red-500 text-white",     dot: "bg-red-500",     text: "text-red-600",     border: "border-red-500",     chip: "bg-red-50 text-red-700 border-red-200" },
  amber: { cell: "bg-amber-500 text-white",   dot: "bg-amber-500",   text: "text-amber-600",   border: "border-amber-500",   chip: "bg-amber-50 text-amber-700 border-amber-200" },
  green: { cell: "bg-emerald-500 text-white", dot: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  slate: { cell: "bg-[#176B63] text-white",    dot: "bg-[#176B63]",    text: "text-[#176B63]",    border: "border-[#176B63]",    chip: "bg-[#176B63]/10 text-[#0F5B54] border-[#176B63]/30" },
};

/** Local-safe YYYY-MM-DD. Avoids the UTC shift that toISOString() introduces. */
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * CalendarPanel — self-contained light-themed calendar block.
 *
 * Renders four distinct date states, each with its own token pair:
 *
 *   BASE      unselected day        slate text, no fill
 *   SELECTED  primary active day    blue-600 fill, white text
 *   RANGE     multi-day block       blue-100 fill, blue-700 text
 *   EVENT     target micro-bubble   blue-500 fill, white text
 *
 * Precedence when a day qualifies for more than one: SELECTED > EVENT > RANGE.
 * The primary selection always wins so the user can see what they just picked.
 *
 * Props
 *   value        ISO string of the primary selected day
 *   onChange     (iso) => void
 *   rangeStart   ISO — inclusive start of the multi-day block
 *   rangeEnd     ISO — inclusive end of the multi-day block
 *   events       dates to mark with the event bubble. Each entry is either a
 *                plain ISO string (rendered in the default blue) or an object
 *                { iso, tone } where tone is a key of TONE — used by the
 *                dashboard to colour deadlines by how close they are.
 *   min / max    ISO bounds; days outside are dimmed and non-clickable
 *   disabledDays array of weekday indices to disable, e.g. [0, 6] for weekends
 */
function CalendarPanel({
  value, onChange, rangeStart, rangeEnd, events = [],
  min, max, disabledDays = [], className = "",
  compact = false, showLegend = true,
}) {
  /* `compact` shrinks the day cells and trims the vertical padding so the whole
     grid clears the fold when the calendar sits at the top of the dashboard.
     Everything else — states, navigation, precedence — behaves identically. */
  const cell = compact ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";
  const row  = compact ? "h-7" : "h-9";
  const seed = value ? new Date(value + "T00:00:00") : new Date();
  const [cursor, setCursor] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  /* Normalise the events prop into an iso -> tone lookup so a caller can pass
     either shape without the render path having to care which. */
  const eventTones = {}; const eventKinds = {};
  events.forEach(e => {
    if (typeof e === "string") { eventTones[e] = "slate"; eventKinds[e] = "deadline"; }
    else if (e && e.iso) {
      eventTones[e.iso] = e.tone || "slate";
      // An appointment is a booked commitment; a deadline is a due date. If
      // both fall on one day the appointment wins the marker, because it has a
      // time attached — the day panel below still lists both.
      if (eventKinds[e.iso] !== "appointment") eventKinds[e.iso] = e.kind || "deadline";
    }
  });

  const inRange = (iso) =>
    rangeStart && rangeEnd && iso >= rangeStart && iso <= rangeEnd;

  const stateOf = (iso, weekday) => {
    const outOfBounds = (min && iso < min) || (max && iso > max);
    const dayBlocked = disabledDays.includes(weekday);
    if (outOfBounds || dayBlocked) return "disabled";
    if (value === iso) return "selected";
    if (eventTones[iso]) return "event";
    if (inRange(iso)) return "range";
    return "base";
  };

  const cellClass = (state, iso) => {
    switch (state) {
      case "selected": return "bg-[#176B63] text-white font-semibold";
      case "range":    return "bg-[#176B63]/15 text-[#0F5B54] font-medium";
      // Event bubbles take the tone the caller assigned to that date.
      // Deadlines are a solid fill; appointments are a ring in the same tone,
      // so urgency and type are both readable without a second glance.
      case "event": {
        const tn = TONE[eventTones[iso]] || TONE.slate;
        return eventKinds[iso] === "appointment"
          ? `bg-white border-2 ${tn.border} ${tn.text} font-semibold`
          : `${tn.cell} font-semibold`;
      }
      case "disabled": return "text-slate-300 cursor-not-allowed";
      default:         return "text-slate-700 hover:bg-slate-100";
    }
  };

  const ArrowBtn = ({ dir, onClick, label }) => (
    <button type="button" onClick={onClick} aria-label={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-50">
      {dir === "prev"
        ? <ChevronLeft size={18} className="text-slate-400" />
        : <ChevronRight size={18} className="text-slate-400" />}
    </button>
  );

  const { t } = useT();

  return (
    <div className={`bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.05)] ${compact ? "p-3" : "p-4"} ${className}`}>

      {/* — Header navigation controllers — */}
      <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
        <ArrowBtn dir="prev" label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))} />
        <p className={`font-semibold text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>
          {MONTH_NAMES[month]} {year}
        </p>
        <ArrowBtn dir="next" label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))} />
      </div>

      {/* — Month selection segment slider — */}
      <div className={`flex items-center justify-between gap-1 bg-slate-50 rounded-xl p-1 ${compact ? "mb-2" : "mb-4"}`}>
        <button type="button" onClick={() => setCursor(prevMonthDate)}
          className="flex-1 py-1.5 rounded-lg text-xs text-center text-slate-400 transition-colors hover:bg-white">
          {MONTH_NAMES[prevMonthDate.getMonth()]}
        </button>
        <div className="flex-1 py-1.5 rounded-lg bg-white text-center shadow-sm">
          <span className="text-xs font-semibold text-slate-800">
            {MONTH_NAMES[month]}
          </span>
        </div>
        <button type="button" onClick={() => setCursor(nextMonthDate)}
          className="flex-1 py-1.5 rounded-lg text-xs text-center text-slate-400 transition-colors hover:bg-white">
          {MONTH_NAMES[nextMonthDate.getMonth()]}
        </button>
      </div>

      {/* — Days of the week column headers — */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_HEADS.map((d, i) => (
          <div key={i} className={`${compact ? "h-6" : "h-7"} flex items-center justify-center`}>
            <span className={`${compact ? "text-[10px]" : "text-[11px]"} font-medium text-slate-400`}>{d}</span>
          </div>
        ))}
      </div>

      {/* — Date grid — */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className={row} />;
          const iso = isoDate(new Date(year, month, day));
          const weekday = i % 7;
          const state = stateOf(iso, weekday);
          const clickable = state !== "disabled";
          return (
            <div key={i} className={`${row} flex items-center justify-center`}>
              <button
                type="button"
                disabled={!clickable}
                title={eventTones[iso] ? iso : undefined}
                onClick={() => clickable && onChange && onChange(iso)}
                className={`${cell} rounded-full flex items-center justify-center transition-colors ${cellClass(state, iso)}`}>
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* — Legend — */}
      {showLegend && (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 ${compact ? "mt-2 pt-2" : "mt-4 pt-3"}`}>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-3 h-3 rounded-full bg-[#176B63]" /> {t("cal.selected")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-3 h-3 rounded-full bg-[#176B63]/15 border border-[#176B63]/30" /> {t("cal.window")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-3 h-3 rounded-full bg-[#176B63]" /> {t("cal.event")}
        </span>
      </div>
      )}
    </div>
  );
}

// ==========================================================================
//  SHARED UI COMPONENTS
// --------------------------------------------------------------------------
//  Small presentational pieces reused across pages.
//    StatusBadge -> coloured pill showing approval / document state
//    StatCard    -> the metric tiles on the dashboard
// ==========================================================================

/**
 * StatusBadge — coloured pill for an approval or document state.
 * Accepts: approved | pending | rejected | not_started | issue | valid
 */
function StatusBadge({ status }) {
  const { t } = useT();
  const map = {
    approved:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    pending:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
    rejected:    { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
    not_started: { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200" },
    issue:       { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
    valid:       { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  };
  const key = map[status] ? status : "not_started";
  const c = map[key];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>{t("status." + key)}</span>;
}

/**
 * StatCard — a single metric tile used on the dashboard.
 */
function StatCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const colors = {
    blue: "bg-[#176B63]/10 text-[#176B63]",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-[#E8F7F4] text-[#176B63]",
  };
  return (
    <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-slate-800">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color]}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

// ==========================================================================
//  PAGES
// --------------------------------------------------------------------------
//  Each page is a self-contained screen rendered by <App> based on the
//  current sidebar selection.
// ==========================================================================

/**
 * DashboardPage — landing screen.
 */
function DashboardPage({ projects, setPage, setActiveProject, bookings = {} }) {
  const { t } = useT();
  const activeProject = projects[0];
  const approvals = activeProject?.approvals || [];
  const approved = approvals.filter(a => a.status === "approved").length;
  const pending = approvals.filter(a => a.status === "pending").length;
  const nextDeadline = approvals.find(a => a.status === "pending");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const deadlines = approvals
    .filter(a => a.status !== "approved")
    .map(a => ({ name: a.name, dept: a.dept, days: a.timeline, iso: isoDate(addDays(a.timeline)), tone: urgencyTone(a.timeline) }))
    .sort((x, y) => x.iso.localeCompare(y.iso));

  const [calSel, setCalSel] = useState(deadlines[0]?.iso || isoDate(today));
  const selectedDeadlines = deadlines.filter(d => d.iso === calSel);
  const soonest = deadlines[0];

  const officeVisits = approvals.filter(a => APPROVAL_CHANNELS[a.name] && APPROVAL_CHANNELS[a.name].mode !== "online").length;
  const onlineOnly  = approvals.filter(a => APPROVAL_CHANNELS[a.name]?.mode === "online").length;

  /* Booked appointments, read from the state lifted into <App>. They sit on
     the same traffic-light scale as deadlines — an appointment two days out is
     just as urgent as a filing due in two days. */
  const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - today) / 86400000);

  const appointments = Object.entries(bookings)
    .filter(([, b]) => b && b.date)
    .map(([id, b]) => {
      const appr = approvals.find(a => a.id === id);
      const dd = daysUntil(b.date);
      return { iso: b.date, slot: b.slot, token: b.token, office: b.office,
               name: appr?.name || "Appointment", days: dd, tone: urgencyTone(dd) };
    })
    .sort((x, y) => x.iso.localeCompare(y.iso));

  /* Deadlines render as a solid bubble, appointments as a ring — same tone. */
  const calEvents = [
    ...deadlines.map(d => ({ iso: d.iso, tone: d.tone, kind: "deadline" })),
    ...appointments.map(a => ({ iso: a.iso, tone: a.tone, kind: "appointment" })),
  ];
  const selectedAppts = appointments.filter(a => a.iso === calSel);

  const fmt = (iso) => new Date(iso + "T00:00:00")
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{t("dash.title")}</h1>
          <p className="text-sm mt-1 text-slate-500">{t("dash.subtitle")}</p>
        </div>
        <button onClick={() => setPage("new")} className="flex items-center gap-2 bg-[#176B63] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] transition-colors">
          <Plus size={16} /> {t("dash.newProject")}
        </button>
      </div>

      {/* ===== DASHBOARD OVERVIEW ===== */}
      <div className="grid lg:grid-cols-3 gap-4 lg:items-stretch">

        {/* LEFT: 4 stat boxes + upcoming deadlines.
            Keeping both inside the same column removes the large empty area
            created by the taller calendar on the right. */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={FileText} label={t("dash.totalApprovals")} value={approvals.length} sub={activeProject?.name} color="blue" />
            <StatCard icon={CheckCircle} label={t("dash.approved")} value={approved} sub={t("dash.complete", approvals.length ? Math.round(approved/approvals.length*100) : 0)} color="green" />
            <StatCard icon={Clock} label={t("dash.inProgress")} value={pending} sub={t("dash.awaiting")} color="amber" />
            <StatCard icon={Landmark} label={t("dash.officeTitle")} value={officeVisits} sub={t("dash.onlineCount", onlineOnly)} color="purple" />
          </div>

          {/* Upcoming Deadlines — intentionally placed in the former negative space */}
          <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">{t("dash.upcoming")}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upcoming approvals and compliance deadlines</p>
              </div>
              {deadlines.length > 0 && (
                <span className="text-xs font-medium text-[#176B63]">{deadlines.length} upcoming</span>
              )}
            </div>

            {deadlines.length > 0 ? (
              <div className="space-y-1">
                {deadlines.slice(0, 4).map((d, i) => (
                  <button
                    key={`dashboard-deadline-${i}`}
                    onClick={() => setCalSel(d.iso)}
                    className={`w-full flex items-center justify-between gap-4 px-3 py-3 rounded-xl text-left transition-colors ${calSel === d.iso ? "bg-[#E5F1EF]" : "hover:bg-[#F3F9F7]"}`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONE[d.tone].dot}`} />
                      <span className="text-sm font-medium text-[#294F5A] truncate">{d.name}</span>
                    </span>
                    <span className={`text-sm shrink-0 font-medium ${TONE[d.tone].text}`}>{fmt(d.iso)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[#F3F9F7] border border-[#DDEDE9] px-4 py-5 text-center text-sm text-slate-400">
                No upcoming deadlines.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Deadline + Appointment Calendar */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <CalendarDays size={15} /> {t("dash.nextDeadline")}
              </h3>
              {soonest && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{t("dash.soonest", fmt(soonest.iso))}</p>}
            </div>
            {soonest && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 border ${TONE[soonest.tone].chip}`}>
                {t("dash.inDays", soonest.days)}
              </span>
            )}
          </div>

          {/* Urgency + appointment legend */}
          <div className="px-4 pb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-red-500" /> {t("cal.urgent")}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> {t("cal.soon")}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {t("cal.ok")}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#176B63]" /> {t("cal.later")}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-[#176B63]" /> {t("cal.appt")}</span>
          </div>

          <div className="px-1">
            <CalendarPanel
              compact
              showLegend={false}
              value={calSel}
              onChange={setCalSel}
              events={calEvents}
              className="border-0"
            />
          </div>

          {/* Clicked-day detail */}
          <div className="px-4 pb-4 space-y-2">
            {selectedDeadlines.length > 0 && (
              <div className="rounded-lg p-3 space-y-2 bg-[#176B63]/10 border border-[#176B63]/20">
                <p className="text-[11px] font-semibold text-[#0F5B54]">{t("cal.deadlinesOn", fmt(calSel))}</p>
                {selectedDeadlines.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TONE[d.tone].dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-700 truncate">{d.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{d.dept}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${TONE[d.tone].text}`}>{t("dash.inDays", d.days)}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedAppts.length > 0 && (
              <div className="rounded-lg p-3 space-y-2 bg-[#E8F7F4] border border-[#CFE9E3]">
                <p className="text-[11px] font-semibold text-[#0F5B54]">{t("cal.apptsOn", fmt(calSel))}</p>
                {selectedAppts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ring-2 ring-white ${TONE[a.tone].dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-700 truncate">{a.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{a.office} · {a.slot} · {t("dash.inDays", a.days)}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-white text-[#0F5B54] px-1.5 py-0.5 rounded border border-[#CFE9E3] shrink-0">{a.token}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedDeadlines.length === 0 && selectedAppts.length === 0 && (
              <p className="text-[11px] text-center py-1.5 text-slate-400">{t("dash.nothingDue", fmt(calSel))}</p>
            )}
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">{t("dash.noProjects")}</h3>
          <p className="text-slate-500 text-sm mb-6">{t("dash.noProjectsSub")}</p>
          <button onClick={() => setPage("new")} className="bg-[#176B63] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F]">
            {t("dash.registerProject")}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)]">
            <div className="p-5 border-b border-[#176B63]/20 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{t("dash.progress")}</h2>
              <button onClick={() => { setActiveProject(0); setPage("roadmap"); }} className="text-[#176B63] text-sm font-medium hover:underline flex items-center gap-1">
                {t("dash.viewRoadmap")} <ChevronRight size={14} />
              </button>
            </div>
            <div className="p-5">
              <div className="w-full bg-[#DDF3EE] rounded-full h-2.5 mb-4">
                <div className="bg-[#176B63] h-2.5 rounded-full transition-all duration-500" style={{ width: `${approvals.length ? (approved/approvals.length*100) : 0}%` }} />
              </div>
              <div className="space-y-3">
                {approvals.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${a.status === "approved" ? "bg-emerald-500" : a.status === "pending" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.dept}</p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Bell size={16} /> {t("dash.alerts")}</h3>
              <div className="space-y-3">
                {pending > 0 && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">{nextDeadline?.name}</p>
                      <p className="text-xs text-amber-600">{t("dash.dueIn", nextDeadline?.timeline)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5 p-3 bg-[#176B63]/10 rounded-lg border border-[#176B63]/20">
                  <Zap size={16} className="text-[#176B63] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#0B4F49]">{t("dash.parallelTitle")}</p>
                    <p className="text-xs text-[#176B63]">{t("dash.parallelSub", approvals.filter(a=>a.parallel).length)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Landmark size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">{t("dash.officeTitle")}</p>
                    <p className="text-xs text-amber-600">{t("dash.officeSub", approvals.filter(a => APPROVAL_CHANNELS[a.name] && APPROVAL_CHANNELS[a.name].mode !== "online").length)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <Gift size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-800">{t("dash.schemesTitle")}</p>
                    <p className="text-xs text-emerald-600">{t("dash.schemesSub", SCHEMES_DB.filter(s => s.sectors.includes(activeProject?.sector)).length)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
              <h3 className="font-semibold text-slate-800 mb-3">{t("dash.projectInfo")}</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t("dash.name")}</span><span className="text-slate-700 font-medium">{activeProject?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("dash.sector")}</span><span className="text-slate-700 font-medium">{activeProject?.sector}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("dash.state")}</span><span className="text-slate-700 font-medium">{activeProject?.state}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("dash.estTime")}</span><span className="text-slate-700 font-medium">{Math.max(...approvals.map(a=>a.timeline))} {t("dash.daysUnit")}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * NewProjectPage — two-step project registration wizard.
 *
 *   Step 1: collect business name, sector, state, entity type and size.
 *   Step 2: run the approval identification engine and preview the result
 *           before committing.
 *
 * The 'AI Analysis' block on step 2 is where the real ML classifier would sit.
 * Here it derives the approval list from APPROVAL_DB by sector and estimates
 * the days saved by filing the parallel-eligible approvals simultaneously.
 */
function NewProjectPage({ onSubmit, setPage }) {
  const { t } = useT();
  const [form, setForm] = useState({ name: "", sector: "", state: "", type: "Private Limited", size: "Micro (< ₹1 Cr)" });
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    if (!form.name || !form.sector || !form.state) return;
    const approvals = getApprovals(form.sector).map(a => ({ ...a, status: a.status }));
    onSubmit({ ...form, approvals, createdAt: new Date().toLocaleDateString() });
    setPage("roadmap");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => setPage("dashboard")} className="text-slate-500 text-sm mb-4 hover:text-slate-700 flex items-center gap-1">
        {t("np.back")}
      </button>
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-800">{t("np.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("np.subtitle")}</p>
        </div>

        <div className="flex border-b border-slate-100">
          {[t("np.tab1"), t("np.tab2")].map((s, i) => (
            <button key={i} onClick={() => setStep(i + 1)} className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${step === i + 1 ? "text-[#176B63] border-b-2 border-[#176B63]" : "text-slate-400"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("np.name")}</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("np.namePh")} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("np.sector")}</label>
                <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] bg-white">
                  <option value="">{t("np.selectSector")}</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("np.state")}</label>
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] bg-white">
                    <option value="">{t("np.selectState")}</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("np.type")}</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] bg-white">
                    {["Sole Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("np.size")}</label>
                <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] bg-white">
                  {["Micro (< ₹1 Cr)", "Small (₹1-10 Cr)", "Medium (₹10-50 Cr)", "Large (> ₹50 Cr)"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => { if (form.name && form.sector && form.state) setStep(2); }} disabled={!form.name || !form.sector || !form.state} className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                {t("np.continue")}
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t("np.project")}</span><span className="font-medium text-slate-700">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("np.sector")}</span><span className="font-medium text-slate-700">{form.sector}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("np.state")}</span><span className="font-medium text-slate-700">{form.state}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("np.type")}</span><span className="font-medium text-slate-700">{form.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("np.size")}</span><span className="font-medium text-slate-700">{form.size}</span></div>
              </div>

              <div className="bg-[#176B63]/10 border border-[#176B63]/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-[#176B63]" />
                  <p className="text-sm font-medium text-[#0B4F49]">{t("np.aiTitle")}</p>
                </div>
                <p className="text-sm text-[#0F5B54]">
                  Based on your {form.sector} project in {form.state}, we identified <strong>{getApprovals(form.sector).length} approvals</strong> required.
                  {" "}<strong>{getApprovals(form.sector).filter(a => a.parallel).length}</strong> can run in parallel, saving you up to <strong>{Math.round(getApprovals(form.sector).reduce((s,a) => s + (a.parallel ? a.timeline : 0), 0) * 0.6)} days</strong>.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">{t("np.identified")}</h3>
                <div className="space-y-2">
                  {getApprovals(form.sector).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{a.name}</p>
                          <p className="text-xs text-slate-400">{a.dept} · {a.docs.length} documents · ~{a.timeline} days</p>
                        </div>
                      </div>
                      {a.parallel && <span className="text-xs bg-[#176B63]/10 text-[#176B63] px-2 py-0.5 rounded-full border border-[#176B63]/20">{t("np.parallel")}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">{t("np.backBtn")}</button>
                <button onClick={handleSubmit} className="flex-1 bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] flex items-center justify-center gap-2">
                  {t("np.create")} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * RoadmapPage — the core screen.
 *
 * Splits approvals into two phases:
 *   Phase 1 — no dependencies, can all be filed at the same time
 *   Phase 2 — sequential, or blocked behind another approval
 *
 * KEY INTERACTION: pressing 'Start Application' does two things at once —
 * it flips the approval to 'pending' AND expands <OfficeVisitPanel> inline on
 * that card. The panel then shows either the online portal link or the full
 * physical-visit flow, decided by APPROVAL_CHANNELS[approval.name].mode.
 *
 * State:
 *   expanded -> id of the approval whose panel is currently open (or null)
 *   bookings -> { [approvalId]: { date, slot, token, office, head } }
 */
function RoadmapPage({ project, updateApproval, setPage, bookings, onBook }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(null);

  if (!project) return <div className="text-center py-20 text-slate-500">{t("rm.noProject")}</div>;
  const { approvals } = project;

  const handleStart = (id) => {
    updateApproval(id, "pending");
    setExpanded(id);
  };

  /* Booking state lives in <App> so the dashboard calendar can read it too. */
  const handleBook = onBook;

  const phases = [
    { label: t("rm.phase1"), items: approvals.filter(a => a.parallel && !a.dependency) },
    { label: t("rm.phase2"), items: approvals.filter(a => !a.parallel || a.dependency) },
  ];

  const offlineCount = approvals.filter(a => APPROVAL_CHANNELS[a.name] && APPROVAL_CHANNELS[a.name].mode !== "online").length;
  const onlineCount = approvals.filter(a => APPROVAL_CHANNELS[a.name]?.mode === "online").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{t("rm.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name} · {project.sector} · {project.state}</p>
      </div>

      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> {t("rm.legApproved")}</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> {t("rm.legProgress")}</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /> {t("rm.legNotStarted")}</div>
          <div className="flex items-center gap-2"><Zap size={12} className="text-[#12564F]" /> {t("rm.legParallel")}</div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
          <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${(approvals.filter(a=>a.status==="approved").length / approvals.length * 100)}%` }} />
        </div>
        <p className="text-xs text-slate-400 text-right">{t("rm.completeOf", approvals.filter(a=>a.status==="approved").length, approvals.length)}</p>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-600"><Laptop size={14} /> {t("rm.onlineCount", onlineCount)}</span>
          <span className="flex items-center gap-1.5 text-amber-600"><Landmark size={14} /> {t("rm.offlineCount", offlineCount)}</span>
          <span className="flex items-center gap-1.5 text-slate-500"><CalendarDays size={14} /> {t("rm.bookedCount", Object.keys(bookings).length)}</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">{t("rm.hint")}</p>
      </div>

      {phases.map((phase, pi) => (
        <div key={pi}>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            {pi === 0 ? <Zap size={18} className="text-[#12564F]" /> : <Route size={18} className="text-slate-400" />}
            {phase.label}
          </h2>
          {pi === 0 && <p className="text-sm text-slate-500 mb-4">{t("rm.phase1sub")}</p>}
          <div className="space-y-3">
            {phase.items.map((a) => {
              const ch = APPROVAL_CHANNELS[a.name];
              const isOpen = expanded === a.id;
              const started = a.status === "pending" || a.status === "approved";
              return (
                <div key={a.id} className={`bg-white rounded-xl border p-5 transition-all ${isOpen ? "border-[#176B63]/60 ring-2 ring-[#DDF3EE]" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-semibold text-slate-800">{a.name}</h3>
                        {a.parallel && <span className="text-xs bg-[#176B63]/10 text-[#176B63] px-2 py-0.5 rounded border border-[#176B63]/20">{t("rm.parallel")}</span>}
                      </div>
                      <p className="text-sm text-slate-500">{a.dept}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mb-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {t("rm.daysApprox", a.timeline)}</span>
                    <span className="flex items-center gap-1.5"><FileText size={14} /> {t("rm.docsCount", a.docs.length)}</span>
                    {ch?.mode === "online" && <span className="flex items-center gap-1.5 text-emerald-600"><Laptop size={14} /> {t("rm.fullyOnline")}</span>}
                    {ch?.mode === "offline" && <span className="flex items-center gap-1.5 text-amber-600"><Landmark size={14} /> {t("rm.officeNeeded")}</span>}
                    {ch?.mode === "hybrid" && <span className="flex items-center gap-1.5 text-[#176B63]"><Landmark size={14} /> {t("rm.onlinePlusVisit")}</span>}
                    {bookings[a.id] && <span className="flex items-center gap-1.5 text-[#176B63]"><CalendarDays size={14} /> {t("rm.slotBooked")}</span>}
                    {a.dependency && <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> {t("rm.dependsOn", approvals.find(x=>x.id===a.dependency)?.name)}</span>}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-slate-500">{t("rm.docsRequired")}</p>
                      <button onClick={() => setPage("documents")} className="text-xs text-[#176B63] font-medium hover:underline flex items-center gap-1">
                        <FileCheck size={12} /> {t("rm.checkDocs")}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.docs.map((d, j) => (
                        <span key={j} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md">{d}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">{t("rm.docsHint")}</p>
                    <div className="mt-3 rounded-xl border border-[#CFE9E3] bg-[#F2FBF9] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[#176B63]" />
                          <p className="text-sm font-semibold text-slate-700">{t("rm.docPack")}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{t("rm.docPackHint")}</p>
                        <span className="inline-block mt-2 text-[10px] font-bold tracking-wide px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">DEMO / REPRESENTATIVE</span>
                      </div>
                      <a href="/Industry_Saarthi_Demo_Document_Pack.pdf" target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#176B63] hover:bg-[#12564F] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors">
                        <FileText size={14} /> {t("rm.docPack")} <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.status === "not_started" && (
                      <button onClick={() => handleStart(a.id)} className="text-xs bg-[#176B63] text-white px-3.5 py-2 rounded-md hover:bg-[#12564F] font-medium flex items-center gap-1.5">
                        <ArrowRight size={13} /> {t("rm.start")}
                      </button>
                    )}
                    {started && (
                      <button onClick={() => setExpanded(isOpen ? null : a.id)} className="text-xs border border-slate-200 text-slate-600 px-3.5 py-2 rounded-md hover:bg-slate-50 font-medium flex items-center gap-1.5">
                        {ch?.mode === "online" ? <Laptop size={13} /> : <Landmark size={13} />}
                        {isOpen ? t("rm.hideDetails") : ch?.mode === "online" ? t("rm.showPortal") : t("rm.showOffice")}
                        <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                    {a.status === "pending" && (
                      <button onClick={() => updateApproval(a.id, "approved")} className="text-xs bg-emerald-600 text-white px-3.5 py-2 rounded-md hover:bg-emerald-700 font-medium">
                        {t("rm.markApproved")}
                      </button>
                    )}
                  </div>

                  {isOpen && started && (
                    <OfficeVisitPanel approval={a} booking={bookings[a.id]} onBook={handleBook} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * UploadValidateSection — tab 1 of Document Check.
 * Simulates the OCR pipeline on an uploaded document: upload -> validating ->
 * valid/issue. Runs the regex in DOC_VALIDATION_RULES against the number the
 * user typed, and randomly injects realistic scan-quality warnings so the demo
 * shows both outcomes.
 */
function UploadValidateSection({ project }) {
  const { t } = useT();
  const [uploads, setUploads] = useState([]);
  const [validating, setValidating] = useState(null);
  const [docType, setDocType] = useState("PAN Card");
  const [docInput, setDocInput] = useState("");

  const simulateUpload = () => {
    const newDoc = {
      id: Date.now(),
      name: `${docType}.pdf`,
      type: docType,
      size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toLocaleTimeString(),
      status: "uploading",
      issues: [],
    };
    setUploads(prev => [newDoc, ...prev]);

    setTimeout(() => {
      setUploads(prev => prev.map(d => d.id === newDoc.id ? { ...d, status: "validating" } : d));
      setValidating(newDoc.id);

      setTimeout(() => {
        const rules = DOC_VALIDATION_RULES[docType];
        const issues = [];
        if (docInput && rules?.regex && !rules.regex.test(docInput)) {
          issues.push(`Invalid ${docType} number format. Expected: ${rules.format}`);
        }
        if (Math.random() > 0.6) issues.push("Document quality is low — some fields may be unreadable");
        if (Math.random() > 0.7) issues.push("Expiry date not detected — please verify manually");

        setUploads(prev => prev.map(d => d.id === newDoc.id ? {
          ...d,
          status: issues.length > 0 ? "issue" : "valid",
          issues,
        } : d));
        setValidating(null);
      }, 2000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-6">
        <h3 className="font-semibold text-slate-800 mb-4">{t("up.title")}</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("up.docType")}</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white">
              {Object.keys(DOC_VALIDATION_RULES).map(d => <option key={d}>{d}</option>)}
              <option>Factory License</option>
              <option>NOC Certificate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("up.docNumber")}</label>
            <input type="text" value={docInput} onChange={e => setDocInput(e.target.value)} placeholder={DOC_VALIDATION_RULES[docType]?.format || "Enter document number"} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={simulateUpload} className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] flex items-center justify-center gap-2">
              <Upload size={14} /> {t("up.upload")}
            </button>
          </div>
        </div>

        {DOC_VALIDATION_RULES[docType] && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-slate-600 font-medium mb-1">{t("up.ocrFields")}</p>
            <div className="flex flex-wrap gap-1.5">
              {DOC_VALIDATION_RULES[docType].fields.map((f, i) => (
                <span key={i} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)]">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">{t("up.results")}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {uploads.map(doc => (
              <div key={doc.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${doc.status === "valid" ? "bg-emerald-50" : doc.status === "issue" ? "bg-orange-50" : "bg-[#176B63]/10"}`}>
                      <FileText size={18} className={doc.status === "valid" ? "text-emerald-600" : doc.status === "issue" ? "text-orange-600" : "text-[#176B63]"} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.type}</p>
                      <p className="text-xs text-slate-400">{doc.size} · {t("up.uploadedAt")} {doc.uploadedAt}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status === "uploading" ? "pending" : doc.status === "validating" ? "pending" : doc.status} />
                </div>

                {doc.status === "uploading" && <p className="text-sm text-[#176B63] flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin" /> {t("up.uploading")}</p>}
                {doc.status === "validating" && <p className="text-sm text-amber-600 flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> {t("up.validating")}</p>}

                {doc.status === "valid" && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-2">
                    <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle size={14} /> {t("up.allPassed")}</p>
                  </div>
                )}

                {doc.status === "issue" && doc.issues.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mt-2 space-y-1.5">
                    {doc.issues.map((issue, j) => (
                      <p key={j} className="text-sm text-orange-700 flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SchemesPage — matches SCHEMES_DB against the project's sector.
 * Matched schemes expand to show benefit amount, eligibility and an apply CTA.
 * Non-matching schemes are still listed, greyed out, so nothing is hidden.
 */
function SchemesPage({ project }) {
  const { t } = useT();
  const sector = project?.sector || "Manufacturing";
  const matched = SCHEMES_DB.filter(s => s.sectors.includes(sector));
  const other = SCHEMES_DB.filter(s => !s.sectors.includes(sector));
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{t("sc.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("sc.subtitle", sector)}{project?.state ? ` · ${project.state}` : ""}</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <Gift size={20} className="text-emerald-600" />
        <p className="text-sm text-emerald-800">{t("sc.banner", matched.length)}</p>
      </div>

      <div className="space-y-3">
        {matched.map(s => (
          <div key={s.id} className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full p-5 text-left flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800">{s.name}</h3>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{t("sc.matched")}</span>
                </div>
                <p className="text-sm text-slate-500">{s.ministry}</p>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded === s.id ? "rotate-180" : ""}`} />
            </button>
            {expanded === s.id && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-0 pt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{t("sc.benefit")}</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2"><IndianRupee size={14} className="text-emerald-600" /> {s.benefit}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{t("sc.eligibility")}</p>
                  <p className="text-sm text-slate-700">{s.eligibility}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{t("sc.sectors")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.sectors.map(sec => <span key={sec} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{sec}</span>)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a href={s.applyUrl} target="_blank" rel="noopener noreferrer" className="bg-[#176B63] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#12564F] inline-flex items-center gap-1.5">
                    {t("sc.apply")} <ExternalLink size={13} />
                  </a>
                  <span className="text-xs text-slate-400">{t("sc.opens", s.portalName)}</span>
                </div>
                <p className="text-xs text-slate-400 break-all">{s.applyUrl}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {other.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-700 mt-6">{t("sc.other")}</h2>
          <div className="space-y-2">
            {other.map(s => (
              <div key={s.id} className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.ministry} · {s.benefit}</p>
                </div>
                <span className="text-xs text-slate-400">{t("sc.notMatching")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================================================
//  SCAN & TRANSLATE — FIXTURES
// --------------------------------------------------------------------------
//  TARGET_LANGS   -> the 10 languages a blank form can be translated into
//  FILLED_DOC_DB  -> simulated OCR output for FILLED forms. Every field
//                    carries the original text, its English translation, a
//                    status (valid / warning / error) and a plain-language
//                    suggestion telling the user exactly what to fix.
//  BLANK_FORM_DB  -> a blank English government form plus real translations
//                    of every label into 9 Indian languages.
// ==========================================================================
const TARGET_LANGS = {
  en: "English", hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu",
  bn: "Bengali", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi",
};

const FILLED_DOC_DB = {
  hindi_filled: {
    type: "Factory License Application (Hindi — Filled)",
    sourceLang: "Hindi",
    extractedFields: [
      { label: "आवेदक नाम / Applicant Name", value: "सुनील विजय पाटिल", translated: "Sunil Vijay Patil", status: "valid", suggestion: null },
      { label: "पिता/पति का नाम / Father/Spouse", value: "विजय रामचंद्र पाटिल", translated: "Vijay Ramchandra Patil", status: "valid", suggestion: null },
      { label: "कारखाना नाम / Factory Name", value: "श्री गणेश इंडस्ट्रीज", translated: "Shri Ganesh Industries", status: "valid", suggestion: null },
      { label: "पता / Address", value: "प्लॉट ४५, एमआईडीसी, पुणे", translated: "Plot 45, MIDC, Pune", status: "warning", suggestion: "PIN code missing — add 411019 for Pune MIDC" },
      { label: "दूरध्वनी / Phone", value: "98501234", translated: "98501234", status: "error", suggestion: "Only 8 digits — Indian mobile numbers need 10 digits" },
      { label: "श्रमिकों की संख्या / No. of Workers", value: "४५", translated: "45", status: "valid", suggestion: null },
      { label: "कारखाना क्षेत्रफल / Factory Area", value: "2500 वर्ग फुट", translated: "2500 sq ft", status: "valid", suggestion: null },
      { label: "उत्पादन प्रकार / Production Type", value: "प्लास्टिक मोल्डिंग", translated: "Plastic Moulding", status: "valid", suggestion: null },
      { label: "वार्षिक उत्पादन / Annual Output", value: "— (blank)", translated: "— (blank)", status: "error", suggestion: "Mandatory field — enter estimated annual production in tonnes or units" },
      { label: "हस्ताक्षर / Signature", value: "Present", translated: "Present", status: "valid", suggestion: null },
    ],
    ocrText: "महाराष्ट्र शासन — कामगार विभाग\nकारखाना परवाना अर्ज\n\nआवेदक नाम: सुनील विजय पाटिल\nपिता/पति का नाम: विजय रामचंद्र पाटिल\nकारखाना नाम: श्री गणेश इंडस्ट्रीज\nपता: प्लॉट ४५, एमआईडीसी, पुणे\nदूरध्वनी: ९८५०१२३४\nश्रमिकों की संख्या: ४५\nकारखाना क्षेत्रफल: २५०० वर्ग फुट\nउत्पादन प्रकार: प्लास्टिक मोल्डिंग\nवार्षिक उत्पादन: ____\nदिनांक: २५/०८/२०२६\nहस्ताक्षर: [signed]",
    translatedText: "Government of Maharashtra — Labour Department\nFactory License Application\n\nApplicant Name: Sunil Vijay Patil\nFather/Spouse Name: Vijay Ramchandra Patil\nFactory Name: Shri Ganesh Industries\nAddress: Plot 45, MIDC, Pune\nPhone: 98501234\nNo. of Workers: 45\nFactory Area: 2500 sq ft\nProduction Type: Plastic Moulding\nAnnual Output: ____ \nDate: 25/08/2026\nSignature: [signed]",
    summary: { total: 10, valid: 7, warnings: 1, errors: 2 },
  },
  marathi_filled: {
    type: "Pollution NOC Application (Marathi — Filled)",
    sourceLang: "Marathi",
    extractedFields: [
      { label: "उद्योग नाव / Industry Name", value: "टेक्नो ग्रीन मॅन्युफॅक्चरिंग प्रा. लि.", translated: "Techno Green Manufacturing Pvt. Ltd.", status: "valid", suggestion: null },
      { label: "मालक / Owner", value: "अमित सुरेश देशमुख", translated: "Amit Suresh Deshmukh", status: "valid", suggestion: null },
      { label: "ठिकाण / Location", value: "गट नं. ७८, एमआयडीसी सातपूर, नाशिक", translated: "Gat No. 78, MIDC Satpur, Nashik", status: "valid", suggestion: null },
      { label: "उद्योग वर्ग / Category", value: "लाल", translated: "Red", status: "warning", suggestion: "Red category requires Environmental Clearance — ensure EC is obtained before applying" },
      { label: "पाणी वापर / Water Usage", value: "१५ KLD", translated: "15 KLD", status: "valid", suggestion: null },
      { label: "सांडपाणी / Effluent", value: "१० KLD", translated: "10 KLD", status: "warning", suggestion: "Effluent exceeds 60% of intake — ETP capacity certificate needed" },
      { label: "CTO क्रमांक / CTO Number", value: "— (blank)", translated: "— (blank)", status: "error", suggestion: "Consent to Operate number is mandatory for renewal — enter existing CTO number" },
      { label: "हवा प्रदूषण उपकरणे / Air Pollution Equipment", value: "बॅग फिल्टर", translated: "Bag Filter", status: "valid", suggestion: null },
      { label: "अर्जदार स्वाक्षरी / Applicant Signature", value: "Present", translated: "Present", status: "valid", suggestion: null },
    ],
    ocrText: "महाराष्ट्र प्रदूषण नियंत्रण मंडळ\nना-हरकत प्रमाणपत्र अर्ज\n\nउद्योग नाव: टेक्नो ग्रीन मॅन्युफॅक्चरिंग प्रा. लि.\nमालक: अमित सुरेश देशमुख\nठिकाण: गट नं. ७८, एमआयडीसी सातपूर, नाशिक\nउद्योग वर्ग: लाल\nपाणी वापर: १५ KLD\nसांडपाणी: १० KLD\nCTO क्रमांक: ____\nहवा प्रदूषण उपकरणे: बॅग फिल्टर\nदिनांक: २०/०८/२०२६\nअर्जदार स्वाक्षरी: [signed]",
    translatedText: "Maharashtra Pollution Control Board\nNo Objection Certificate Application\n\nIndustry Name: Techno Green Manufacturing Pvt. Ltd.\nOwner: Amit Suresh Deshmukh\nLocation: Gat No. 78, MIDC Satpur, Nashik\nIndustry Category: Red\nWater Usage: 15 KLD\nEffluent: 10 KLD\nCTO Number: ____\nAir Pollution Equipment: Bag Filter\nDate: 20/08/2026\nApplicant Signature: [signed]",
    summary: { total: 9, valid: 6, warnings: 2, errors: 1 },
  },
  tamil_filled: {
    type: "MSME Registration Form (Tamil — Filled)",
    sourceLang: "Tamil",
    extractedFields: [
      { label: "தொழில் நிறுவன பெயர் / Enterprise Name", value: "ஸ்ரீ முருகன் டெக்ஸ்டைல்ஸ்", translated: "Sri Murugan Textiles", status: "valid", suggestion: null },
      { label: "உரிமையாளர் / Owner", value: "கே. முருகானந்தம்", translated: "K. Muruganandham", status: "valid", suggestion: null },
      { label: "முகவரி / Address", value: "நெ. 12, சிப்காட், ஓசூர்", translated: "No. 12, SIPCOT, Hosur", status: "valid", suggestion: null },
      { label: "ஆதார் எண் / Aadhaar", value: "4532 8876 12", translated: "4532 8876 12", status: "error", suggestion: "Only 10 digits — Aadhaar must be 12 digits (XXXX XXXX XXXX)" },
      { label: "முதலீடு / Investment", value: "₹85 லட்சம்", translated: "₹85 Lakhs", status: "valid", suggestion: null },
      { label: "தொழிலாளர் எண்ணிக்கை / Workers", value: "32", translated: "32", status: "valid", suggestion: null },
      { label: "வங்கி கணக்கு / Bank A/c", value: "SBI, Hosur Branch", translated: "SBI, Hosur Branch", status: "warning", suggestion: "Account number not mentioned — enter full A/c number with IFSC" },
      { label: "NIC குறியீடு / NIC Code", value: "— (blank)", translated: "— (blank)", status: "error", suggestion: "NIC code is mandatory — for textiles it is typically 13 (Manufacture of Textiles)" },
    ],
    ocrText: "மைக்ரோ, சிறு மற்றும் நடுத்தர தொழில் நிறுவனங்கள் அமைச்சகம்\nஉத்யம் பதிவு படிவம்\n\nதொழில் நிறுவன பெயர்: ஸ்ரீ முருகன் டெக்ஸ்டைல்ஸ்\nஉரிமையாளர்: கே. முருகானந்தம்\nமுகவரி: நெ. 12, சிப்காட், ஓசூர்\nஆதார் எண்: ४५३२ ८८७६ १२\nமுதலீடு: ₹85 லட்சம்\nதொழிலாளர்: 32\nவங்கி: SBI, Hosur Branch\nNIC குறியீடு: ____\nநாள்: 18/08/2026",
    translatedText: "Ministry of Micro, Small and Medium Enterprises\nUdyam Registration Form\n\nEnterprise Name: Sri Murugan Textiles\nOwner: K. Muruganandham\nAddress: No. 12, SIPCOT, Hosur\nAadhaar No.: 4532 8876 12\nInvestment: ₹85 Lakhs\nWorkers: 32\nBank: SBI, Hosur Branch\nNIC Code: ____\nDate: 18/08/2026",
    summary: { total: 8, valid: 4, warnings: 1, errors: 2 },
  },
};

const BLANK_FORM_DB = {
  factory_form: {
    type: "Factory License Application Form",
    sourceText: "Government of Maharashtra — Labour Department\nFactory License Application Form\n\nSection A: Applicant Details\n1. Full Name of Applicant: ________\n2. Father's / Spouse's Name: ________\n3. Address: ________\n4. Phone Number: ________\n5. Email: ________\n\nSection B: Factory Details\n6. Name of Factory: ________\n7. Factory Address: ________\n8. Type of Manufacturing: ________\n9. Total Built-up Area (sq ft): ________\n10. Number of Workers: ________\n11. Annual Production (tonnes/units): ________\n\nSection C: Compliance\n12. Pollution Control Board Consent No.: ________\n13. Fire NOC Number: ________\n14. Electricity Connection Load (KW): ________\n\nSection D: Declaration\nI hereby declare that all the information provided above is true.\nDate: ________\nSignature: ________",
    translations: {
      hi: "महाराष्ट्र शासन — कामगार विभाग\nकारखाना परवाना अर्ज\n\nविभाग अ: आवेदक विवरण\n1. आवेदक का पूरा नाम: ________\n2. पिता / पति का नाम: ________\n3. पता: ________\n4. फोन नंबर: ________\n5. ईमेल: ________\n\nविभाग ब: कारखाना विवरण\n6. कारखाने का नाम: ________\n7. कारखाने का पता: ________\n8. उत्पादन का प्रकार: ________\n9. कुल निर्मित क्षेत्रफल (वर्ग फुट): ________\n10. कामगारों की संख्या: ________\n11. वार्षिक उत्पादन (टन/इकाई): ________\n\nविभाग स: अनुपालन\n12. प्रदूषण नियंत्रण मंडल सहमति क्र.: ________\n13. अग्निशमन NOC क्रमांक: ________\n14. विद्युत भार (KW): ________\n\nविभाग द: घोषणा\nमैं घोषणा करता/करती हूँ कि उपर दी गई सभी जानकारी सत्य है।\nदिनांक: ________\nहस्ताक्षर: ________",
      mr: "महाराष्ट्र शासन — कामगार विभाग\nकारखाना परवाना अर्ज\n\nविभाग अ: अर्जदार तपशील\n1. अर्जदाराचे पूर्ण नाव: ________\n2. वडील / पती यांचे नाव: ________\n3. पत्ता: ________\n4. फोन नंबर: ________\n5. ईमेल: ________\n\nविभाग ब: कारखाना तपशील\n6. कारखान्याचे नाव: ________\n7. कारखान्याचा पत्ता: ________\n8. उत्पादनाचा प्रकार: ________\n9. एकूण बांधकाम क्षेत्रफळ (चौ. फूट): ________\n10. कामगारांची संख्या: ________\n11. वार्षिक उत्पादन (टन/युनिट): ________\n\nविभाग क: अनुपालन\n12. प्रदूषण नियंत्रण मंडळ संमती क्र.: ________\n13. अग्निशमन NOC क्रमांक: ________\n14. वीज भार (KW): ________\n\nविभाग ड: घोषणा\nमी घोषित करतो/करते की वर दिलेली सर्व माहिती सत्य आहे।\nदिनांक: ________\nस्वाक्षरी: ________",
      ta: "மகாராஷ்டிர அரசு — தொழிலாளர் துறை\nதொழிற்சாலை உரிமம் விண்ணப்பம்\n\nபிரிவு அ: விண்ணப்பதாரர் விவரங்கள்\n1. விண்ணப்பதாரரின் முழு பெயர்: ________\n2. தந்தை / கணவர் பெயர்: ________\n3. முகவரி: ________\n4. தொலைபேசி எண்: ________\n5. மின்னஞ்சல்: ________\n\nபிரிவு ஆ: தொழிற்சாலை விவரங்கள்\n6. தொழிற்சாலை பெயர்: ________\n7. தொழிற்சாலை முகவரி: ________\n8. உற்பத்தி வகை: ________\n9. மொத்த கட்டிட பரப்பளவு (சதுர அடி): ________\n10. தொழிலாளர் எண்ணிக்கை: ________\n11. ஆண்டு உற்பத்தி (டன்/அலகு): ________\n\nபிரிவு இ: இணக்கம்\n12. மாசுக்கட்டுப்பாடு வாரிய ஒப்புதல் எண்: ________\n13. தீயணைப்பு NOC எண்: ________\n14. மின் இணைப்பு சுமை (KW): ________\n\nபிரிவு ஈ: உறுதிமொழி\nமேலே கொடுக்கப்பட்ட அனைத்து தகவல்களும் உண்மை என உறுதியளிக்கிறேன்.\nதேதி: ________\nகையொப்பம்: ________",
      te: "మహారాష్ట్ర ప్రభుత్వం — కార్మిక శాఖ\nఫ్యాక్టరీ లైసెన్స్ దరఖాస్తు\n\nవిభాగం ఎ: దరఖాస్తుదారు వివరాలు\n1. దరఖాస్తుదారు పూర్తి పేరు: ________\n2. తండ్రి / భర్త పేరు: ________\n3. చిరునామా: ________\n4. ఫోన్ నంబర్: ________\n5. ఇమెయిల్: ________\n\nవిభాగం బి: ఫ్యాక్టరీ వివరాలు\n6. ఫ్యాక్టరీ పేరు: ________\n7. ఫ్యాక్టరీ చిరునామా: ________\n8. ఉత్పత్తి రకం: ________\n9. మొత్తం నిర్మిత ప్రాంతం (చ.అ.): ________\n10. కార్మికుల సంఖ్య: ________\n11. వార్షిక ఉత్పత్తి (టన్నులు/యూనిట్లు): ________\n\nవిభాగం సి: సమ్మతి\n12. కాలుష్య నియంత్రణ బోర్డు అనుమతి సం.: ________\n13. అగ్నిమాపక NOC నంబర్: ________\n14. విద్యుత్ లోడ్ (KW): ________\n\nవిభాగం డి: ప్రకటన\nపై అందించిన సమాచారం అంతా నిజమని ప్రకటిస్తున్నాను.\nతేదీ: ________\nసంతకం: ________",
      gu: "મહારાષ્ટ્ર સરકાર — શ્રમ વિભાગ\nફેક્ટરી લાયસન્સ અરજી\n\nવિભાગ અ: અરજદાર વિગતો\n1. અરજદારનું પૂરું નામ: ________\n2. પિતા / પતિનું નામ: ________\n3. સરનામું: ________\n4. ફોન નંબર: ________\n5. ઈમેઈલ: ________\n\nવિભાગ બ: ફેક્ટરી વિગતો\n6. ફેક્ટરીનું નામ: ________\n7. ફેક્ટરીનું સરનામું: ________\n8. ઉત્પાદનનો પ્રકાર: ________\n9. કુલ બાંધકામ વિસ્તાર (ચો.ફૂટ): ________\n10. કામદારોની સંખ્યા: ________\n11. વાર્ષિક ઉત્પાદન (ટન/યુનિટ): ________\n\nવિભાગ ક: પાલન\n12. પ્રદૂષણ નિયંત્રણ બોર્ડ સંમતિ ક્ર.: ________\n13. ફાયર NOC નંબર: ________\n14. વીજ ભાર (KW): ________\n\nવિભાગ ડ: ઘોષણા\nહું ઘોષણા કરું છું કે ઉપર આપેલી તમામ માહિતી સત્ય છે.\nતારીખ: ________\nસહી: ________",
      kn: "ಮಹಾರಾಷ್ಟ್ರ ಸರ್ಕಾರ — ಕಾರ್ಮಿಕ ಇಲಾಖೆ\nಕಾರ್ಖಾನೆ ಪರವಾನಗಿ ಅರ್ಜಿ\n\nವಿಭಾಗ ಎ: ಅರ್ಜಿದಾರರ ವಿವರಗಳು\n1. ಅರ್ಜಿದಾರರ ಪೂರ್ಣ ಹೆಸರು: ________\n2. ತಂದೆ / ಪತಿ ಹೆಸರು: ________\n3. ವಿಳಾಸ: ________\n4. ಫೋನ್ ಸಂಖ್ಯೆ: ________\n5. ಇಮೇಲ್: ________\n\nವಿಭಾಗ ಬಿ: ಕಾರ್ಖಾನೆ ವಿವರಗಳು\n6. ಕಾರ್ಖಾನೆ ಹೆಸರು: ________\n7. ಕಾರ್ಖಾನೆ ವಿಳಾಸ: ________\n8. ಉತ್ಪಾದನೆ ಪ್ರಕಾರ: ________\n9. ಒಟ್ಟು ನಿರ್ಮಿತ ಪ್ರದೇಶ (ಚ.ಅ.): ________\n10. ಕಾರ್ಮಿಕರ ಸಂಖ್ಯೆ: ________\n11. ವಾರ್ಷಿಕ ಉತ್ಪಾದನೆ (ಟನ್/ಯೂನಿಟ್): ________\n\nವಿಭಾಗ ಸಿ: ಅನುಸರಣೆ\n12. ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಮಂಡಳಿ ಒಪ್ಪಿಗೆ ಸಂ.: ________\n13. ಅಗ್ನಿಶಾಮಕ NOC ಸಂಖ್ಯೆ: ________\n14. ವಿದ್ಯುತ್ ಲೋಡ್ (KW): ________\n\nವಿಭಾಗ ಡಿ: ಘೋಷಣೆ\nಮೇಲೆ ನೀಡಿದ ಎಲ್ಲ ಮಾಹಿತಿ ಸತ್ಯವೆಂದು ಘೋಷಿಸುತ್ತೇನೆ.\nದಿನಾಂಕ: ________\nಸಹಿ: ________",
      bn: "মহারাষ্ট্র সরকার — শ্রম বিভাগ\nকারখানা লাইসেন্স আবেদনপত্র\n\nবিভাগ ক: আবেদনকারীর বিবরণ\n1. আবেদনকারীর পূর্ণ নাম: ________\n2. পিতা / স্বামীর নাম: ________\n3. ঠিকানা: ________\n4. ফোন নম্বর: ________\n5. ইমেইল: ________\n\nবিভাগ খ: কারখানার বিবরণ\n6. কারখানার নাম: ________\n7. কারখানার ঠিকানা: ________\n8. উৎপাদনের ধরন: ________\n9. মোট নির্মিত এলাকা (বর্গ ফুট): ________\n10. শ্রমিক সংখ্যা: ________\n11. বার্ষিক উৎপাদন (টন/ইউনিট): ________\n\nবিভাগ গ: সম্মতি\n12. দূষণ নিয়ন্ত্রণ পর্ষদ সম্মতি নং: ________\n13. অগ্নিনির্বাপণ NOC নম্বর: ________\n14. বৈদ্যুতিক লোড (KW): ________\n\nবিভাগ ঘ: ঘোষণা\nআমি ঘোষণা করি যে উপরে প্রদত্ত সকল তথ্য সত্য।\nতারিখ: ________\nস্বাক্ষর: ________",
      ml: "മഹാരാഷ്ട്ര സർക്കാർ — തൊഴിൽ വകുപ്പ്\nഫാക്ടറി ലൈസൻസ് അപേക്ഷ\n\nവിഭാഗം എ: അപേക്ഷകന്റെ വിവരങ്ങൾ\n1. അപേക്ഷകന്റെ മുഴുവൻ പേര്: ________\n2. പിതാവ് / ഭർത്താവ് പേര്: ________\n3. വിലാസം: ________\n4. ഫോൺ നമ്പർ: ________\n5. ഇമെയിൽ: ________\n\nവിഭാഗം ബി: ഫാക്ടറി വിവരങ്ങൾ\n6. ഫാക്ടറി പേര്: ________\n7. ഫാക്ടറി വിലാസം: ________\n8. ഉൽപ്പാദന തരം: ________\n9. ആകെ നിർമ്മിത വിസ്തീർണ്ണം (ചതുരശ്ര അടി): ________\n10. തൊഴിലാളികളുടെ എണ്ണം: ________\n11. വാർഷിക ഉൽപ്പാദനം (ടൺ/യൂണിറ്റ്): ________\n\nവിഭാഗം സി: പാലിക്കൽ\n12. മലിനീകരണ നിയന്ത്രണ ബോർഡ് സമ്മതം നമ്പർ: ________\n13. ഫയർ NOC നമ്പർ: ________\n14. വൈദ്യുതി ലോഡ് (KW): ________\n\nവിഭാഗം ഡി: പ്രഖ്യാപനം\nമുകളിൽ നൽകിയ എല്ലാ വിവരങ്ങളും സത്യമാണെന്ന് ഞാൻ പ്രഖ്യാപിക്കുന്നു.\nതീയതി: ________\nഒപ്പ്: ________",
      pa: "ਮਹਾਰਾਸ਼ਟਰ ਸਰਕਾਰ — ਕਿਰਤ ਵਿਭਾਗ\nਫੈਕਟਰੀ ਲਾਇਸੈਂਸ ਅਰਜ਼ੀ\n\nਭਾਗ ਅ: ਅਰਜ਼ੀਕਰਤਾ ਵੇਰਵੇ\n1. ਅਰਜ਼ੀਕਰਤਾ ਦਾ ਪੂਰਾ ਨਾਮ: ________\n2. ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਮ: ________\n3. ਪਤਾ: ________\n4. ਫ਼ੋਨ ਨੰਬਰ: ________\n5. ਈਮੇਲ: ________\n\nਭਾਗ ਬ: ਫੈਕਟਰੀ ਵੇਰਵੇ\n6. ਫੈਕਟਰੀ ਦਾ ਨਾਮ: ________\n7. ਫੈਕਟਰੀ ਦਾ ਪਤਾ: ________\n8. ਉਤਪਾਦਨ ਦੀ ਕਿਸਮ: ________\n9. ਕੁੱਲ ਬਣਿਆ ਖੇਤਰ (ਵਰਗ ਫੁੱਟ): ________\n10. ਕਾਮਿਆਂ ਦੀ ਗਿਣਤੀ: ________\n11. ਸਾਲਾਨਾ ਉਤਪਾਦਨ (ਟਨ/ਯੂਨਿਟ): ________\n\nਭਾਗ ਸ: ਪਾਲਣਾ\n12. ਪ੍ਰਦੂਸ਼ਣ ਕੰਟਰੋਲ ਬੋਰਡ ਸਹਿਮਤੀ ਨੰ.: ________\n13. ਫਾਇਰ NOC ਨੰਬਰ: ________\n14. ਬਿਜਲੀ ਲੋਡ (KW): ________\n\nਭਾਗ ਡ: ਘੋਸ਼ਣਾ\nਮੈਂ ਘੋਸ਼ਣਾ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਕਿ ਉੱਪਰ ਦਿੱਤੀ ਸਾਰੀ ਜਾਣਕਾਰੀ ਸੱਚ ਹੈ।\nਤਾਰੀਖ: ________\nਦਸਤਖ਼ਤ: ________",
    },
    fieldCount: 14,
    sections: 4,
  },
};


/**
 * TEXT_PHRASES — the offline phrase bank for the free-text translator.
 *
 * Each entry is one sentence a business owner realistically needs while
 * chasing an approval, written in English plus nine Indian languages. The
 * translator matches typed input against these (in either direction), so the
 * demo produces genuine translations with no network call.
 *
 * In production this lookup is replaced by a single Bhashini API request,
 * which covers all 22 scheduled languages and arbitrary sentences.
 */
const TEXT_PHRASES = [
  { en: "What documents are required for a factory license?",
    hi: "कारखाना लाइसेंस के लिए कौन से दस्तावेज़ आवश्यक हैं?",
    mr: "कारखाना परवान्यासाठी कोणती कागदपत्रे आवश्यक आहेत?",
    ta: "தொழிற்சாலை உரிமத்திற்கு என்ன ஆவணங்கள் தேவை?",
    te: "ఫ్యాక్టరీ లైసెన్స్ కోసం ఏ పత్రాలు అవసరం?",
    bn: "কারখানার লাইসেন্সের জন্য কোন কোন নথি প্রয়োজন?",
    gu: "ફેક્ટરી લાયસન્સ માટે કયા દસ્તાવેજો જરૂરી છે?",
    kn: "ಕಾರ್ಖಾನೆ ಪರವಾನಗಿಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?",
    ml: "ഫാക്ടറി ലൈസൻസിനായി ഏതൊക്കെ രേഖകൾ ആവശ്യമാണ്?",
    pa: "ਫੈਕਟਰੀ ਲਾਇਸੈਂਸ ਲਈ ਕਿਹੜੇ ਦਸਤਾਵੇਜ਼ ਲੋੜੀਂਦੇ ਹਨ?" },

  { en: "My application is pending. What is the status?",
    hi: "मेरा आवेदन लंबित है। इसकी स्थिति क्या है?",
    mr: "माझा अर्ज प्रलंबित आहे. त्याची स्थिती काय आहे?",
    ta: "எனது விண்ணப்பம் நிலுவையில் உள்ளது. அதன் நிலை என்ன?",
    te: "నా దరఖాస్తు పెండింగ్‌లో ఉంది. దాని స్థితి ఏమిటి?",
    bn: "আমার আবেদন মুলতুবি রয়েছে। এর অবস্থা কী?",
    gu: "મારી અરજી બાકી છે. તેની સ્થિતિ શું છે?",
    kn: "ನನ್ನ ಅರ್ಜಿ ಬಾಕಿ ಇದೆ. ಅದರ ಸ್ಥಿತಿ ಏನು?",
    ml: "എന്റെ അപേക്ഷ തീർപ്പാക്കാതെ കിടക്കുന്നു. അതിന്റെ നില എന്താണ്?",
    pa: "ਮੇਰੀ ਅਰਜ਼ੀ ਬਕਾਇਆ ਹੈ। ਇਸਦੀ ਸਥਿਤੀ ਕੀ ਹੈ?" },

  { en: "Where is the Pollution Control Board office?",
    hi: "प्रदूषण नियंत्रण मंडल का कार्यालय कहाँ है?",
    mr: "प्रदूषण नियंत्रण मंडळाचे कार्यालय कुठे आहे?",
    ta: "மாசுக்கட்டுப்பாட்டு வாரிய அலுவலகம் எங்கே உள்ளது?",
    te: "కాలుష్య నియంత్రణ బోర్డు కార్యాలయం ఎక్కడ ఉంది?",
    bn: "দূষণ নিয়ন্ত্রণ পর্ষদের অফিস কোথায়?",
    gu: "પ્રદૂષણ નિયંત્રણ બોર્ડની ઓફિસ ક્યાં છે?",
    kn: "ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಮಂಡಳಿಯ ಕಚೇರಿ ಎಲ್ಲಿದೆ?",
    ml: "മലിനീകരണ നിയന്ത്രണ ബോർഡ് ഓഫീസ് എവിടെയാണ്?",
    pa: "ਪ੍ਰਦੂਸ਼ਣ ਕੰਟਰੋਲ ਬੋਰਡ ਦਾ ਦਫ਼ਤਰ ਕਿੱਥੇ ਹੈ?" },

  { en: "I want to book an appointment.",
    hi: "मुझे अपॉइंटमेंट बुक करनी है।",
    mr: "मला भेटीची वेळ ठरवायची आहे.",
    ta: "நான் ஒரு சந்திப்பு நேரம் பதிவு செய்ய விரும்புகிறேன்.",
    te: "నేను అపాయింట్‌మెంట్ బుక్ చేయాలనుకుంటున్నాను.",
    bn: "আমি একটি অ্যাপয়েন্টমেন্ট বুক করতে চাই।",
    gu: "મારે એપોઇન્ટમેન્ટ બુક કરવી છે.",
    kn: "ನಾನು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಕಾಯ್ದಿರಿಸಲು ಬಯಸುತ್ತೇನೆ.",
    ml: "എനിക്ക് ഒരു അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യണം.",
    pa: "ਮੈਂ ਮੁਲਾਕਾਤ ਦਾ ਸਮਾਂ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ।" },

  { en: "The license has expired. How do I renew it?",
    hi: "लाइसेंस की अवधि समाप्त हो गई है। इसे कैसे नवीनीकृत करें?",
    mr: "परवान्याची मुदत संपली आहे. त्याचे नूतनीकरण कसे करावे?",
    ta: "உரிமத்தின் காலம் முடிந்துவிட்டது. அதை எப்படி புதுப்பிப்பது?",
    te: "లైసెన్స్ గడువు ముగిసింది. దాన్ని ఎలా పునరుద్ధరించాలి?",
    bn: "লাইসেন্সের মেয়াদ শেষ হয়ে গেছে। এটি কীভাবে নবায়ন করব?",
    gu: "લાયસન્સની મુદત પૂરી થઈ ગઈ છે. તેને કેવી રીતે રિન્યુ કરવું?",
    kn: "ಪರವಾನಗಿಯ ಅವಧಿ ಮುಗಿದಿದೆ. ಅದನ್ನು ಹೇಗೆ ನವೀಕರಿಸುವುದು?",
    ml: "ലൈസൻസിന്റെ കാലാവധി കഴിഞ്ഞു. അത് എങ്ങനെ പുതുക്കാം?",
    pa: "ਲਾਇਸੈਂਸ ਦੀ ਮਿਆਦ ਪੁੱਗ ਗਈ ਹੈ। ਇਸਨੂੰ ਕਿਵੇਂ ਨਵਿਆਇਆ ਜਾਵੇ?" },

  { en: "How much is the application fee?",
    hi: "आवेदन शुल्क कितना है?",
    mr: "अर्ज शुल्क किती आहे?",
    ta: "விண்ணப்பக் கட்டணம் எவ்வளவு?",
    te: "దరఖాస్తు రుసుము ఎంత?",
    bn: "আবেদন ফি কত?",
    gu: "અરજી ફી કેટલી છે?",
    kn: "ಅರ್ಜಿ ಶುಲ್ಕ ಎಷ್ಟು?",
    ml: "അപേക്ഷാ ഫീസ് എത്രയാണ്?",
    pa: "ਅਰਜ਼ੀ ਫੀਸ ਕਿੰਨੀ ਹੈ?" },

  { en: "How many days will the approval take?",
    hi: "मंजूरी में कितने दिन लगेंगे?",
    mr: "मंजुरीसाठी किती दिवस लागतील?",
    ta: "ஒப்புதல் பெற எத்தனை நாட்கள் ஆகும்?",
    te: "ఆమోదానికి ఎన్ని రోజులు పడుతుంది?",
    bn: "অনুমোদনে কত দিন লাগবে?",
    gu: "મંજૂરીમાં કેટલા દિવસ લાગશે?",
    kn: "ಅನುಮೋದನೆಗೆ ಎಷ್ಟು ದಿನ ಬೇಕಾಗುತ್ತದೆ?",
    ml: "അംഗീകാരം ലഭിക്കാൻ എത്ര ദിവസം എടുക്കും?",
    pa: "ਮਨਜ਼ੂਰੀ ਵਿੱਚ ਕਿੰਨੇ ਦਿਨ ਲੱਗਣਗੇ?" },

  { en: "Which officer should I meet?",
    hi: "मुझे किस अधिकारी से मिलना चाहिए?",
    mr: "मी कोणत्या अधिकाऱ्याला भेटावे?",
    ta: "நான் எந்த அதிகாரியை சந்திக்க வேண்டும்?",
    te: "నేను ఏ అధికారిని కలవాలి?",
    bn: "আমি কোন কর্মকর্তার সাথে দেখা করব?",
    gu: "મારે કયા અધિકારીને મળવું જોઈએ?",
    kn: "ನಾನು ಯಾವ ಅಧಿಕಾರಿಯನ್ನು ಭೇಟಿ ಮಾಡಬೇಕು?",
    ml: "ഞാൻ ഏത് ഉദ്യോഗസ്ഥനെ കാണണം?",
    pa: "ਮੈਨੂੰ ਕਿਹੜੇ ਅਧਿਕਾਰੀ ਨੂੰ ਮਿਲਣਾ ਚਾਹੀਦਾ ਹੈ?" },

  { en: "I need help filling this application.",
    hi: "मुझे यह आवेदन भरने में मदद चाहिए।",
    mr: "मला हा अर्ज भरण्यासाठी मदत हवी आहे.",
    ta: "இந்த விண்ணப்பத்தை நிரப்ப எனக்கு உதவி தேவை.",
    te: "ఈ దరఖాస్తును పూరించడానికి నాకు సహాయం కావాలి.",
    bn: "এই আবেদনপত্র পূরণ করতে আমার সাহায্য দরকার।",
    gu: "આ અરજી ભરવામાં મને મદદ જોઈએ છે.",
    kn: "ಈ ಅರ್ಜಿಯನ್ನು ಭರ್ತಿ ಮಾಡಲು ನನಗೆ ಸಹಾಯ ಬೇಕು.",
    ml: "ഈ അപേക്ഷ പൂരിപ്പിക്കാൻ എനിക്ക് സഹായം വേണം.",
    pa: "ਮੈਨੂੰ ਇਹ ਅਰਜ਼ੀ ਭਰਨ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ।" },

  { en: "My documents are ready for verification.",
    hi: "मेरे दस्तावेज़ सत्यापन के लिए तैयार हैं।",
    mr: "माझी कागदपत्रे पडताळणीसाठी तयार आहेत.",
    ta: "எனது ஆவணங்கள் சரிபார்ப்புக்கு தயாராக உள்ளன.",
    te: "నా పత్రాలు ధృవీకరణ కోసం సిద్ధంగా ఉన్నాయి.",
    bn: "আমার নথিপত্র যাচাইয়ের জন্য প্রস্তুত।",
    gu: "મારા દસ્તાવેજો ચકાસણી માટે તૈયાર છે.",
    kn: "ನನ್ನ ದಾಖಲೆಗಳು ಪರಿಶೀಲನೆಗೆ ಸಿದ್ಧವಾಗಿವೆ.",
    ml: "എന്റെ രേഖകൾ പരിശോധനയ്ക്കായി തയ്യാറാണ്.",
    pa: "ਮੇਰੇ ਦਸਤਾਵੇਜ਼ ਤਸਦੀਕ ਲਈ ਤਿਆਰ ਹਨ।" },
];

/**
 * GLOSSARY — single-term fallback used when a typed sentence is not in the
 * phrase bank. We translate whatever domain terms we recognise and clearly
 * label the result as partial, rather than inventing a full sentence.
 */
const GLOSSARY = {
  license:      { hi: "लाइसेंस", mr: "परवाना", ta: "உரிமம்", te: "లైసెన్స్", bn: "লাইসেন্স", gu: "લાયસન્સ", kn: "ಪರವಾನಗಿ", ml: "ലൈസൻസ്", pa: "ਲਾਇਸੈਂਸ" },
  application:  { hi: "आवेदन", mr: "अर्ज", ta: "விண்ணப்பம்", te: "దరఖాస్తు", bn: "আবেদন", gu: "અરજી", kn: "ಅರ್ಜಿ", ml: "അപേക്ഷ", pa: "ਅਰਜ਼ੀ" },
  document:     { hi: "दस्तावेज़", mr: "कागदपत्र", ta: "ஆவணம்", te: "పత్రం", bn: "নথি", gu: "દસ્તાવેજ", kn: "ದಾಖಲೆ", ml: "രേഖ", pa: "ਦਸਤਾਵੇਜ਼" },
  office:       { hi: "कार्यालय", mr: "कार्यालय", ta: "அலுவலகம்", te: "కార్యాలయం", bn: "অফিস", gu: "ઓફિસ", kn: "ಕಚೇರಿ", ml: "ഓഫീസ്", pa: "ਦਫ਼ਤਰ" },
  fee:          { hi: "शुल्क", mr: "शुल्क", ta: "கட்டணம்", te: "రుసుము", bn: "ফি", gu: "ફી", kn: "ಶುಲ್ಕ", ml: "ഫീസ്", pa: "ਫੀਸ" },
  approval:     { hi: "मंजूरी", mr: "मंजुरी", ta: "ஒப்புதல்", te: "ఆమోదం", bn: "অনুমোদন", gu: "મંજૂરી", kn: "ಅನುಮೋದನೆ", ml: "അംഗീകാരം", pa: "ਮਨਜ਼ੂਰੀ" },
  factory:      { hi: "कारखाना", mr: "कारखाना", ta: "தொழிற்சாலை", te: "ఫ్యాక్టరీ", bn: "কারখানা", gu: "ફેક્ટરી", kn: "ಕಾರ್ಖಾನೆ", ml: "ഫാക്ടറി", pa: "ਫੈਕਟਰੀ" },
  pollution:    { hi: "प्रदूषण", mr: "प्रदूषण", ta: "மாசு", te: "కాలుష్యం", bn: "দূষণ", gu: "પ્રદૂષણ", kn: "ಮಾಲಿನ್ಯ", ml: "മലിനീകരണം", pa: "ਪ੍ਰਦੂਸ਼ਣ" },
  fire:         { hi: "अग्निशमन", mr: "अग्निशमन", ta: "தீயணைப்பு", te: "అగ్నిమాపక", bn: "অগ্নিনির্বাপণ", gu: "ફાયર", kn: "ಅಗ್ನಿಶಾಮಕ", ml: "അഗ്നിശമന", pa: "ਅੱਗ" },
  registration: { hi: "पंजीकरण", mr: "नोंदणी", ta: "பதிவு", te: "నమోదు", bn: "নিবন্ধন", gu: "નોંધણી", kn: "ನೋಂದಣಿ", ml: "രജിസ്ട്രേഷൻ", pa: "ਰਜਿਸਟਰੇਸ਼ਨ" },
  officer:      { hi: "अधिकारी", mr: "अधिकारी", ta: "அதிகாரி", te: "అధికారి", bn: "কর্মকর্তা", gu: "અધિકારી", kn: "ಅಧಿಕಾರಿ", ml: "ഉദ്യോഗസ്ഥൻ", pa: "ਅਧਿਕਾਰੀ" },
  appointment:  { hi: "अपॉइंटमेंट", mr: "भेटीची वेळ", ta: "சந்திப்பு", te: "అపాయింట్‌మెంట్", bn: "অ্যাপয়েন্টমেন্ট", gu: "એપોઇન્ટમેન્ટ", kn: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್", ml: "അപ്പോയിന്റ്മെന്റ്", pa: "ਮੁਲਾਕਾਤ" },
};

/**
 * translateText — the free-text translation engine for the demo.
 *
 * direction 'toLocal'  : English in  -> selected language out
 * direction 'toEnglish': selected language in -> English out
 *
 * Strategy, in order:
 *   1. exact match against TEXT_PHRASES (whitespace/case/punctuation tolerant)
 *   2. substring match, so a slightly reworded sentence still resolves
 *   3. GLOSSARY term substitution, returned as a clearly-labelled partial
 */
function translateText(input, langCode, direction) {
  const norm = (t) => t.trim().toLowerCase().replace(/[.?!।]+$/g, "").replace(/\s+/g, " ");
  const q = norm(input);
  if (!q) return null;

  const from = direction === "toLocal" ? "en" : langCode;
  const to   = direction === "toLocal" ? langCode : "en";

  // 1 + 2: phrase bank
  let hit = TEXT_PHRASES.find(ph => norm(ph[from] || "") === q);
  if (!hit) hit = TEXT_PHRASES.find(ph => ph[from] && (norm(ph[from]).includes(q) || q.includes(norm(ph[from]))));
  if (hit && hit[to]) {
    return { text: hit[to], quality: "exact", note: "Matched a known phrase — full sentence translation." };
  }

  // 3: glossary fallback
  const found = [];
  if (direction === "toLocal") {
    Object.keys(GLOSSARY).forEach(term => {
      if (q.includes(term)) found.push({ src: term, out: GLOSSARY[term][langCode] });
    });
  } else {
    Object.keys(GLOSSARY).forEach(term => {
      const local = GLOSSARY[term][langCode];
      if (local && input.includes(local)) found.push({ src: local, out: term });
    });
  }

  if (found.length) {
    return {
      text: found.map(f => f.out).join(", "),
      quality: "partial",
      terms: found,
      note: `Recognised ${found.length} known term${found.length > 1 ? "s" : ""}. A full-sentence translation needs the Bhashini API, which is stubbed out in this offline demo.`,
    };
  }

  return {
    text: null,
    quality: "none",
    note: "This sentence is not in the offline phrase bank. In production this request goes to the Bhashini API, which handles arbitrary text across all 22 scheduled languages. Try one of the sample phrases below to see a full translation.",
  };
}

/**
 * TranslatePage — Scan & Translate, with two distinct modes.
 *
 *   MODE 'filled'  The user photographs a form they have ALREADY filled in a
 *                  local language. Pipeline: OCR -> detect language ->
 *                  translate every field -> validate every value. Output is a
 *                  field-by-field table showing the original, the English
 *                  translation, and a fix instruction where something is wrong
 *                  (short phone number, missing PIN code, blank mandatory
 *                  field, invalid Aadhaar length, and so on).
 *
 *   MODE 'blank'   The user photographs an UNFILLED English government form
 *                  and picks a language. Pipeline: OCR -> translate all labels
 *                  and instructions. Output is the English original beside the
 *                  translated version so they can fill the official English
 *                  form while reading their own language.
 *
 * generateDemoImage() paints a canvas so the demo works with no sample files
 * on disk; a real uploaded image is read via FileReader and used as-is.
 */
function TranslatePage() {
  const { t } = useT();
  const [mode, setMode] = useState(null); // "filled" | "blank"
  const [imagePreview, setImagePreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [targetLang, setTargetLang] = useState("hi");

  // Filled doc state
  const [filledScenario, setFilledScenario] = useState("hindi_filled");
  const [filledPipeline, setFilledPipeline] = useState({ stage: "idle" });
  const [filledResult, setFilledResult] = useState(null);

  // Blank form state
  const [blankScenario] = useState("factory_form");
  const [blankPipeline, setBlankPipeline] = useState({ stage: "idle" });
  const [blankResult, setBlankResult] = useState(null);

  // Type & translate state
  const [textInput, setTextInput] = useState("");
  const [textDir, setTextDir] = useState("toLocal"); // toLocal | toEnglish
  const [textResult, setTextResult] = useState(null);
  const [textBusy, setTextBusy] = useState(false);

  const runTextTranslate = (overrideInput) => {
    const src = overrideInput !== undefined ? overrideInput : textInput;
    if (!src.trim()) return;
    setTextBusy(true); setTextResult(null);
    setTimeout(() => {
      setTextResult({ input: src, ...translateText(src, targetLang, textDir) });
      setTextBusy(false);
    }, 900);
  };

  const swapDirection = () => {
    const newDir = textDir === "toLocal" ? "toEnglish" : "toLocal";
    setTextDir(newDir);
    // carry the previous output into the input so the user can translate back
    if (textResult?.text) { setTextInput(textResult.text); setTextResult(null); }
    else { setTextInput(""); setTextResult(null); }
  };

  const filledScenarios = [
    { id: "hindi_filled", label: "Factory License (Hindi)", desc: "Hindi filled form — finds missing PIN code, short phone number, blank mandatory field" },
    { id: "marathi_filled", label: "Pollution NOC (Marathi)", desc: "Marathi filled form — flags missing CTO number and effluent ratio warning" },
    { id: "tamil_filled", label: "MSME Registration (Tamil)", desc: "Tamil filled form — catches invalid Aadhaar and missing NIC code" },
  ];

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setFilledResult(null);
    setBlankResult(null);
    setFilledPipeline({ stage: "idle" });
    setBlankPipeline({ stage: "idle" });
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const generateDemoImage = (title, lines) => {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, 420, 300);
    ctx.fillStyle = "#1e3a5f"; ctx.fillRect(0, 0, 420, 40);
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.fillText(title, 14, 26);
    ctx.fillStyle = "#334155"; ctx.font = "10px monospace";
    lines.forEach((l, i) => ctx.fillText(l.substring(0, 60), 14, 62 + i * 15));
    ctx.strokeStyle = "#cbd5e1"; ctx.strokeRect(3, 3, 414, 294);
    return canvas.toDataURL("image/png");
  };

  const useDemoFilled = () => {
    const tpl = FILLED_DOC_DB[filledScenario];
    setImagePreview(generateDemoImage(tpl.type, tpl.ocrText.split("\n").slice(0, 15)));
    setFileName(`${filledScenario}.png`);
    setFilledResult(null); setFilledPipeline({ stage: "idle" });
  };

  const useDemoBlank = () => {
    const tpl = BLANK_FORM_DB[blankScenario];
    setImagePreview(generateDemoImage(tpl.type, tpl.sourceText.split("\n").slice(0, 15)));
    setFileName("blank_form.png");
    setBlankResult(null); setBlankPipeline({ stage: "idle" });
  };

  const runFilledPipeline = () => {
    if (!imagePreview) return;
    const tpl = FILLED_DOC_DB[filledScenario];
    setFilledPipeline({ stage: "ocr" }); setFilledResult(null);
    setTimeout(() => {
      setFilledPipeline({ stage: "lang" });
      setTimeout(() => {
        setFilledPipeline({ stage: "translate" });
        setTimeout(() => {
          setFilledPipeline({ stage: "validate" });
          setTimeout(() => {
            setFilledPipeline({ stage: "done" });
            setFilledResult(tpl);
          }, 1400);
        }, 1800);
      }, 1000);
    }, 1600);
  };

  const runBlankPipeline = () => {
    if (!imagePreview) return;
    setBlankPipeline({ stage: "ocr" }); setBlankResult(null);
    setTimeout(() => {
      setBlankPipeline({ stage: "translate" });
      setTimeout(() => {
        setBlankPipeline({ stage: "done" });
        setBlankResult(BLANK_FORM_DB[blankScenario]);
      }, 2000);
    }, 1600);
  };

  const resetAll = () => {
    setImagePreview(null); setFileName(""); setFilledResult(null); setBlankResult(null);
    setFilledPipeline({ stage: "idle" }); setBlankPipeline({ stage: "idle" });
  };

  const Spinner = () => <span className="inline-block w-4 h-4 border-2 border-[#176B63] border-t-transparent rounded-full animate-spin" />;

  const Step = ({ icon: Icon, label, active, done, children }) => (
    <div className={`p-3.5 rounded-lg border transition-all ${done ? "bg-emerald-50 border-emerald-200" : active ? "bg-[#176B63]/10 border-[#176B63]/30 ring-2 ring-[#DDF3EE]" : "bg-slate-50 border-slate-200 opacity-40"}`}>
      <div className="flex items-center gap-2">
        {done ? <CheckCircle size={15} className="text-emerald-600" /> : active ? <Spinner /> : <Icon size={15} className="text-slate-400" />}
        <p className={`text-sm font-medium ${done ? "text-emerald-700" : active ? "text-[#0F5B54]" : "text-slate-400"}`}>{label}</p>
      </div>
      {(active || done) && children && <div className="mt-1.5 ml-6 text-xs text-slate-500">{children}</div>}
    </div>
  );

  // --- MODE SELECTION ---
  if (!mode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{t("tr.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("tr.subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button onClick={() => setMode("filled")} className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-[#176B63]/60 hover:bg-[#176B63]/10 transition-all group">
            <div className="w-11 h-11 bg-[#176B63]/15 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#CFE9E3] transition-colors">
              <FileCheck size={22} className="text-[#176B63]" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{t("tr.mFilled")}</h3>
            <p className="text-sm text-slate-500">{t("tr.mFilledDesc")}</p>
            <p className="text-xs text-[#176B63] font-medium mt-3 flex items-center gap-1">{t("tr.selectMode")} <ChevronRight size={12} /></p>
          </button>
          <button onClick={() => setMode("blank")} className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-[#B8DDD5] hover:bg-[#E8F7F4] transition-all group">
            <div className="w-11 h-11 bg-[#DDF3EE] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#CFE9E3] transition-colors">
              <Languages size={22} className="text-[#176B63]" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{t("tr.mBlank")}</h3>
            <p className="text-sm text-slate-500">{t("tr.mBlankDesc")}</p>
            <p className="text-xs text-[#176B63] font-medium mt-3 flex items-center gap-1">{t("tr.selectMode")} <ChevronRight size={12} /></p>
          </button>
          <button onClick={() => setMode("text")} className="md:col-span-2 bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-teal-300 hover:bg-teal-50 transition-all group">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-teal-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                <Type size={22} className="text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">{t("tr.mText")}</h3>
                <p className="text-sm text-slate-500">{t("tr.mTextDesc")}</p>
                <p className="text-xs text-teal-600 font-medium mt-3 flex items-center gap-1">{t("tr.selectMode")} <ChevronRight size={12} /></p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // --- FILLED DOCUMENT MODE ---
  if (mode === "filled") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode(null); resetAll(); }} className="text-slate-400 hover:text-slate-600">←</button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{t("tr.filledTitle")}</h1>
            <p className="text-slate-500 text-sm">{t("tr.filledSub")}</p>
          </div>
        </div>

        {/* Scenario picker */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("tr.scenarios")}</h3>
          <div className="space-y-2">
            {filledScenarios.map(s => (
              <button key={s.id} onClick={() => { setFilledScenario(s.id); resetAll(); }} className={`w-full text-left p-3 rounded-lg border transition-all ${filledScenario === s.id ? "border-[#176B63]/60 bg-[#176B63]/10" : "border-slate-200 hover:bg-slate-50"}`}>
                <p className={`text-sm font-medium ${filledScenario === s.id ? "text-[#0F5B54]" : "text-slate-700"}`}>{s.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          {!imagePreview ? (
            <div>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-[#176B63]/70 bg-[#176B63]/10" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => document.getElementById("fInput").click()}>
                <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600 font-medium">{t("tr.dropFilled")}</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG</p>
                <input id="fInput" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div className="mt-3 text-center"><button onClick={useDemoFilled} className="text-sm text-[#176B63] font-medium hover:underline">{t("tr.useDemo")}</button></div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-40 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                <img src={imagePreview} alt="doc" className="w-full h-auto" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{filledScenarios.find(s=>s.id===filledScenario)?.label}</p>
                <div className="flex gap-2 mt-3">
                  {filledPipeline.stage === "idle" && <button onClick={runFilledPipeline} className="bg-[#176B63] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#12564F] flex items-center gap-2"><ScanLine size={14} /> {t("tr.scanValidate")}</button>}
                  <button onClick={resetAll} className="border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"><RotateCcw size={14} /> {t("tr.reset")}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        {filledPipeline.stage !== "idle" && (
          <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("tr.processing")}</h3>
            <Step icon={ScanLine} label="OCR — Extracting text from image" active={filledPipeline.stage==="ocr"} done={["lang","translate","validate","done"].includes(filledPipeline.stage)} />
            <Step icon={Globe} label="Detecting document language" active={filledPipeline.stage==="lang"} done={["translate","validate","done"].includes(filledPipeline.stage)}>
              {filledResult && <span>Detected: {filledResult.sourceLang}</span>}
            </Step>
            <Step icon={Languages} label="Translating all fields to English" active={filledPipeline.stage==="translate"} done={["validate","done"].includes(filledPipeline.stage)} />
            <Step icon={ShieldCheck} label="Validating each field" active={filledPipeline.stage==="validate"} done={filledPipeline.stage==="done"}>
              {filledResult && <span>{filledResult.summary.valid}/{filledResult.summary.total} fields valid · {filledResult.summary.errors} errors · {filledResult.summary.warnings} warnings</span>}
            </Step>
          </div>
        )}

        {/* Filled results */}
        {filledResult && filledPipeline.stage === "done" && (
          <div className="space-y-5">
            {/* Summary */}
            <div className={`rounded-xl border p-5 ${filledResult.summary.errors > 0 ? "bg-red-50 border-red-200" : filledResult.summary.warnings > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex items-center gap-3">
                {filledResult.summary.errors > 0 ? <XCircle size={22} className="text-red-600" /> : filledResult.summary.warnings > 0 ? <AlertTriangle size={22} className="text-amber-600" /> : <CheckCircle size={22} className="text-emerald-600" />}
                <div>
                  <p className={`font-semibold ${filledResult.summary.errors > 0 ? "text-red-800" : filledResult.summary.warnings > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                    {filledResult.summary.errors > 0 ? `${filledResult.summary.errors} field(s) need correction before submission` : filledResult.summary.warnings > 0 ? "Review recommended — some fields have warnings" : "All fields look correct"}
                  </p>
                  <p className={`text-sm ${filledResult.summary.errors > 0 ? "text-red-600" : filledResult.summary.warnings > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {filledResult.type} · {filledResult.summary.valid} valid, {filledResult.summary.warnings} warnings, {filledResult.summary.errors} errors
                  </p>
                </div>
              </div>
            </div>

            {/* Field-by-field table */}
            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)]">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">{t("tr.fieldReview")}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t("tr.fieldReviewSub")}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {filledResult.extractedFields.map((f, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-1.5">
                      <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                      {f.status === "valid" && <CheckCircle size={15} className="text-emerald-500" />}
                      {f.status === "error" && <XCircle size={15} className="text-red-500" />}
                      {f.status === "warning" && <AlertTriangle size={15} className="text-amber-500" />}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded px-3 py-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">{t("tr.original")}</p>
                        <p className="text-sm text-slate-700">{f.value}</p>
                      </div>
                      <div className="bg-[#176B63]/10 rounded px-3 py-2">
                        <p className="text-[10px] text-[#12564F] mb-0.5">{t("tr.translated")}</p>
                        <p className="text-sm text-slate-700">{f.translated}</p>
                      </div>
                    </div>
                    {f.suggestion && (
                      <div className={`mt-2 px-3 py-2 rounded text-xs flex items-start gap-2 ${f.status === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                        {f.status === "error" ? <XCircle size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                        <span><strong>{t("tr.fixNeeded")}</strong> {f.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Full text side by side */}
            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
              <h3 className="font-semibold text-slate-800 mb-4">{t("tr.fullDoc")}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">ORIGINAL ({filledResult.sourceLang})</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{filledResult.ocrText}</pre>
                </div>
                <div className="bg-[#176B63]/10 rounded-lg p-4">
                  <p className="text-xs font-medium text-[#176B63] mb-2">{t("tr.english")}</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{filledResult.translatedText}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- TYPE & TRANSLATE MODE (free text, both directions) ---
  if (mode === "text") {
    const localName = TARGET_LANGS[targetLang];
    const fromLabel = textDir === "toLocal" ? "English" : localName;
    const toLabel   = textDir === "toLocal" ? localName : "English";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode(null); setTextInput(""); setTextResult(null); }} className="text-slate-400 hover:text-slate-600">←</button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{t("tr.textTitle")}</h1>
            <p className="text-slate-500 text-sm">{t("tr.textSub")}</p>
          </div>
        </div>

        {/* Language + direction */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("tr.yourLang")}</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TARGET_LANGS).filter(([k]) => k !== "en").map(([k, v]) => (
                <button key={k} onClick={() => { setTargetLang(k); setTextResult(null); }}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${targetLang === k ? "bg-teal-50 border-teal-300 text-[#176B63]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("tr.direction")}</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">{t("tr.from")}</p>
                <p className="text-sm font-semibold text-slate-800">{fromLabel}</p>
              </div>
              <button onClick={swapDirection} title="Swap direction"
                className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 shrink-0 transition-colors">
                <RotateCcw size={16} />
              </button>
              <div className="flex-1 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-teal-500 mb-0.5">{t("tr.to")}</p>
                <p className="text-sm font-semibold text-[#0B4F49]">{toLabel}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">{t("tr.swapHint")}</p>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t("tr.typeIn", fromLabel)}</label>
          <textarea value={textInput} onChange={e => { setTextInput(e.target.value); setTextResult(null); }} rows={3}
            placeholder={textDir === "toLocal" ? "e.g. What documents are required for a factory license?" : `Type your question in ${localName}...`}
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button onClick={() => runTextTranslate()} disabled={!textInput.trim() || textBusy}
              className="bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:bg-slate-300 flex items-center gap-2">
              {textBusy ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("tr.translating")}</> : <><Languages size={14} /> {t("tr.translateTo", toLabel)}</>}
            </button>
            {textInput && <button onClick={() => { setTextInput(""); setTextResult(null); }} className="text-sm text-slate-500 hover:text-slate-700">{t("tr.clear")}</button>}
          </div>
        </div>

        {/* Result */}
        {textResult && (
          <div className="space-y-3">
            {textResult.text ? (
              <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                  {textResult.quality === "exact"
                    ? <><CheckCircle size={16} className="text-emerald-600" /><p className="text-sm font-medium text-emerald-700">{t("tr.fullTranslation")}</p></>
                    : <><AlertTriangle size={16} className="text-amber-600" /><p className="text-sm font-medium text-amber-700">{t("tr.partial")}</p></>}
                </div>
                <div className="p-5 grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">{fromLabel.toUpperCase()}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{textResult.input}</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-teal-600 mb-2">{toLabel.toUpperCase()}</p>
                    <p className="text-base text-slate-800 leading-relaxed">{textResult.text}</p>
                  </div>
                </div>
                {textResult.terms && (
                  <div className="px-5 pb-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">{t("tr.termsFound")}</p>
                    <div className="flex flex-wrap gap-2">
                      {textResult.terms.map((t, i) => (
                        <span key={i} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
                          {t.src} <span className="text-slate-300 mx-1">→</span> <strong>{t.out}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-5 pb-5">
                  <p className="text-xs text-slate-400">{textResult.note}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">{textResult.note}</p>
              </div>
            )}
          </div>
        )}

        {/* Sample phrases */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">{t("tr.common")}</h3>
          <p className="text-xs text-slate-400 mb-3">{t("tr.commonSub")}</p>
          <div className="space-y-2">
            {TEXT_PHRASES.map((ph, i) => {
              const shown = textDir === "toLocal" ? ph.en : ph[targetLang];
              return (
                <button key={i} onClick={() => { setTextInput(shown); runTextTranslate(shown); }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all text-sm text-slate-700">
                  {shown}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- BLANK FORM MODE ---
  if (mode === "blank") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode(null); resetAll(); }} className="text-slate-400 hover:text-slate-600">←</button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{t("tr.blankTitle")}</h1>
            <p className="text-slate-500 text-sm">{t("tr.blankSub")}</p>
          </div>
        </div>

        {/* Language picker */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("tr.translateInto")}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TARGET_LANGS).filter(([k]) => k !== "en").map(([k, v]) => (
              <button key={k} onClick={() => setTargetLang(k)} className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${targetLang === k ? "bg-[#E8F7F4] border-[#B8DDD5] text-[#0F5B54]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
          {!imagePreview ? (
            <div>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-[#8FC9BE] bg-[#E8F7F4]" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => document.getElementById("bInput").click()}>
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600 font-medium">{t("tr.dropBlank")}</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG</p>
                <input id="bInput" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div className="mt-3 text-center"><button onClick={useDemoBlank} className="text-sm text-[#176B63] font-medium hover:underline">{t("tr.useDemoBlank")}</button></div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-40 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                <img src={imagePreview} alt="form" className="w-full h-auto" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("tr.willTranslate")} <strong>{TARGET_LANGS[targetLang]}</strong></p>
                <div className="flex gap-2 mt-3">
                  {blankPipeline.stage === "idle" && <button onClick={runBlankPipeline} className="bg-[#176B63] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0F5B54] flex items-center gap-2"><Languages size={14} /> {t("tr.scanTranslate")}</button>}
                  <button onClick={resetAll} className="border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"><RotateCcw size={14} /> {t("tr.reset")}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        {blankPipeline.stage !== "idle" && (
          <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("tr.processing")}</h3>
            <Step icon={ScanLine} label="OCR — Extracting form text" active={blankPipeline.stage==="ocr"} done={["translate","done"].includes(blankPipeline.stage)} />
            <Step icon={Languages} label={`Translating form to ${TARGET_LANGS[targetLang]}`} active={blankPipeline.stage==="translate"} done={blankPipeline.stage==="done"}>
              {blankResult && <span>{blankResult.fieldCount} fields across {blankResult.sections} sections translated</span>}
            </Step>
          </div>
        )}

        {/* Blank form results */}
        {blankResult && blankPipeline.stage === "done" && (
          <div className="space-y-5">
            <div className="bg-[#E8F7F4] border border-[#CFE9E3] rounded-xl p-5 flex items-center gap-3">
              <CheckCircle size={22} className="text-[#176B63]" />
              <div>
                <p className="font-semibold text-[#0B4F49]">{t("tr.formTranslated", TARGET_LANGS[targetLang])}</p>
                <p className="text-sm text-[#176B63]">{blankResult.fieldCount} fields · {blankResult.sections} sections · Ready to print or fill</p>
              </div>
            </div>

            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5">
              <h3 className="font-semibold text-slate-800 mb-4">{t("tr.sideBySide", TARGET_LANGS[targetLang])}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">ORIGINAL (English)</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{blankResult.sourceText}</pre>
                </div>
                <div className="bg-[#E8F7F4] rounded-lg p-4">
                  <p className="text-xs font-medium text-[#176B63] mb-2">TRANSLATED ({TARGET_LANGS[targetLang]})</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{blankResult.translations[targetLang] || "Translation not available for this language in demo. In production, Bhashini API handles all 22 scheduled languages."}</pre>
                </div>
              </div>
            </div>

            <div className="bg-[#176B63]/10 border border-[#176B63]/30 rounded-xl p-4">
              <p className="text-sm text-[#0B4F49]">
                <strong>{t("tr.howToUse")}</strong> {t("tr.howToUseBody")}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// ==========================================================================
//  CHANNEL ROUTING — ONLINE PORTALS vs PHYSICAL OFFICE VISITS
// --------------------------------------------------------------------------
//  APPROVAL_CHANNELS maps an approval NAME to how it is actually obtained.
//  
//    mode: 'online'  -> finishable on a government portal. We show the real
//                       URL and the practical catch to watch out for.
//    mode: 'offline' -> must be done in person. We store the office address,
//                       working hours, the regional head's name and contact,
//                       the ordered steps to follow on the day, and the exact
//                       documents to carry.
//    mode: 'hybrid'  -> filed online first, then an in-person hearing.
//  
//  This object is the single source of truth for the office-visit panel that
//  opens inside the roadmap when a user presses 'Start Application'.
// ==========================================================================

const APPROVAL_CHANNELS = {
  "Factory License": {
    mode: "offline",
    reason: "Requires physical site inspection by the Factory Inspector before license issue",
    office: {
      name: "Directorate of Industrial Safety & Health",
      dept: "Labour Department, Govt. of Maharashtra",
      address: "Udyog Bhavan, 3rd Floor, Central Ave Rd, Nashik - 422001",
      district: "Nashik",
      phone: "0253-2452871",
      email: "dish.nashik@maharashtra.gov.in",
      head: "Shri. Prakash R. Jadhav",
      designation: "Joint Director, Industrial Safety & Health (Nashik Division)",
      hours: "Mon-Fri, 10:00 AM - 5:30 PM (Lunch 1:30-2:15 PM)",
      mapQuery: "Udyog Bhavan Nashik Maharashtra",
    },
    carry: ["Original application form (Form 1)", "Site plan approved by architect", "Building stability certificate", "PCB consent copy", "Fire NOC copy", "Ownership/lease deed", "PAN & Aadhaar of applicant", "2 passport photos", "Fee challan (₹5,000)"],
    steps: [
      { title: "Book appointment slot", detail: "Select a date and time below. You'll get a token number by SMS." },
      { title: "Pay the fee online first", detail: "Pay ₹5,000 via the Maharashtra treasury portal and print the challan. Cash is not accepted at the counter." },
      { title: "Reach counter 4, 3rd floor", detail: "Show your token number at the reception desk on the ground floor to get a visitor pass." },
      { title: "Document verification", detail: "The clerk checks originals against photocopies. Keep both sets separated and in order." },
      { title: "Site inspection scheduling", detail: "The inspector assigns an inspection date, usually within 10-15 working days of your visit." },
      { title: "Collect acknowledgement", detail: "Do not leave without the stamped acknowledgement slip — it carries your application reference number." },
    ],
  },
  "Pollution Control Board Consent": {
    mode: "hybrid",
    reason: "Application is filed online, but Red-category units need an in-person technical hearing",
    onlineUrl: "https://ecmpcb.mpcb.gov.in",
    office: {
      name: "Maharashtra Pollution Control Board — Regional Office",
      dept: "MPCB, Environment Department",
      address: "Udyog Bhavan, 2nd Floor, Trimbak Road, Nashik - 422002",
      district: "Nashik",
      phone: "0253-2314044",
      email: "ronashik@mpcb.gov.in",
      head: "Shri. Amar V. Durgule",
      designation: "Regional Officer, MPCB Nashik Region",
      hours: "Mon-Fri, 10:00 AM - 5:45 PM",
      mapQuery: "MPCB Regional Office Nashik",
    },
    carry: ["Online application printout with reference number", "Project report / DPR", "Water balance chart", "ETP design and capacity certificate", "Land documents", "Consent fee receipt", "Authorized signatory board resolution"],
    steps: [
      { title: "File the application online", detail: "Submit on the MPCB portal first. The offline hearing only happens after you have a reference number." },
      { title: "Book your hearing slot", detail: "Pick a date below. Red-category units are heard on Tuesdays and Thursdays only." },
      { title: "Carry the water balance chart", detail: "This is the single most common reason applications get sent back. Get it signed by a certified environmental consultant." },
      { title: "Attend the technical hearing", detail: "The Regional Officer or Sub-Regional Officer will question you on effluent treatment and disposal. Bring your consultant if possible." },
      { title: "Site visit by field officer", detail: "A field officer visits within 15 days to verify the ETP is installed as described." },
    ],
  },
  "Fire Safety Certificate": {
    mode: "offline",
    reason: "Mandatory physical fire safety audit of the premises",
    office: {
      name: "Nashik Municipal Corporation — Fire Brigade HQ",
      dept: "Fire & Emergency Services, NMC",
      address: "Fire Station Building, Sharanpur Road, Nashik - 422002",
      district: "Nashik",
      phone: "0253-2575101",
      email: "fire@nmc.gov.in",
      head: "Shri. Sanjay S. Bairagi",
      designation: "Chief Fire Officer, Nashik Municipal Corporation",
      hours: "Mon-Sat, 10:00 AM - 6:00 PM",
      mapQuery: "Nashik Municipal Corporation Fire Station Sharanpur Road",
    },
    carry: ["Fire safety plan drawn by a licensed fire consultant", "Building layout with exit routes marked", "Fire equipment purchase invoices", "Occupancy certificate", "Electrical load sanction letter", "Fee receipt (₹2,500 - ₹12,000 by area)"],
    steps: [
      { title: "Get the fire plan prepared", detail: "Only a fire consultant licensed by the Maharashtra Directorate can prepare this. An architect's drawing will be rejected." },
      { title: "Install equipment before applying", detail: "Extinguishers, hydrants, and alarms must already be in place. The audit checks physical presence, not plans." },
      { title: "Book the audit slot", detail: "Choose a date below. The audit team visits your premises — you do not visit the office for this step." },
      { title: "Be present during the audit", detail: "The owner or an authorized representative must be on site with the original documents." },
      { title: "Collect the certificate", detail: "If the audit passes, collect the certificate from the Fire HQ counter after 7 working days." },
    ],
  },
  "GST Registration": {
    mode: "online",
    reason: "Fully online through the GST portal — no office visit needed",
    onlineUrl: "https://www.gst.gov.in",
    note: "Aadhaar authentication replaces physical verification for most applicants. If Aadhaar authentication fails, a physical verification of premises is triggered automatically and an officer visits you.",
  },
  "MSME Registration (Udyam)": {
    mode: "online",
    reason: "Fully online, self-declaration based — no documents to upload, no office visit",
    onlineUrl: "https://udyamregistration.gov.in",
    note: "Registration is free and instant. Beware of private sites charging a fee — the official portal never asks for payment.",
  },
  "Company Registration (MCA)": {
    mode: "online",
    reason: "Filed entirely through the MCA SPICe+ form",
    onlineUrl: "https://www.mca.gov.in",
    note: "Requires a Digital Signature Certificate (DSC) for all directors. Get DSCs issued before starting the form.",
  },
  "Trade License": {
    mode: "offline",
    reason: "Requires ward-level inspection and physical submission at the municipal ward office",
    office: {
      name: "Nashik Municipal Corporation — Ward Office",
      dept: "Health & Licensing Department, NMC",
      address: "Rajiv Gandhi Bhavan, Sharanpur Road, Nashik - 422002",
      district: "Nashik",
      phone: "0253-2222441",
      email: "licensing@nmc.gov.in",
      head: "Smt. Kalpana M. Kute",
      designation: "Deputy Commissioner (Licensing), NMC",
      hours: "Mon-Fri, 10:30 AM - 5:00 PM",
      mapQuery: "Rajiv Gandhi Bhavan Nashik Municipal Corporation",
    },
    carry: ["Filled application form", "Property tax paid receipt", "Rent agreement or ownership proof", "NOC from the property owner", "Aadhaar and PAN", "Passport photos (3)", "Previous year's license (for renewal)"],
    steps: [
      { title: "Check your ward number", detail: "Licenses are issued ward-wise. Applying at the wrong ward office means starting over." },
      { title: "Clear pending property tax", detail: "The system blocks license issue if property tax is outstanding on the premises." },
      { title: "Book your slot", detail: "Pick a date below. Mornings before noon have significantly shorter queues." },
      { title: "Submit and pay at counter", detail: "Fee varies by business type and area. Card payment is accepted at the NMC counter." },
      { title: "Ward inspector visit", detail: "An inspector verifies the premises within 7-10 days before the license is printed." },
    ],
  },
  "Operating Permission": {
    mode: "offline",
    reason: "Final clearance requires all prior approvals to be physically verified together",
    office: {
      name: "District Industries Centre (DIC), Nashik",
      dept: "Directorate of Industries, Govt. of Maharashtra",
      address: "Udyog Bhavan, Ground Floor, Trimbak Road, Nashik - 422002",
      district: "Nashik",
      phone: "0253-2593068",
      email: "dic.nashik@maharashtra.gov.in",
      head: "Shri. Vikas R. Patil",
      designation: "General Manager, District Industries Centre (Nashik)",
      hours: "Mon-Fri, 10:00 AM - 5:45 PM",
      mapQuery: "District Industries Centre Nashik Udyog Bhavan",
    },
    carry: ["Factory License (original)", "PCB Consent (original)", "Fire Safety Certificate (original)", "Udyam registration certificate", "GST certificate", "Electricity connection proof", "Employee register"],
    steps: [
      { title: "Collect all prior approvals first", detail: "This is a consolidation step. If any one of the prior approvals is missing or expired, your visit is wasted." },
      { title: "Book the DIC slot", detail: "Pick a date below. The GM's office handles these on weekday mornings." },
      { title: "Present the full approval set", detail: "The desk officer cross-checks each certificate number against the department database." },
      { title: "Sign the compliance undertaking", detail: "You declare that operating conditions in each approval will be followed. This is legally binding." },
      { title: "Receive operating permission", detail: "Usually issued within 15-20 working days of the visit." },
    ],
  },
};

const TIME_SLOTS = ["10:00 AM", "10:45 AM", "11:30 AM", "12:15 PM", "2:30 PM", "3:15 PM", "4:00 PM", "4:45 PM"];

/**
 * OfficeVisitPanel — rendered INLINE inside a roadmap card, not as its own page.
 *
 * Branches on APPROVAL_CHANNELS[approval.name].mode:
 *
 *   'online'          -> early return. Green panel, the reason no visit is
 *                        needed, the gotcha to watch for, and a button to the
 *                        real government portal.
 *
 *   'offline'/'hybrid'-> the full visit flow:
 *                          WHERE TO GO      address, hours, Google Maps link
 *                          WHO TO MEET      regional head, designation, phone,
 *                                           email (tel: and mailto: links)
 *                          STEP BY STEP     ordered instructions with the
 *                                           practical warnings that actually
 *                                           cause rejected visits
 *                          WHAT TO CARRY    document checklist
 *                          BOOKING          date + slot picker, produces a
 *                                           token number on confirm
 *
 * Props:
 *   approval -> the approval object from the project
 *   booking  -> existing booking for this approval, or undefined
 *   onBook   -> callback(approvalId, booking) lifting state to RoadmapPage
 */
function OfficeVisitPanel({ approval, booking, onBook }) {
  const { t } = useT();
  const ch = APPROVAL_CHANNELS[approval.name];
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0];

  // No channel data mapped for this approval
  if (!ch) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          {t("ov.fetching")}
        </div>
      </div>
    );
  }

  // --- FULLY ONLINE ---
  if (ch.mode === "online") {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Laptop size={18} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 mb-0.5">{t("ov.noVisit")}</p>
              <p className="text-sm text-emerald-700">{ch.reason}</p>
              {ch.note && (
                <div className="mt-2.5 bg-white/70 border border-emerald-100 rounded px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> {ch.note}
                </div>
              )}
              <a href={ch.onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 mt-3">
                {t("ov.openPortal")} <ExternalLink size={13} />
              </a>
              <p className="text-xs text-emerald-600 mt-2 break-all">{ch.onlineUrl}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- OFFLINE / HYBRID ---
  const o = ch.office;
  const confirmBooking = () => {
    if (!date || !slot) return;

    setConfirming(true);

    setTimeout(() => {
      const token = `NSK/${o.district.substring(0, 3).toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`;

      const newBooking = {
        date,
        slot,
        token,
        office: o.name,
        head: o.head,
        designation: o.designation,
        address: o.address,
        phone: o.phone,
        email: o.email,
        hours: o.hours,
      };

      // Keep the existing roadmap booking behaviour.
      onBook(approval.id, newBooking);

      // Open the success confirmation popup.
      setBookingSuccess(newBooking);

      setConfirming(false);
    }, 1500);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${ch.mode === "hybrid" ? "bg-[#E8F7F4] border-[#CFE9E3]" : "bg-amber-50 border-amber-200"}`}>
        <Landmark size={17} className={`mt-0.5 shrink-0 ${ch.mode === "hybrid" ? "text-[#176B63]" : "text-amber-600"}`} />
        <div>
          <p className={`text-sm font-semibold ${ch.mode === "hybrid" ? "text-[#0B4F49]" : "text-amber-800"}`}>
            {ch.mode === "hybrid" ? t("ov.onlineThenVisit") : t("ov.visitRequired")}
          </p>
          <p className={`text-sm ${ch.mode === "hybrid" ? "text-[#0F5B54]" : "text-amber-700"}`}>{ch.reason}</p>
        </div>
      </div>

      {ch.onlineUrl && (
        <a href={ch.onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-[#176B63] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0F5B54]">
          {t("ov.fileFirst")} <ExternalLink size={13} />
        </a>
      )}

      {/* Where to go */}
      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Landmark size={13} /> {t("ov.whereToGo")}</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-800">{o.name}</p>
              <p className="text-xs text-slate-500">{o.dept}</p>
            </div>
            <p className="text-sm text-slate-700 flex items-start gap-1.5"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> {o.address}</p>
            <p className="text-sm text-slate-700 flex items-center gap-1.5"><Clock3 size={13} className="text-slate-400" /> {o.hours}</p>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(o.mapQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#176B63] hover:underline">
              <Navigation size={13} /> {t("ov.maps")}
            </a>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3.5">
            <p className="text-[10px] font-semibold text-slate-400 mb-2">{t("ov.head")}</p>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 bg-[#176B63]/15 rounded-full flex items-center justify-center shrink-0"><User size={15} className="text-[#176B63]" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{o.head}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{o.designation}</p>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              <a href={`tel:${o.phone}`} className="text-xs text-slate-700 flex items-center gap-2 hover:text-[#176B63]"><Phone size={12} className="text-slate-400" /> {o.phone}</a>
              <a href={`mailto:${o.email}`} className="text-xs text-slate-700 flex items-center gap-2 hover:text-[#176B63] break-all"><Mail size={12} className="text-slate-400 shrink-0" /> {o.email}</a>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Route size={13} /> {t("ov.steps")}</p>
        <div className="space-y-3">
          {ch.steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#176B63] text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
              <div>
                <p className="text-sm font-medium text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carry */}
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-4">
        <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><FolderOpen size={13} /> {t("ov.carry")}</p>
        <p className="text-[11px] text-slate-400 mb-3">{t("ov.carrySub")}</p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {ch.carry.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded px-2.5 py-2">
              <CheckCircle size={12} className="text-slate-400 mt-0.5 shrink-0" /> {d}
            </div>
          ))}
        </div>
      </div>

      {/* Booking */}
      {booking ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">{t("ov.confirmed")}</p>
                <p className="text-xs text-emerald-700 mt-0.5">{booking.office}</p>
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1.5"><User size={11} /> {t("ov.meeting", booking.head)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-emerald-800">{new Date(booking.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              <p className="text-xs text-emerald-700">{booking.slot}</p>
              <p className="text-[10px] font-mono bg-white text-emerald-700 px-2 py-0.5 rounded mt-1.5 inline-block border border-emerald-200">{booking.token}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><CalendarDays size={13} /> {t("ov.book")}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">{t("ov.pickDate")}</label>
              {/*
                CalendarPanel replaces the native date input so the three
                highlight states are visible at once:
                  selected  -> the day the user picks
                  range     -> the department's stated processing window,
                               derived from this approval's timeline
                  event     -> the site-inspection / hearing target date
                Weekends are disabled because these offices do not sit on
                Saturday or Sunday.
              */}
              <CalendarPanel
                value={date}
                onChange={(iso) => { setDate(iso); setSlot(""); }}
                min={minDate}
                max={maxDate}
                rangeStart={date || undefined}
                rangeEnd={date ? isoDate(new Date(new Date(date + "T00:00:00").getTime() + (approval.timeline || 15) * 86400000)) : undefined}
                events={date ? [isoDate(new Date(new Date(date + "T00:00:00").getTime() + Math.round((approval.timeline || 15) / 2) * 86400000))] : []}
                disabledDays={[0, 6]}
                className="max-w-sm"
              />
              <p className="text-[11px] text-slate-400 mt-2">{t("ov.dateHint")}</p>
            </div>
            {date && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">{t("ov.pickSlot")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => {
                    const isFull = (t.charCodeAt(0) + date.charCodeAt(9)) % 5 === 0;
                    return (
                      <button key={t} disabled={isFull} onClick={() => setSlot(t)}
                        className={`px-2.5 py-2 rounded-lg text-xs border transition-all ${isFull ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through" : slot === t ? "bg-[#176B63] text-white border-[#176B63]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{t("ov.slotsFull")}</p>
              </div>
            )}
            {date && slot && (
              <button onClick={confirmBooking} disabled={confirming} className="bg-[#176B63] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 flex items-center gap-2">
                {confirming ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("ov.booking")}</> : <><CalendarDays size={14} /> {t("ov.confirm")}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          APPOINTMENT BOOKING SUCCESS POPUP
          ================================================================ */}
      {bookingSuccess && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
        >
          <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

            {/* Success header */}
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-4 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={24} className="text-emerald-600" />
                  </div>

                  <div>
                    <h2
                      id="booking-success-title"
                      className="text-lg font-semibold text-emerald-800"
                    >
                      Appointment Booked Successfully
                    </h2>
                    <p className="text-sm text-emerald-600 mt-0.5">
                      Your office visit has been scheduled.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingSuccess(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors shrink-0"
                  aria-label="Close appointment confirmation"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable appointment details */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto min-h-0">

              {/* Appointment token */}
              <div className="bg-[#176B63]/10 border border-[#176B63]/20 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-[#176B63] uppercase tracking-wide">
                  Appointment Token
                </p>

                <p className="text-xl sm:text-2xl font-bold text-[#0F5B54] mt-1 font-mono">
                  {bookingSuccess.token}
                </p>

                <p className="text-xs text-[#0F5B54] mt-1">
                  Keep this token for your office visit
                </p>
              </div>

              {/* Date and time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays size={15} className="text-[#176B63]" />
                    <p className="text-xs font-medium text-slate-500">DATE</p>
                  </div>

                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(bookingSuccess.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock3 size={15} className="text-[#176B63]" />
                    <p className="text-xs font-medium text-slate-500">TIME SLOT</p>
                  </div>

                  <p className="text-sm font-semibold text-slate-800">
                    {bookingSuccess.slot}
                  </p>
                </div>
              </div>

              {/* Approval */}
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  APPROVAL
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {approval.name}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {approval.dept}
                </p>
              </div>

              {/* Office details */}
              <div className="border border-slate-200 rounded-lg p-3.5">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                  OFFICE DETAILS
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {bookingSuccess.office}
                      </p>

                      <p className="text-xs text-slate-500 mt-0.5">
                        {bookingSuccess.address || o.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <User size={15} className="text-slate-400 mt-0.5 shrink-0" />

                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {bookingSuccess.head}
                      </p>

                      <p className="text-xs text-slate-500">
                        {bookingSuccess.designation || o.designation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock3 size={15} className="text-slate-400 shrink-0" />

                    <p className="text-xs text-slate-600">
                      Office Hours: {bookingSuccess.hours || o.hours}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-slate-400 shrink-0" />

                    <a
                      href={`tel:${bookingSuccess.phone || o.phone}`}
                      className="text-xs text-[#0F5B54] hover:underline"
                    >
                      {bookingSuccess.phone || o.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Mail size={15} className="text-slate-400 shrink-0" />

                    <a
                      href={`mailto:${bookingSuccess.email || o.email}`}
                      className="text-xs text-[#0F5B54] hover:underline break-all"
                    >
                      {bookingSuccess.email || o.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Visit reminder */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please carry the required original documents and copies
                  mentioned in the approval checklist when visiting the office.
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] transition-colors shrink-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
//  DOCUMENT FORMAT VERIFICATION
// --------------------------------------------------------------------------
//  SCOPE — READ THIS BEFORE EXTENDING.
//
//  This module verifies FORMAT ONLY. It answers "is this document structurally
//  well-formed?" — never "does this document exist in government records?"
//
//  We deliberately do NOT claim identity verification, because the prototype
//  has no access to the official databases that would make such a claim true:
//      PAN      -> NSDL / Protean verification API
//      Aadhaar  -> UIDAI Authentication API (requires AUA/KUA licence)
//      GSTIN    -> GSTN Taxpayer API
//      Udyam    -> Udyam Registration API
//
//  What we CAN prove offline, with no external data at all:
//
//   1. STRUCTURE   Does the number match the government-published pattern?
//                  A PAN is 5 letters, 4 digits, 1 letter. A GSTIN is 15
//                  characters laid out in a fixed order. These rules are
//                  published, so checking them needs no database.
//
//   2. CHECKSUM    Aadhaar carries a Verhoeff check digit and GSTIN carries a
//                  mod-36 check digit. Both are pure arithmetic over the number
//                  itself. A number that fails its own checksum is invalid no
//                  matter what any database says, so this catches typos and
//                  fabricated numbers offline with certainty.
//
//   3. INTERNAL    Characters 3-12 of a GSTIN ARE the holder's PAN by
//      CONSISTENCY specification. If a submitted GSTIN and PAN disagree, one of
//                  them is wrong — again provable without a lookup.
//
//   4. FILE        Is the uploaded file an accepted type, within the size
//                  limit, and of high enough resolution for a clerk or an OCR
//                  engine to read?
//
//  Everything here is decidable from the document alone. When the official
//  APIs are wired in later, they become a fifth layer ON TOP of these, not a
//  replacement for them — format screening first is cheaper and catches most
//  real-world errors before a single API call is spent.
// ==========================================================================

/**
 * verhoeffValid — the Verhoeff check-digit algorithm used by Aadhaar.
 *
 * Pure arithmetic over the 12 digits, no lookup required. It detects every
 * single-digit error and every adjacent transposition, which together account
 * for the overwhelming majority of manual typing mistakes.
 */
function verhoeffValid(num) {
  const d = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ];
  const p = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
  ];
  let c = 0;
  const digits = num.replace(/\D/g, "").split("").reverse().map(Number);
  if (digits.length !== 12) return false;
  digits.forEach((n, i) => { c = d[c][p[i % 8][n]]; });
  return c === 0;
}

/**
 * gstinChecksumValid — the mod-36 check digit on the 15th character of a GSTIN.
 *
 * Each of the first 14 characters is mapped to its value in the 36-character
 * alphabet, multiplied by an alternating factor of 1 and 2, and the digit sums
 * are accumulated. The check character is whatever brings the total to a
 * multiple of 36. Again: pure arithmetic, no database.
 */
function gstinChecksumValid(gstin) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const g = gstin.toUpperCase();
  if (g.length !== 15) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = alphabet.indexOf(g[i]);
    if (v < 0) return false;
    const prod = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  const expected = alphabet[(36 - (sum % 36)) % 36];
  return expected === g[14];
}

/**
 * FORMAT_RULES — the published structural specification for each ID type.
 *
 * `explain` returns a plain-language reason when the pattern fails, so the
 * user is told what is actually wrong instead of a bare "invalid".
 * `decode` extracts meaning that is encoded IN the number itself — this is
 * still format work, not a lookup.
 * `checksum` is present only where the number carries a real check digit.
 */
const FORMAT_RULES = {
  PAN: {
    label: "PAN",
    full: "Permanent Account Number",
    placeholder: "ABCPD1234E",
    hint: "5 letters + 4 digits + 1 letter (10 characters)",
    issuer: "Income Tax Department",
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    normalize: (v) => v.replace(/\s/g, "").toUpperCase(),
    explain: (v) => {
      if (v.length !== 10) return `A PAN is exactly 10 characters. You entered ${v.length}.`;
      if (!/^[A-Z]{5}/.test(v)) return "Characters 1-5 must all be letters.";
      if (!/^[A-Z]{5}[0-9]{4}/.test(v)) return "Characters 6-9 must all be digits.";
      if (!/[A-Z]$/.test(v)) return "The 10th character must be a letter.";
      return "Does not match the published PAN pattern.";
    },
    decode: (v) => {
      const map = { P: "Individual", C: "Company", H: "Hindu Undivided Family", F: "Firm / LLP",
        A: "Association of Persons", T: "Trust", B: "Body of Individuals", G: "Government",
        J: "Artificial Juridical Person", L: "Local Authority" };
      const t = v[3];
      const out = [];
      if (map[t]) out.push({ k: "Holder type", v: `${map[t]} (from the 4th character '${t}')` });
      else out.push({ k: "Holder type", v: `'${t}' is not a recognised holder-type code`, bad: true });
      out.push({ k: "Surname initial", v: `'${v[4]}' — should match the first letter of the holder's surname` });
      return out;
    },
    checksum: null,
    note: "PAN has no check digit, so structure is all that can be proven offline. Existence needs the NSDL verification API.",
  },

  Aadhaar: {
    label: "Aadhaar",
    full: "Aadhaar Number",
    placeholder: "4532 8876 1234",
    hint: "12 digits, first digit cannot be 0 or 1",
    issuer: "UIDAI",
    regex: /^\d{12}$/,
    normalize: (v) => v.replace(/[\s-]/g, ""),
    explain: (v) => {
      if (!/^\d*$/.test(v)) return "An Aadhaar number contains digits only.";
      if (v.length !== 12) return `An Aadhaar number is exactly 12 digits. You entered ${v.length}.`;
      if (v[0] === "0" || v[0] === "1") return "Aadhaar numbers never begin with 0 or 1.";
      return "Does not match the published Aadhaar pattern.";
    },
    decode: (v) => ([{ k: "Masked form", v: `XXXX XXXX ${v.slice(8)} — this is the only part safe to display or print` }]),
    checksum: {
      name: "Verhoeff check digit",
      run: verhoeffValid,
      pass: "The 12th digit correctly checksums the preceding 11. A typo or a made-up number would almost certainly fail this.",
      fail: "The check digit does not match the rest of the number. This number is mathematically invalid — it is either mistyped or fabricated.",
    },
    note: "Never store a full Aadhaar number. This prototype keeps it in memory only for the duration of the check.",
  },

  GSTIN: {
    label: "GSTIN",
    full: "Goods and Services Tax Identification Number",
    placeholder: "27ABCPD1234E1Z5",
    hint: "2-digit state code + 10-character PAN + entity digit + 'Z' + check character",
    issuer: "GST Network",
    regex: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/,
    normalize: (v) => v.replace(/\s/g, "").toUpperCase(),
    explain: (v) => {
      if (v.length !== 15) return `A GSTIN is exactly 15 characters. You entered ${v.length}.`;
      if (!/^\d{2}/.test(v)) return "Characters 1-2 must be the numeric state code.";
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]/.test(v)) return "Characters 3-12 must be a valid PAN pattern.";
      if (v[13] !== "Z") return `The 14th character must be the letter Z. You have '${v[13]}'.`;
      return "Does not match the published GSTIN pattern.";
    },
    decode: (v) => {
      const states = { "01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh","05":"Uttarakhand",
        "06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh","10":"Bihar","19":"West Bengal",
        "21":"Odisha","23":"Madhya Pradesh","24":"Gujarat","27":"Maharashtra","29":"Karnataka","30":"Goa",
        "32":"Kerala","33":"Tamil Nadu","36":"Telangana","37":"Andhra Pradesh" };
      const code = v.substring(0, 2);
      const out = [];
      out.push(states[code]
        ? { k: "Registered state", v: `${states[code]} (state code ${code})` }
        : { k: "Registered state", v: `State code ${code} is not a recognised code`, bad: true });
      out.push({ k: "Embedded PAN", v: `${v.substring(2, 12)} — by specification, characters 3-12 of a GSTIN are the holder's PAN` });
      out.push({ k: "Entity number", v: `${v[12]} — the ${v[12]}${v[12] === "1" ? "st" : v[12] === "2" ? "nd" : v[12] === "3" ? "rd" : "th"} registration for this PAN in this state` });
      return out;
    },
    checksum: {
      name: "Mod-36 check character",
      run: gstinChecksumValid,
      pass: "The 15th character correctly checksums the preceding 14.",
      fail: "The 15th character does not match the computed checksum. This GSTIN is mathematically invalid.",
    },
    note: null,
  },

  Udyam: {
    label: "Udyam",
    full: "Udyam Registration Number",
    placeholder: "UDYAM-MH-18-0012345",
    hint: "UDYAM-<2-letter state>-<2-digit district>-<7-digit serial>",
    issuer: "Ministry of MSME",
    regex: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/,
    normalize: (v) => v.replace(/\s/g, "").toUpperCase(),
    explain: (v) => {
      if (!v.startsWith("UDYAM-")) return "Must begin with the prefix UDYAM-";
      if (!/^UDYAM-[A-Z]{2}-/.test(v)) return "The state code must be exactly 2 capital letters.";
      if (!/^UDYAM-[A-Z]{2}-\d{2}-/.test(v)) return "The district code must be exactly 2 digits.";
      if (!/\d{7}$/.test(v)) return "Must end with a 7-digit serial number.";
      return "Does not match the published Udyam pattern.";
    },
    decode: (v) => {
      const parts = v.split("-");
      return [
        { k: "State code", v: parts[1] },
        { k: "District code", v: parts[2] },
        { k: "Serial number", v: parts[3] },
      ];
    },
    checksum: null,
    note: "Udyam numbers carry no check digit. Validity can only be confirmed through the Udyam portal.",
  },
};

/** Accepted upload formats and limits, matched to what department portals accept. */
const FILE_RULES = {
  accepted: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  acceptedLabel: "JPG, PNG, WEBP or PDF",
  maxBytes: 5 * 1024 * 1024,
  maxLabel: "5 MB",
  minBytes: 20 * 1024,
  minLabel: "20 KB",
  minWidth: 800,
};

/**
 * VerifySection — tab 2 of Document Check: FORMAT VERIFICATION ONLY.
 *
 * The user optionally uploads the document image and enters its number. We run
 * four independent format checks (file, structure, checksum, internal
 * consistency) and report each one with the reasoning shown, so nothing looks
 * like a black box to a judge or a user.
 *
 * There is no name field and no identity claim anywhere in this component.
 * That is intentional and is stated in the UI, not just here in a comment.
 */
function VerifySection() {
  const { t } = useT();
  const [docType, setDocType] = useState("PAN");
  const [idNumber, setIdNumber] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [pairPan, setPairPan] = useState("");

  const rule = FORMAT_RULES[docType];

  const reset = () => { setFile(null); setPreview(null); setReport(null); };

  const handleFile = (f) => {
    if (!f) return;
    setReport(null);
    setFile({ name: f.name, size: f.size, type: f.type });
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => setPreview({ src: e.target.result, w: img.width, h: img.height });
        img.src = e.target.result;
      };
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Sample numbers that PASS every check, including the real check digits.
  // 453288761236 satisfies Verhoeff; 27ABCPD1234E1ZE satisfies the mod-36 rule.
  const samples = {
    PAN: "ABCPD1234E",
    Aadhaar: "4532 8876 1236",
    GSTIN: "27ABCPD1234E1ZE",
    Udyam: "UDYAM-MH-18-0012345",
  };

  // Deliberately broken variants, so the failure path is demoable in one click.
  // Each has a valid STRUCTURE but a wrong check digit — exactly the class of
  // error a pattern-only check would wave through.
  const badSamples = {
    PAN: "ABCP1234E",
    Aadhaar: "4532 8876 1234",
    GSTIN: "27ABCPD1234E1Z5",
    Udyam: "UDYAM-MH-8-0012345",
  };

  const runCheck = () => {
    setBusy(true); setReport(null);
    setTimeout(() => {
      const fileChecks = [], structureChecks = [], checksumChecks = [], consistencyChecks = [];
      const raw = idNumber.trim();
      const val = rule.normalize(raw);

      // ---------- LAYER 1: FILE FORMAT ----------
      if (file) {
        if (FILE_RULES.accepted.includes(file.type)) {
          fileChecks.push({ status: "pass", title: "File type accepted",
            detail: `${file.type} is on the accepted list (${FILE_RULES.acceptedLabel}).` });
        } else {
          fileChecks.push({ status: "error", title: "File type not accepted",
            detail: `${file.type || "unknown type"} will be rejected by department portals. Convert to ${FILE_RULES.acceptedLabel}.` });
        }

        const kb = (file.size / 1024).toFixed(0);
        if (file.size > FILE_RULES.maxBytes) {
          fileChecks.push({ status: "error", title: "File too large",
            detail: `${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the ${FILE_RULES.maxLabel} upload limit. Compress before submitting.` });
        } else if (file.size < FILE_RULES.minBytes) {
          fileChecks.push({ status: "warn", title: "File suspiciously small",
            detail: `${kb} KB is below ${FILE_RULES.minLabel}. This usually means the scan is too compressed to stay readable.` });
        } else {
          fileChecks.push({ status: "pass", title: "File size within limits",
            detail: `${kb} KB, comfortably under the ${FILE_RULES.maxLabel} cap.` });
        }

        if (preview) {
          if (preview.w >= FILE_RULES.minWidth) {
            fileChecks.push({ status: "pass", title: "Resolution sufficient",
              detail: `${preview.w} x ${preview.h} px. Wide enough for a clerk and for OCR to read reliably.` });
          } else {
            fileChecks.push({ status: "error", title: "Resolution too low",
              detail: `${preview.w} x ${preview.h} px. Below ${FILE_RULES.minWidth} px wide, text becomes unreliable. Re-scan at 300 DPI.` });
          }
          const ratio = preview.w / preview.h;
          if (ratio < 0.3 || ratio > 3.5) {
            fileChecks.push({ status: "warn", title: "Unusual aspect ratio",
              detail: `${ratio.toFixed(2)}:1 suggests the image may be cropped or rotated. Check the whole document is in frame.` });
          }
        } else if (file.type === "application/pdf") {
          fileChecks.push({ status: "pass", title: "PDF accepted",
            detail: "Page count and embedded-text checks run server-side in the full build." });
        }
      } else {
        fileChecks.push({ status: "warn", title: "No file uploaded",
          detail: "File-level checks skipped. Upload the document to also check type, size and resolution." });
      }

      // ---------- LAYER 2: STRUCTURE ----------
      if (!raw) {
        structureChecks.push({ status: "error", title: `${rule.label} number not entered`,
          detail: `Enter the number exactly as printed on the document. Expected shape: ${rule.hint}` });
      } else if (rule.regex.test(val)) {
        structureChecks.push({ status: "pass", title: `${rule.label} structure is valid`,
          detail: `Matches the pattern published by the ${rule.issuer}: ${rule.hint}` });
        rule.decode(val).forEach(d => {
          structureChecks.push({ status: d.bad ? "warn" : "pass", title: d.k, detail: d.v, sub: true });
        });
      } else {
        structureChecks.push({ status: "error", title: `${rule.label} structure is invalid`,
          detail: rule.explain(val) });
      }

      // ---------- LAYER 3: CHECKSUM ----------
      if (rule.checksum && rule.regex.test(val)) {
        const ok = rule.checksum.run(val);
        checksumChecks.push({ status: ok ? "pass" : "error", title: rule.checksum.name,
          detail: ok ? rule.checksum.pass : rule.checksum.fail });
      } else if (rule.checksum) {
        checksumChecks.push({ status: "warn", title: rule.checksum.name,
          detail: "Skipped — the checksum can only be computed once the structure is valid." });
      } else {
        checksumChecks.push({ status: "warn", title: "No check digit on this document type",
          detail: rule.note || `${rule.label} numbers carry no check digit, so arithmetic validation is not possible.` });
      }

      // ---------- LAYER 4: INTERNAL CONSISTENCY ----------
      if (docType === "GSTIN" && rule.regex.test(val) && pairPan.trim()) {
        const pan = pairPan.trim().toUpperCase().replace(/\s/g, "");
        const embedded = val.substring(2, 12);
        if (!FORMAT_RULES.PAN.regex.test(pan)) {
          consistencyChecks.push({ status: "warn", title: "Comparison PAN is itself malformed",
            detail: `"${pan}" does not match the PAN pattern, so the comparison cannot be trusted.` });
        } else if (embedded === pan) {
          consistencyChecks.push({ status: "pass", title: "GSTIN and PAN agree",
            detail: `Characters 3-12 of the GSTIN (${embedded}) match the PAN exactly, as the specification requires.` });
        } else {
          consistencyChecks.push({ status: "error", title: "GSTIN and PAN do not agree",
            detail: `The GSTIN embeds ${embedded} but the PAN given is ${pan}. By specification these must be identical, so one of the two numbers is wrong or they belong to different entities.` });
        }
      }

      const all = [...fileChecks, ...structureChecks.filter(c => !c.sub), ...checksumChecks, ...consistencyChecks];
      setReport({
        fileChecks, structureChecks, checksumChecks, consistencyChecks,
        errors: all.filter(c => c.status === "error").length,
        warns: all.filter(c => c.status === "warn").length,
        passes: all.filter(c => c.status === "pass").length,
      });
      setBusy(false);
    }, 1300);
  };

  const Row = ({ c }) => (
    <div className={`flex items-start gap-3 ${c.sub ? "pl-8 pr-5 py-2" : "px-5 py-3.5"}`}>
      {c.status === "pass" && <CheckCircle size={c.sub ? 13 : 16} className="text-emerald-500 mt-0.5 shrink-0" />}
      {c.status === "warn" && <AlertTriangle size={c.sub ? 13 : 16} className="text-amber-500 mt-0.5 shrink-0" />}
      {c.status === "error" && <XCircle size={c.sub ? 13 : 16} className="text-red-500 mt-0.5 shrink-0" />}
      <div>
        <p className={`${c.sub ? "text-xs" : "text-sm"} font-medium ${c.status === "pass" ? "text-slate-700" : c.status === "warn" ? "text-amber-700" : "text-red-700"}`}>{c.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.detail}</p>
      </div>
    </div>
  );

  const Group = ({ icon: Icon, title, subtitle, checks }) => (
    checks && checks.length ? (
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)]">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Icon size={16} /> {title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="divide-y divide-slate-50">{checks.map((c, i) => <Row key={i} c={c} />)}</div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      {/* Scope notice — states plainly what this does and does not do */}
      <div className="bg-[#176B63]/10 border border-[#176B63]/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-[#176B63] mt-0.5 shrink-0" />
        <div className="text-sm text-[#0B4F49] leading-relaxed">
          <p className="font-semibold mb-1">{t("vf.scopeTitle")}</p>
          <p>{t("vf.scopeBody")}</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t("vf.docType")}</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(FORMAT_RULES).map(t => (
              <button key={t} onClick={() => { setDocType(t); setIdNumber(""); setReport(null); }}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${docType === t ? "bg-[#176B63]/10 border-[#176B63]/60 text-[#0F5B54]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">{rule.full} · {t("vf.issuedBy")} {rule.issuer}</p>
        </div>

        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t("vf.upload")} <span className="text-slate-400 font-normal">{t("vf.uploadOpt")}</span></label>
          {!file ? (
            <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              onClick={() => document.getElementById("vfInput").click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-[#176B63]/70 bg-[#176B63]/10" : "border-slate-200 hover:border-slate-300"}`}>
              <ImageIcon size={26} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-600 font-medium">{t("vf.drop")}</p>
              <p className="text-xs text-slate-400 mt-1">{FILE_RULES.acceptedLabel} · {t("vf.upTo")} {FILE_RULES.maxLabel}</p>
              <input id="vfInput" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {preview
                ? <img src={preview.src} alt="document" className="w-24 rounded border border-slate-200" />
                : <div className="w-24 h-16 bg-white border border-slate-200 rounded flex items-center justify-center"><FileText size={20} className="text-slate-400" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB · {file.type || "unknown type"}{preview ? ` · ${preview.w}x${preview.h} px` : ""}</p>
                <button onClick={reset} className="text-xs text-slate-500 hover:text-red-500 mt-1.5 flex items-center gap-1"><Trash2 size={11} /> {t("vf.remove")}</button>
              </div>
            </div>
          )}
        </div>

        {/* Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">{t("vf.numberLabel", rule.label)}</label>
            <div className="flex items-center gap-3">
              <button onClick={() => { setIdNumber(samples[docType]); if (docType === "GSTIN") setPairPan("ABCPD1234E"); setReport(null); }} className="text-xs text-emerald-600 font-medium hover:underline">{t("vf.validSample")}</button>
              <span className="text-slate-200">|</span>
              <button onClick={() => { setIdNumber(badSamples[docType]); if (docType === "GSTIN") setPairPan("ABCPD1234E"); setReport(null); }} className="text-xs text-red-500 font-medium hover:underline">{t("vf.brokenSample")}</button>
            </div>
          </div>
          <input type="text" value={idNumber} onChange={e => { setIdNumber(e.target.value); setReport(null); }}
            placeholder={rule.placeholder}
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent" />
          <p className="text-xs text-slate-400 mt-1">{t("vf.expected", rule.hint)}</p>
        </div>

        {/* Optional PAN pairing for GSTIN consistency */}
        {docType === "GSTIN" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("vf.panPair")} <span className="text-slate-400 font-normal">{t("vf.panPairOpt")}</span></label>
            <input type="text" value={pairPan} onChange={e => { setPairPan(e.target.value); setReport(null); }}
              placeholder="ABCPD1234E"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-mono" />
            <p className="text-xs text-slate-400 mt-1">{t("vf.panPairHint")}</p>
          </div>
        )}

        <button onClick={runCheck} disabled={busy || !idNumber.trim()}
          className="bg-[#176B63] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 flex items-center gap-2">
          {busy
            ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("vf.checking")}</>
            : <><ShieldCheck size={14} /> {t("vf.check")}</>}
        </button>
      </div>

      {/* Report */}
      {report && (
        <div className="space-y-5">
          <div className={`rounded-xl border p-5 ${report.errors > 0 ? "bg-red-50 border-red-200" : report.warns > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-start gap-3">
              {report.errors > 0 ? <XCircle size={22} className="text-red-600 mt-0.5" /> : report.warns > 0 ? <AlertTriangle size={22} className="text-amber-600 mt-0.5" /> : <CheckCircle size={22} className="text-emerald-600 mt-0.5" />}
              <div>
                <p className={`font-semibold ${report.errors > 0 ? "text-red-800" : report.warns > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                  {report.errors > 0
                    ? t("vf.invalid", report.errors)
                    : report.warns > 0
                      ? t("vf.validWarn")
                      : t("vf.allValid")}
                </p>
                <p className={`text-sm mt-0.5 ${report.errors > 0 ? "text-red-600" : report.warns > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {t("vf.tally", report.passes, report.warns, report.errors)}
                </p>
                {report.errors === 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {t("vf.afterNote")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Group icon={ImageIcon} title={t("vf.g1")} subtitle={t("vf.g1sub")} checks={report.fileChecks} />
          <Group icon={Fingerprint} title={t("vf.g2")} subtitle={t("vf.g2sub", rule.issuer)} checks={report.structureChecks} />
          <Group icon={ShieldCheck} title={t("vf.g3")} subtitle={t("vf.g3sub")} checks={report.checksumChecks} />
          <Group icon={GitCompare} title={t("vf.g4")} subtitle={t("vf.g4sub")} checks={report.consistencyChecks} />
        </div>
      )}
    </div>
  );
}

// ==========================================================================
//  DOCUMENT CHECK — TAB WRAPPER
// --------------------------------------------------------------------------
//  Merges the two document features into one screen with two tabs:
//    'Upload & Scan'            -> UploadValidateSection (OCR checks)
//    'Format Verification'      -> VerifySection (structure + checksum only)
// ==========================================================================

/**
 * DocumentsPage — thin wrapper that hosts the two document tabs.
 */
function DocumentsPage({ project }) {
  const { t } = useT();
  const [tab, setTab] = useState("upload");

  const tabs = [
    { id: "upload", label: t("doc.tabUpload"), icon: Upload, desc: t("doc.tabUploadDesc") },
    { id: "verify", label: t("doc.tabVerify"), icon: Fingerprint, desc: t("doc.tabVerifyDesc") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{t("doc.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("doc.subtitle")}</p>
      </div>

      <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-5 py-4 text-left transition-colors ${tab === t.id ? "bg-[#176B63]/10 border-b-2 border-[#176B63]" : "hover:bg-slate-50 border-b-2 border-transparent"}`}>
              <div className={`flex items-center gap-2 mb-0.5 ${tab === t.id ? "text-[#0F5B54]" : "text-slate-600"}`}>
                <t.icon size={15} />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
              <p className="text-xs text-slate-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {tab === "upload" && <UploadValidateSection project={project} />}
      {tab === "verify" && <VerifySection />}
    </div>
  );
}


// ==========================================================================
//  SUPPORT — HELP WIDGET + "SAHAYAK" ASSISTANT
// --------------------------------------------------------------------------
//  Two pieces, always reachable from the bottom-right of every screen:
//
//    HelpFab   a help icon that opens a small card with the customer-care
//              number, working hours and an email, plus a button into the chat.
//
//    Gattu      a voice-enabled Digital Twin assistant that answers questions about approvals,
//              offices, documents, schemes and the app itself.
//
//  HOW SAHAYAK ANSWERS
//  It resolves questions against the data this app already holds — APPROVAL_DB,
//  APPROVAL_CHANNELS, SCHEMES_DB, FORMAT_RULES — using keyword intents scored
//  by how many of their terms appear in the question. That keeps it accurate,
//  instant and offline: every answer is grounded in a real record rather than
//  generated, so it cannot invent an office address or a fee that does not
//  exist. Anything it has no grounding for, it says so and points to the
//  helpline instead of guessing.
//
//  In production the intent matcher is replaced by an LLM call with these same
//  tables supplied as retrieval context; the grounding rule stays the same.
// ==========================================================================

const SUPPORT = {
  phone: "1800-233-4455",
  phoneRaw: "18002334455",
  hours: "Mon-Sat, 9:00 AM - 7:00 PM IST",
  email: "support@industrysaarthi.in",
  escalation: "grievance@industrysaarthi.in",
};

/**
 * sahayakAnswer — intent resolution over the app's own data.
 *
 * Each intent lists trigger words and a builder that reads from the real
 * tables. The highest-scoring intent wins; ties break toward the earlier
 * entry, which is why the more specific intents are listed first.
 * Returns { text, chips } where chips are follow-up suggestions.
 */
function sahayakAnswer(qRaw, lang) {
  const q = (qRaw || "").toLowerCase();
  /* Multi-word triggers count double. A phrase like "how long" is far more
     telling than a single common word such as "approval", so without this
     weighting a specific question loses to a broad intent on a score tie. */
  const has = (...ws) => ws.reduce((n, w) => q.includes(w) ? n + (w.trim().includes(" ") ? 2 : 1) : n, 0);
  const HI = lang === "hi";

  const intents = [

    { id: "greet", score: has("hello", "hi ", "hey", "namaste", "नमस्ते", "हाय"),
      build: () => ({
        text: HI
          ? "नमस्ते! मैं सहायक हूँ। मैं अनुमतियों, कार्यालयों, दस्तावेज़ों और सरकारी योजनाओं के बारे में आपके प्रश्नों का उत्तर दे सकता हूँ। नीचे दिए गए किसी विषय पर टैप करें या अपना प्रश्न लिखें।"
          : "Hello. I am Sahayak. I can answer questions about approvals, offices, documents and government schemes. Tap a topic below or type your question.",
        chips: HI ? ["मुझे कौन सी अनुमतियाँ चाहिए?", "कार्यालय कहाँ है?", "पैन प्रारूप", "योजनाएँ"]
                  : ["Which approvals do I need?", "Where is the office?", "PAN format", "Schemes"],
      }) },

    { id: "approvals", score: has("approval", "licence", "license", "permit", "which", "need", "required", "अनुमति", "परवाना", "लाइसेंस", "चाहिए"),
      build: () => {
        const sectors = Object.keys(APPROVAL_DB);
        const lines = sectors.map(sec => {
          const list = APPROVAL_DB[sec];
          const par = list.filter(a => a.parallel).length;
          return `• ${sec} — ${list.length} approvals, ${par} can be filed in parallel`;
        });
        return {
          text: (HI
            ? "आपकी परियोजना के क्षेत्र के आधार पर आवश्यक अनुमतियाँ तय होती हैं। इस समय उपलब्ध क्षेत्र:\n\n"
            : "The approvals you need depend on your project's sector. Sectors currently mapped:\n\n")
            + lines.join("\n")
            + (HI ? "\n\nसटीक सूची पाने के लिए 'नई परियोजना' में अपना विवरण भरें।"
                  : "\n\nRegister your project under New Project to get the exact list for your sector and state."),
          chips: HI ? ["कारखाना लाइसेंस", "जीएसटी", "प्रदूषण एनओसी"] : ["Factory License", "GST Registration", "Pollution NOC"],
        };
      } },

    { id: "office", score: has("office", "where", "address", "visit", "location", "officer", "meet", "कार्यालय", "पता", "कहाँ", "अधिकारी", "मिलना"),
      build: () => {
        const offline = Object.entries(APPROVAL_CHANNELS).filter(([, c]) => c.mode !== "online");
        const lines = offline.slice(0, 4).map(([name, c]) =>
          `• ${name}\n   ${c.office.name}, ${c.office.district}\n   ${c.office.head} — ${c.office.phone}`);
        return {
          text: (HI ? "इन अनुमतियों के लिए कार्यालय जाना आवश्यक है:\n\n" : "These approvals require an office visit:\n\n")
            + lines.join("\n\n")
            + (HI ? "\n\nपूरा पता, समय, ले जाने वाले दस्तावेज़ और समय बुकिंग के लिए रोडमैप में 'आवेदन शुरू करें' दबाएँ।"
                  : "\n\nPress Start Application on any of these in the Roadmap for the full address, opening hours, documents to carry and slot booking."),
          chips: HI ? ["समय कैसे बुक करें?", "क्या ऑनलाइन हो सकता है?"] : ["How do I book a slot?", "What can be done online?"],
        };
      } },

    { id: "online", score: has("online", "portal", "website", "web", "link", "ऑनलाइन", "पोर्टल", "वेबसाइट"),
      build: () => {
        const on = Object.entries(APPROVAL_CHANNELS).filter(([, c]) => c.mode === "online");
        const lines = on.map(([name, c]) => `• ${name} — ${c.onlineUrl}`);
        return {
          text: (HI ? "ये अनुमतियाँ पूरी तरह ऑनलाइन पूरी की जा सकती हैं:\n\n" : "These can be completed fully online, no office visit:\n\n")
            + lines.join("\n")
            + (HI ? "\n\nरोडमैप में इन्हें शुरू करने पर सीधा पोर्टल लिंक मिलेगा।"
                  : "\n\nStarting any of these in the Roadmap gives you a direct link to the official portal."),
          chips: HI ? ["कार्यालय कहाँ है?", "जीएसटी दस्तावेज़"] : ["Which need a visit?", "GST documents"],
        };
      } },

    { id: "booking", score: has("appointment", "book", "slot", "schedule", "token", "अपॉइंटमेंट", "बुक", "समय", "टोकन"),
      build: () => ({
        text: HI
          ? "समय बुक करने के लिए:\n\n1. रोडमैप खोलें\n2. जिस अनुमति के लिए कार्यालय जाना है उस पर 'आवेदन शुरू करें' दबाएँ\n3. कार्ड में कार्यालय का पता, अधिकारी और चरण दिखेंगे\n4. नीचे कैलेंडर से तिथि और समय चुनें\n5. पुष्टि करने पर आपको टोकन नंबर मिलेगा\n\nबुक किया गया समय डैशबोर्ड कैलेंडर पर भी दिखेगा।"
          : "To book a slot:\n\n1. Open the Roadmap\n2. Press Start Application on an approval that needs a visit\n3. The card expands with the office address, the officer to meet and the steps\n4. Pick a date and time from the calendar at the bottom\n5. Confirming gives you a token number\n\nBooked appointments also appear on the dashboard calendar as a ring.",
        chips: HI ? ["कार्यालय कहाँ है?", "क्या ले जाना है?"] : ["Where is the office?", "What should I carry?"],
      }) },

    { id: "documents", score: has("document", "carry", "bring", "paper", "checklist", "दस्तावेज़", "कागद", "कागज", "ले जाना"),
      build: () => {
        const fl = APPROVAL_CHANNELS["Factory License"];
        return {
          text: (HI ? "हर अनुमति की अपनी दस्तावेज़ सूची होती है। उदाहरण — कारखाना लाइसेंस:\n\n"
                    : "Every approval has its own checklist. Factory License, for example:\n\n")
            + fl.carry.map(d => `• ${d}`).join("\n")
            + (HI ? "\n\nमूल प्रतियाँ और हर एक की एक छायाप्रति साथ लाएँ। जमा करने से पहले 'दस्तावेज़ जाँच' में इन्हें जाँच लें।"
                  : "\n\nBring originals plus one photocopy set of each. Run them through Document Check before you submit."),
          chips: HI ? ["पैन प्रारूप", "आधार जाँच"] : ["PAN format", "Check my Aadhaar"],
        };
      } },

    { id: "format", score: has("pan", "aadhaar", "aadhar", "gst", "gstin", "udyam", "format", "invalid", "checksum", "पैन", "आधार", "जीएसटी", "उद्यम", "प्रारूप"),
      build: () => {
        const lines = Object.entries(FORMAT_RULES).map(([k, r]) => `• ${k} — ${r.hint}  (e.g. ${r.placeholder})`);
        return {
          text: (HI ? "दस्तावेज़ संख्याओं के प्रारूप:\n\n" : "Document number formats:\n\n")
            + lines.join("\n")
            + (HI ? "\n\n'दस्तावेज़ जाँच' → 'प्रारूप सत्यापन' में संख्या डालें। आधार और जीएसटीआईएन में जाँच अंक भी होता है, जिससे टाइपिंग की ग़लती तुरंत पकड़ी जाती है। ध्यान दें: यह केवल प्रारूप जाँचता है, सरकारी अभिलेख नहीं।"
                  : "\n\nEnter a number under Document Check → Format Verification. Aadhaar and GSTIN also carry a real check digit, so a typo is caught immediately. Note this verifies format only, not government records."),
          chips: HI ? ["दस्तावेज़ जाँच खोलें", "क्या यह सरकारी सत्यापन है?"] : ["What is a check digit?", "Is this official verification?"],
        };
      } },

    { id: "verifyScope", score: has("official", "verify", "genuine", "real", "records", "authentic", "सत्यापन", "असली", "आधिकारिक"),
      build: () => ({
        text: HI
          ? "नहीं — यह ऐप केवल प्रारूप जाँचता है: संरचना, जाँच अंक, फ़ाइल गुणवत्ता और दस्तावेज़ों की आपसी संगति।\n\nयह पुष्टि नहीं करता कि संख्या सरकारी अभिलेख में दर्ज है। उसके लिए NSDL, UIDAI, GSTN और उद्यम एपीआई तक लाइसेंस प्राप्त पहुँच चाहिए, जो इस प्रोटोटाइप में नहीं है।\n\nप्रारूप सही होने का अर्थ है दस्तावेज़ जमा करने योग्य है — यह स्वीकृति की गारंटी नहीं।"
          : "No — this app checks format only: structure, check digit, file quality and whether your documents agree with each other.\n\nIt does not confirm a number exists in government records. That needs licensed access to the NSDL, UIDAI, GSTN and Udyam APIs, which this prototype does not have.\n\nA valid format means the document is worth submitting. It is not a guarantee of acceptance.",
        chips: HI ? ["पैन प्रारूप", "जाँच अंक क्या है?"] : ["PAN format", "What is a check digit?"],
      }) },

    { id: "checkdigit", score: has("check digit", "checksum", "verhoeff", "जाँच अंक"),
      build: () => ({
        text: HI
          ? "जाँच अंक संख्या का आख़िरी अंक होता है, जो बाक़ी अंकों से गणित द्वारा निकाला जाता है।\n\nआधार में वरहोफ़ (Verhoeff) एल्गोरिथ्म और जीएसटीआईएन में मॉड-36 विधि प्रयोग होती है। इससे एक अंक की ग़लती या दो अंकों की अदला-बदली तुरंत पकड़ी जाती है — बिना किसी डेटाबेस के।\n\nपैन और उद्यम में जाँच अंक नहीं होता, इसलिए उनमें केवल संरचना जाँची जा सकती है।"
          : "A check digit is the last character of a number, computed arithmetically from the ones before it.\n\nAadhaar uses the Verhoeff algorithm and GSTIN uses a mod-36 rule. Both catch a single mistyped digit or two swapped digits immediately, with no database lookup at all.\n\nPAN and Udyam carry no check digit, so only their structure can be checked.",
        chips: HI ? ["आधार जाँचें", "जीएसटी प्रारूप"] : ["Check an Aadhaar", "GSTIN format"],
      }) },

    { id: "schemes", score: has("scheme", "subsidy", "incentive", "loan", "benefit", "funding", "योजना", "सब्सिडी", "अनुदान", "ऋण", "लाभ"),
      build: () => {
        const lines = SCHEMES_DB.slice(0, 5).map(x => `• ${x.name} (${x.ministry})\n   ${x.benefit}`);
        return {
          text: (HI ? "आपके क्षेत्र से मेल खाती सरकारी योजनाएँ:\n\n" : "Government schemes matched by sector:\n\n")
            + lines.join("\n")
            + (HI ? "\n\n'योजनाएँ' टैब में पात्रता देखें और सीधे आधिकारिक पोर्टल पर आवेदन करें।"
                  : "\n\nOpen the Schemes tab to check eligibility and apply on the official portal."),
          chips: HI ? ["एमएसएमई योजना", "स्टार्टअप फंड"] : ["MSME schemes", "Startup funding"],
        };
      } },

    { id: "timeline", score: has("how long", "how many days", "how much time", "processing time",
                                 "time", "days", "duration", "delay", "deadline", "take",
                                 "कितने दिन", "कितना समय", "समय", "देरी", "समय-सीमा"),
      build: () => {
        const all = Object.values(APPROVAL_DB).flat();
        const uniq = [...new Map(all.map(a => [a.name, a])).values()].sort((a, b) => a.timeline - b.timeline);
        const lines = uniq.slice(0, 7).map(a => `• ${a.name} — about ${a.timeline} days`);
        return {
          text: (HI ? "सामान्य प्रक्रिया अवधि:\n\n" : "Typical processing times:\n\n")
            + lines.join("\n")
            + (HI ? "\n\nजिन अनुमतियों में कोई पूर्व-शर्त नहीं है, उन्हें एक साथ लगाया जा सकता है — इससे काफ़ी समय बचता है। डैशबोर्ड कैलेंडर पर लाल का अर्थ 2 दिन या कम, पीला 5 दिन या कम, हरा 10 दिन या कम है।"
                  : "\n\nApprovals with no dependencies can be filed at the same time, which saves a lot of calendar time. On the dashboard calendar red means 2 days or fewer, amber 5 or fewer, green 10 or fewer."),
          chips: HI ? ["समानांतर अनुमतियाँ", "कैलेंडर के रंग"] : ["Parallel approvals", "Calendar colours"],
        };
      } },

    { id: "translate", score: has("translate", "language", "hindi", "marathi", "tamil", "regional", "अनुवाद", "भाषा", "हिंदी", "मराठी"),
      build: () => ({
        text: HI
          ? "'स्कैन और अनुवाद' में तीन तरीक़े हैं:\n\n• भरा हुआ फ़ॉर्म — स्थानीय भाषा के भरे फ़ॉर्म की छवि डालें; हर क्षेत्र का अंग्रेज़ी अनुवाद और जो ग़लत या छूटा है वह दिखेगा\n• ख़ाली फ़ॉर्म — अंग्रेज़ी का ख़ाली फ़ॉर्म डालें, अपनी भाषा में अनुवाद पाएँ\n• लिखें और अनुवाद करें — दोनों दिशाओं में सीधा अनुवाद\n\nपूरी वेबसाइट भी ऊपर दाईं ओर के बटन से हिंदी में बदली जा सकती है।"
          : "Scan & Translate has three modes:\n\n• Filled form — photograph a form filled in a local language; every field is translated to English and anything wrong or missing is flagged\n• Blank form — upload an unfilled English form and get it translated into your language\n• Type & Translate — free text, in either direction\n\nThe whole site also switches to Hindi from the button in the top-right corner.",
        chips: HI ? ["फ़ॉर्म जाँचें", "वेबसाइट हिंदी में"] : ["Check a filled form", "Switch site to Hindi"],
      }) },

    { id: "calendar", score: has("calendar", "colour", "color", "red", "yellow", "green", "कैलेंडर", "रंग", "लाल", "हरा"),
      build: () => ({
        text: HI
          ? "डैशबोर्ड कैलेंडर पर हर तिथि का रंग बताता है कि कितना समय बचा है:\n\n• लाल — 2 दिन या कम\n• पीला — 5 दिन या कम\n• हरा — 10 दिन या कम\n• नीला — उससे आगे\n\nभरा हुआ गोला समय-सीमा है, और किनारे वाला गोला बुक किया गया अपॉइंटमेंट है।"
          : "On the dashboard calendar, each date's colour shows how much time is left:\n\n• Red — 2 days or fewer\n• Amber — 5 days or fewer\n• Green — 10 days or fewer\n• Blue — further out\n\nA solid circle is a deadline; a ringed circle is a booked appointment.",
        chips: HI ? ["समय बुक करें", "समय-सीमाएँ दिखाएँ"] : ["Book a slot", "Show my deadlines"],
      }) },

    { id: "human", score: has("human", "call", "phone", "helpline", "customer care", "talk", "agent", "फोन", "कॉल", "हेल्पलाइन", "बात"),
      build: () => ({
        text: (HI ? "किसी व्यक्ति से बात करने के लिए:\n\n" : "To reach a person:\n\n")
          + `• ${SUPPORT.phone}\n• ${SUPPORT.hours}\n• ${SUPPORT.email}\n`
          + (HI ? `\nशिकायत के लिए: ${SUPPORT.escalation}` : `\nFor grievances: ${SUPPORT.escalation}`),
        chips: HI ? ["अनुमतियाँ", "योजनाएँ"] : ["Approvals", "Schemes"],
      }) },
  ];

  const best = intents.reduce((a, b) => (b.score > a.score ? b : a), { score: 0 });
  if (!best.build || best.score === 0) {
    return {
      text: HI
        ? "इसका उत्तर मेरे पास मौजूद जानकारी में नहीं मिला, और मैं अनुमान नहीं लगाऊँगा।\n\nमैं इन विषयों पर सटीक उत्तर दे सकता हूँ: अनुमतियाँ, कार्यालय और अधिकारी, दस्तावेज़ और प्रारूप, सरकारी योजनाएँ, समय-सीमाएँ और अनुवाद।\n\nइसके अलावा किसी बात के लिए " + SUPPORT.phone + " पर कॉल करें।"
        : "I could not ground that in the information I hold, and I would rather not guess.\n\nI can answer accurately on: approvals, offices and officers, documents and number formats, government schemes, timelines and translation.\n\nFor anything beyond that, call " + SUPPORT.phone + ".",
      chips: HI ? ["मुझे कौन सी अनुमतियाँ चाहिए?", "कार्यालय कहाँ है?", "योजनाएँ"]
                : ["Which approvals do I need?", "Where is the office?", "Schemes"],
    };
  }
  return best.build();
}

/**
 * GattuChat — the Digital Twin assistant panel. Conversation lives in component state
 * only; nothing is stored or transmitted.
 */

/**
 * GattuAvatar — lightweight inline SVG avatar so the prototype does not
 * depend on another image file. Gattu is the voice-enabled Digital Twin.
 */
function GattuAvatar({ size = 42, listening = false }) {
  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center ${
        listening ? "ring-4 ring-[#176B63]/25" : ""
      }`}
      style={{ width: size, height: size, background: "#E8F7F4" }}
      title="Gattu — Voice-enabled Digital Twin"
    >
      <img
        src="/gattu.png"
        alt="Gattu - Voice-enabled Digital Twin"
        className="w-full h-full object-cover rounded-full"
      />

      {listening && (
        <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-[#176B63] border-2 border-white animate-pulse" />
      )}
    </div>
  );
}

function SahayakChat({ open, onClose }) {
  const { t, lang } = useT();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Browser speech synthesis. Gattu speaks only when the user asked by voice.
  // 1.35 is intentionally faster for a responsive live demo.
  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const clean = (text || "").replace(/[•📞✉️]/g, "").trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.35;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  useEffect(() => {
    if (open) {
      // Start every new chatbot opening with Gattu's introduction.
      // Reset the conversation so the intro appears every time the chatbot opens.
      const intro = lang === "hi"
        ? {
            text: "नमस्ते! मैं गट्टू हूँ। मैं अनुमतियों, दस्तावेज़ों, सरकारी कार्यालयों और योजनाओं में आपकी मदद कर सकता हूँ।",
            chips: ["मुझे कौन सी अनुमतियाँ चाहिए?", "कार्यालय कहाँ है?", "दस्तावेज़ कैसे जाँचें?", "योजनाएँ"]
          }
        : {
            text: "Hello I am Gattu. I can help you with approvals, documents, government offices and schemes. How can I help you today?",
            chips: ["Which approvals do I need?", "Where is the office?", "How do I check documents?", "Government schemes"]
          };
      setMsgs([{ from: "bot", text: intro.text, chips: intro.chips }]);
    }
  }, [open, lang]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Speech-to-text using the browser Web Speech API.
  const startListening = () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      setTimeout(() => send(transcript, true), 50);
    };

    recognition.start();
  };

  const send = (textOverride, fromVoice = false) => {
    const text = (textOverride !== undefined ? textOverride : input).trim();
    if (!text) return;

    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);

    setMsgs(m => [...m, { from: "user", text }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const a = sahayakAnswer(text, lang);
      setMsgs(m => [...m, { from: "bot", text: a.text, chips: a.chips }]);
      setTyping(false);

      // Only speak when the user's question came from the microphone.
      if (fromVoice) {
        setTimeout(() => speak(a.text), 120);
      }
    }, 450);
  };

  if (!open) return null;

  const last = msgs[msgs.length - 1];

  return (
    <div
      className="fixed bottom-24 right-5 z-50 w-[min(25rem,calc(100vw-2.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: "min(36rem, calc(100vh - 8rem))" }}
    >
      {/* Gattu header */}
      <div className="bg-[#176B63] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <GattuAvatar size={44} listening={listening || speaking} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Gattu</p>
            <p className="text-[10px] text-[#E8F7F4]">
              Voice-enabled Digital Twin
            </p>
            <p className="text-[9px] text-white/70 mt-0.5">
              {listening ? "Listening..." : speaking ? "Speaking..." : "Ready to help"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
            setSpeaking(false);
            onClose();
          }}
          aria-label="Close Gattu"
          className="text-[#E8F7F4] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.from === "bot" && (
              <div className="mr-2 mt-1">
                <GattuAvatar size={30} listening={i === msgs.length - 1 && speaking} />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                m.from === "user"
                  ? "bg-[#176B63] text-white rounded-br-sm"
                  : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start items-center">
            <GattuAvatar size={30} />
            <div className="ml-2 bg-white border border-slate-200 rounded-xl rounded-bl-sm px-3 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}

        {!typing && last?.from === "bot" && last.chips && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {last.chips.map((c, i) => (
              <button
                key={i}
                onClick={() => send(c)}
                className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-full hover:border-[#176B63]/60 hover:text-[#0F5B54] transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice + text composer */}
      <div className="p-2.5 border-t border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={startListening}
            title={listening ? "Listening..." : "Talk to Gattu"}
            aria-label={listening ? "Listening" : "Talk to Gattu"}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              listening
                ? "bg-[#176B63] text-white animate-pulse"
                : "bg-[#E8F7F4] text-[#0F5B54] hover:bg-[#CFE9E3]"
            }`}
          >
            {listening ? <span className="text-xs font-bold">●</span> : <MicIcon />}
          </button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask Gattu anything..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
          />

          <button
            onClick={() => send()}
            disabled={!input.trim()}
            aria-label={t("bot.send")}
            className="w-9 h-9 rounded-lg bg-[#176B63] text-white flex items-center justify-center hover:bg-[#12564F] disabled:bg-slate-200 disabled:text-slate-400 transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-1.5 px-1">
          <p className="text-[10px] text-slate-400">
            Speak or type • Gattu replies with voice
          </p>

          {speaking && (
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }}
              className="text-[10px] text-[#0F5B54] hover:underline"
            >
              Stop voice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}

/**
 * SupportDock — the persistent bottom-right cluster.
 * Renders on every screen including login and the declaration, so the helpline
 * is reachable even before a user is signed in.
 */
function SupportDock() {
  const { t } = useT();
  const [helpOpen, setHelpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <SahayakChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Help card */}
      {helpOpen && !chatOpen && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(19rem,calc(100vw-2.5rem))] bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <HelpCircle size={15} className="text-[#176B63]" /> {t("help.title")}
            </h3>
            <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={15} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <a href={`tel:${SUPPORT.phoneRaw}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#176B63]/10 border border-[#176B63]/20 hover:bg-[#176B63]/15 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#176B63] flex items-center justify-center shrink-0">
                <PhoneCall size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#176B63] font-medium">{t("help.callUs")}</p>
                <p className="text-sm font-bold text-slate-800">{SUPPORT.phone}</p>
                <p className="text-[10px] text-slate-500">{SUPPORT.hours}</p>
              </div>
            </a>

            <div className="space-y-1.5 text-xs">
              <a href={`mailto:${SUPPORT.email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#176B63] break-all">
                <Mail size={13} className="text-slate-400 shrink-0" /> {SUPPORT.email}
              </a>
              <a href={`mailto:${SUPPORT.escalation}`} className="flex items-center gap-2 text-slate-600 hover:text-[#176B63] break-all">
                <AlertCircle size={13} className="text-slate-400 shrink-0" /> {SUPPORT.escalation}
              </a>
            </div>

            <button onClick={() => { setHelpOpen(false); setChatOpen(true); }}
              className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] flex items-center justify-center gap-2">
              <GattuAvatar size={22} /> Talk to Gattu
            </button>
            <p className="text-[10px] text-slate-400 text-center">{t("help.botHint")}</p>
          </div>
        </div>
      )}

      {/* Floating buttons */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
        <button
          onClick={() => { setChatOpen(v => !v); setHelpOpen(false); }}
          title="Gattu — Voice-enabled Digital Twin"
          aria-label="Open Gattu"
          className="w-14 h-14 rounded-full bg-white border-2 border-[#176B63] flex items-center justify-center shadow-lg hover:scale-105 transition-transform overflow-hidden">
          {chatOpen ? <X size={20} className="text-[#0F5B54]" /> : <GattuAvatar size={52} />}
        </button>
        <button
          onClick={() => { setHelpOpen(v => !v); setChatOpen(false); }}
          title={t("help.title")} aria-label={t("help.title")}
          className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-lg hover:border-[#176B63]/60 hover:text-[#176B63] transition-colors">
          <HelpCircle size={20} />
        </button>
      </div>
    </>
  );
}

/**
 * DeclarationPage — mandatory acceptance gate, shown after sign-in and before
 * the app itself.
 *
 * The checkbox is compulsory: the continue button stays disabled until it is
 * ticked, and attempting to continue without it surfaces an inline error. This
 * is deliberate — the declaration covers the two things this prototype must be
 * honest about (it is not a government portal, and its document checks are
 * format checks, not records lookups) plus the user's own undertaking that
 * what they submit is true.
 *
 * Acceptance is session state only. It is not persisted, so it is asked again
 * on every fresh session, which is the correct behaviour for a legal notice.
 */

// ==========================================================================
//  GOVERNMENT OFFICER DASHBOARD
// --------------------------------------------------------------------------
//  Role-specific prototype view. Government officials see a work queue rather
//  than the entrepreneur's approval-discovery workflow. The records below are
//  representative demo records for the SIH presentation; a production build
//  would read them from the department/API backend.
// ==========================================================================
const GOVT_PENDING_APPROVALS = [
  {
    id: "GOV-2401", applicant: "GreenTech Industries", approval: "Factory License", days: 1,
    status: "Document Review", priority: "Urgent", district: "Nashik",
    documents: [
      { name: "PAN Card", file: "PAN_GreenTech.pdf", status: "Verified" },
      { name: "Aadhaar Card", file: "Aadhaar_Director.pdf", status: "Verified" },
      { name: "Land Ownership / Lease Deed", file: "Factory_Lease_Deed.pdf", status: "Verified" },
      { name: "Site Plan", file: "Factory_Site_Plan.pdf", status: "Verified" },
      { name: "Fire NOC", file: "Fire_NOC.pdf", status: "Pending Review" },
    ]
  },
  {
    id: "GOV-2407", applicant: "Shri Ganesh Foods", approval: "Pollution Control Board Consent", days: 3,
    status: "Technical Review", priority: "High", district: "Nashik",
    documents: [
      { name: "Udyam Registration", file: "Udyam_GaneshFoods.pdf", status: "Verified" },
      { name: "Process Flow Diagram", file: "Process_Flow.pdf", status: "Verified" },
      { name: "Water / Effluent Details", file: "Effluent_Details.pdf", status: "Pending Review" },
      { name: "Site Photographs", file: "Site_Photos.zip", status: "Verified" },
    ]
  },
  {
    id: "GOV-2412", applicant: "Sunrise Manufacturing", approval: "Fire Safety Certificate", days: 5,
    status: "Inspection Pending", priority: "Normal", district: "Nashik",
    documents: [
      { name: "Building Plan", file: "Building_Plan.pdf", status: "Verified" },
      { name: "Fire Equipment Layout", file: "Fire_Layout.pdf", status: "Verified" },
      { name: "Occupancy Details", file: "Occupancy_Details.pdf", status: "Verified" },
    ]
  },
  {
    id: "GOV-2418", applicant: "Nova Textiles Pvt Ltd", approval: "Factory License", days: 7,
    status: "Document Review", priority: "Normal", district: "Nashik",
    documents: [
      { name: "PAN Card", file: "PAN_NovaTextiles.pdf", status: "Verified" },
      { name: "Company Incorporation Certificate", file: "COI_NovaTextiles.pdf", status: "Verified" },
      { name: "Factory Layout", file: "Factory_Layout.pdf", status: "Pending Review" },
      { name: "Occupancy / Lease Proof", file: "Lease_Proof.pdf", status: "Verified" },
    ]
  },
];

const GOVT_TODAY_APPOINTMENTS = [
  { time: "09:30 AM", applicant: "GreenTech Industries", purpose: "Factory License", token: "NSK/NAS/104281", location: "Counter 4 · Udyog Bhavan", status: "Upcoming" },
  { time: "11:00 AM", applicant: "Shri Ganesh Foods", purpose: "PCB Technical Hearing", token: "NSK/NAS/104296", location: "Conference Room 2", status: "Upcoming" },
  { time: "01:30 PM", applicant: "Sunrise Manufacturing", purpose: "Site Inspection Review", token: "NSK/NAS/104311", location: "Officer Chamber", status: "Upcoming" },
  { time: "03:30 PM", applicant: "Nova Textiles Pvt Ltd", purpose: "Document Verification", token: "NSK/NAS/104325", location: "Counter 2 · Udyog Bhavan", status: "Upcoming" },
];

function govtPriority(value, t) {
  if (value === "Urgent") return t("gov.urgent");
  if (value === "High") return t("gov.high");
  return value;
}

function govtStatus(value, t) {
  if (value === "Pending Review") return t("gov.pendingReview");
  if (value === "Scheduled") return t("gov.scheduled");
  return value;
}

function GovtOfficerDashboard({ user, setPage, approvals, onReview }) {
  const { t, lang, setLang } = useT();
  const urgent = approvals.filter(a => a.priority === "Urgent").length;
  const high = approvals.filter(a => a.priority === "High").length;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#0F5B54] uppercase tracking-wide">{t("gov.portal")}</p>
          <h1 className="text-2xl font-semibold text-slate-800 mt-1">{t("gov.goodMorning", user.name)}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("gov.dashboardSub")}</p>
        </div>
        <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500">
          <span className="font-medium text-slate-700">{t("gov.division")}</span> · {t("gov.industrialApprovals")}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t("gov.pending")} value={approvals.length} sub={t("gov.awaitingAction")} color="blue" />
        <StatCard icon={CalendarDays} label={t("gov.todayAppointments")} value="4" sub={t("gov.scheduledToday")} color="purple" />
        <StatCard icon={AlertTriangle} label={t("gov.priorityCases")} value={urgent + high} sub={`${urgent} ${t("gov.urgent")} · ${high} ${t("gov.high")}`} color="amber" />
        <StatCard icon={CheckCircle} label={t("gov.processedWeek")} value="31" sub={t("gov.applicationsCompleted")} color="green" />
      </div>
      <div className="grid xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div><h2 className="font-semibold text-slate-800">{t("gov.approvalQueue")}</h2><p className="text-xs text-slate-400 mt-0.5">{t("gov.openCase")}</p></div>
            <button onClick={() => setPage("approvals")} className="text-xs font-medium text-[#0F5B54] hover:underline">{t("gov.viewAll")}</button>
          </div>
          <div className="divide-y divide-slate-100">
            {approvals.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">{t("gov.allProcessed")}</div> : approvals.map(a => (
              <div key={a.id} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-medium text-slate-800 truncate">{a.applicant}</p><span className={`text-[10px] px-2 py-0.5 rounded-full border ${a.priority === "Urgent" ? "bg-red-50 text-red-700 border-red-200" : a.priority === "High" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{govtPriority(a.priority,t)}</span></div>
                  <p className="text-xs text-slate-500 mt-1">{a.approval} · {a.id}</p><p className="text-[11px] text-slate-400 mt-1">{a.district} · {govtStatus(a.status,t)}</p>
                </div><div className="text-right shrink-0 flex flex-col items-end gap-2"><div><p className={`text-xs font-semibold ${a.days <= 2 ? "text-red-600" : "text-slate-600"}`}>{a.days} {t("gov.days")}</p><p className="text-[10px] text-slate-400">{t("gov.inQueue")}</p></div><button onClick={() => onReview(a)} className="inline-flex items-center gap-1.5 bg-[#176B63] text-white px-3 py-1.5 rounded-md text-[11px] font-medium hover:bg-[#12564F]"><Eye size={13} /> {t("gov.reviewCase")}</button></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-2 bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-semibold text-slate-800">{t("gov.todayAppointments")}</h2><p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</p></div><CalendarDays size={17} className="text-[#176B63]" /></div>
          <div className="divide-y divide-slate-100">{GOVT_TODAY_APPOINTMENTS.map((a,i)=><div key={i} className="px-5 py-4"><div className="flex gap-3"><div className="w-16 shrink-0"><p className="text-xs font-semibold text-[#0F5B54]">{a.time}</p></div><div className="min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{a.applicant}</p><p className="text-xs text-slate-500 mt-0.5">{a.purpose}</p><p className="text-[10px] text-slate-400 mt-1">{a.token} · {a.location}</p></div></div></div>)}</div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100"><button onClick={() => setPage("appointments")} className="w-full text-xs font-medium text-[#0F5B54] py-1.5 hover:underline">{t("gov.openSchedule")}</button></div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{[
        {icon:FileCheck,title:t("gov.reviewDocuments"),sub:t("gov.reviewDocumentsSub"),page:"approvals"},
        {icon:Clock3,title:t("gov.slaWatchlist"),sub:t("gov.slaWatchlistSub"),page:"approvals"},
      ].map((item,i)=><button key={i} onClick={()=>item.action === "language" ? setLang(lang === "en" ? "hi" : "en") : setPage(item.page)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-[#176B63]/50 hover:shadow-sm transition-all"><div className="w-9 h-9 rounded-lg bg-[#E8F7F4] text-[#0F5B54] flex items-center justify-center mb-3"><item.icon size={17}/></div><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.sub}</p></button>)}</div>
    </div>
  );
}

function GovtApprovalsPage({ setPage, approvals, onReview }) {
  const { t } = useT();
  return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-800">{t("gov.pendingTitle")}</h1><p className="text-sm text-slate-500 mt-1">{t("gov.pendingSub")}</p></div><span className="px-3 py-1.5 rounded-full bg-[#E8F7F4] text-[#0F5B54] border border-[#CFE9E3] text-xs font-medium">{t("gov.pendingCount",approvals.length)}</span></div><div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden"><div className="divide-y divide-slate-100">{approvals.length===0?<div className="p-10 text-center text-sm text-slate-500">{t("gov.noPending")}</div>:approvals.map(a=><div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-slate-800">{a.applicant}</p><span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">{govtPriority(a.priority,t)}</span></div><p className="text-xs text-slate-500 mt-1">{a.approval} · {a.id}</p><p className="text-xs text-slate-400 mt-1">{govtStatus(a.status,t)} · {a.district} · {a.days} {t("gov.days")} {t("gov.inQueue")}</p></div><button onClick={()=>onReview(a)} className="inline-flex items-center justify-center gap-2 bg-[#176B63] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#12564F] shrink-0"><FileCheck size={14}/> {t("gov.reviewDocumentsBtn")}</button></div>)}</div></div><button onClick={()=>setPage("dashboard")} className="text-sm text-[#0F5B54] hover:underline">← {t("nav.dashboard")}</button></div>;
}

function GovtApprovalReviewModal({ approval, onClose, onDecision }) {
  const { t } = useT(); const [confirming,setConfirming]=useState(null); if(!approval)return null;
  const verified=approval.documents.filter(d=>d.status==="Verified").length; const pending=approval.documents.filter(d=>d.status!=="Verified").length;
  return <div className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"><div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"><div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-wider font-semibold text-[#0F5B54]">{t("gov.applicationReview")}</p><h2 className="text-lg font-semibold text-slate-800 mt-1">{approval.applicant}</h2><p className="text-xs text-slate-500 mt-1">{approval.approval} · {approval.id} · {approval.district}</p></div><button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center"><X size={18}/></button></div><div className="p-5 overflow-y-auto space-y-5"><div className="grid grid-cols-3 gap-3"><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-[10px] text-slate-400">{t("gov.status")}</p><p className="text-xs font-semibold text-slate-700 mt-1">{govtStatus(approval.status,t)}</p></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-[10px] text-slate-400">{t("gov.inQueue")}</p><p className="text-xs font-semibold text-slate-700 mt-1">{approval.days} {t("gov.days")}</p></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><p className="text-[10px] text-slate-400">{t("gov.priority")}</p><p className="text-xs font-semibold text-slate-700 mt-1">{govtPriority(approval.priority,t)}</p></div></div><div><div className="flex items-center justify-between mb-2"><div><h3 className="text-sm font-semibold text-slate-800">{t("gov.submittedDocuments")}</h3><p className="text-xs text-slate-400 mt-0.5">{t("gov.checklistSub")}</p></div><span className="text-xs text-slate-500">{verified}/{approval.documents.length} {t("gov.verified")}</span></div><div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">{approval.documents.map((doc,i)=><div key={i} className="px-4 py-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.status==="Verified"?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600"}`}>{doc.status==="Verified"?<CheckCircle size={15}/>:<Clock3 size={15}/>}</div><div className="min-w-0"><p className="text-xs font-medium text-slate-700 truncate">{doc.name}</p><p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.file}</p></div></div><span className={`text-[10px] px-2 py-1 rounded-full border shrink-0 ${doc.status==="Verified"?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>{doc.status === "Verified" ? t("gov.verified") : t("gov.pendingReview")}</span></div>)}</div>{pending>0&&<p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">{t("gov.awaitingReview",pending)}</p>}</div></div><div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row gap-2"><button onClick={()=>setConfirming("decline")} className="flex-1 border border-red-200 text-red-700 bg-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"><XCircle size={15}/> {t("gov.decline")}</button><button onClick={()=>setConfirming("approve")} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"><CheckCircle size={15}/> {t("gov.approve")}</button></div></div>{confirming&&<div className="absolute inset-0 z-10 bg-slate-900/30 flex items-center justify-center p-4"><div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] shadow-xl p-5 max-w-sm w-full"><h3 className="text-sm font-semibold text-slate-800">{confirming==="approve"?t("gov.approveQuestion"):t("gov.declineQuestion")}</h3><p className="text-xs text-slate-500 mt-2">{t("gov.updateNotice",approval.id)}</p><div className="flex gap-2 mt-5"><button onClick={()=>setConfirming(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">{t("gov.cancel")}</button><button onClick={()=>onDecision(approval.id,confirming)} className={`flex-1 py-2 rounded-lg text-xs font-medium text-white ${confirming==="approve"?"bg-emerald-600 hover:bg-emerald-700":"bg-red-600 hover:bg-red-700"}`}>{confirming==="approve"?t("gov.yesApprove"):t("gov.yesDecline")}</button></div></div></div>}</div>;
}


function GovtAppointmentsPage({ setPage }) {
  const { t } = useT(); return <div className="space-y-5"><div><h1 className="text-2xl font-semibold text-slate-800">{t("gov.appointmentsTitle")}</h1><p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div><div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden"><div className="divide-y divide-slate-100">{GOVT_TODAY_APPOINTMENTS.map((a,i)=><div key={i} className="p-5 flex gap-4"><div className="w-20 shrink-0"><p className="text-sm font-semibold text-[#0F5B54]">{a.time}</p></div><div><p className="text-sm font-semibold text-slate-800">{a.applicant}</p><p className="text-xs text-slate-500 mt-1">{a.purpose}</p><p className="text-xs text-slate-400 mt-1">{a.token} · {a.location}</p></div><span className="ml-auto self-start text-[10px] px-2 py-1 rounded-full bg-[#E8F7F4] text-[#0F5B54] border border-[#CFE9E3]">{govtStatus(a.status,t)}</span></div>)}</div></div><button onClick={()=>setPage("dashboard")} className="text-sm text-[#0F5B54] hover:underline">← {t("nav.dashboard")}</button></div>;
}

function GovtReportsPage({ setPage }) {
  const { t } = useT(); const rows=[["Factory License",12,9,"3.8 days"],["PCB Consent",8,6,"5.2 days"],["Fire Safety",6,5,"2.7 days"],["GST / Registration",10,10,"1.4 days"]]; return <div className="space-y-5"><div><h1 className="text-2xl font-semibold text-slate-800">{t("gov.reportsTitle")}</h1><p className="text-sm text-slate-500 mt-1">{t("gov.reportsSub")}</p></div><div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 font-semibold text-sm text-slate-800">{t("gov.weeklySummary")}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-500 text-xs"><th className="text-left px-5 py-3 font-medium">{t("gov.approval")}</th><th className="text-left px-5 py-3 font-medium">{t("gov.received")}</th><th className="text-left px-5 py-3 font-medium">{t("gov.processed")}</th><th className="text-left px-5 py-3 font-medium">{t("gov.avgTime")}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="px-5 py-3 text-slate-700">{r[0]}</td><td className="px-5 py-3 text-slate-600">{r[1]}</td><td className="px-5 py-3 text-slate-600">{r[2]}</td><td className="px-5 py-3 text-slate-600">{r[3]}</td></tr>)}</tbody></table></div></div><button onClick={()=>setPage("dashboard")} className="text-sm text-[#0F5B54] hover:underline">← {t("nav.dashboard")}</button></div>;
}

function DeclarationPage({ user, onAccept, onBack }) {
  const { t } = useT();
  const [checked, setChecked] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const clauses = [
    { h: t("decl.h1"), p: t("decl.p1"), icon: Landmark },
    { h: t("decl.h2"), p: t("decl.p2"), icon: AlertCircle },
    { h: t("decl.h3"), p: t("decl.p3"), icon: ShieldCheck },
    { h: t("decl.h4"), p: t("decl.p4"), icon: UserCheck },
    { h: t("decl.h5"), p: t("decl.p5"), icon: Fingerprint },
  ];

  const proceed = () => {
    setAttempted(true);
    if (checked) onAccept();
  };

  return (
    <div className="min-h-screen bg-[#EAF8F5] font-sans">
      {/* Top bar — language toggle stays reachable here too */}
      <div className="bg-[#F7FCFB]/95 backdrop-blur border-b border-[#176B63]/10 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_12px_rgba(23,107,99,0.04)]">
        <div className="flex items-center gap-3">
          <img
            src="/industry-saarthi-logo-clean.png"
            alt="Industry Saarthi"
            className="w-11 h-11 object-contain shrink-0"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-800">Industry Saarthi</p>
            <p className="text-[10px] text-slate-400">{t("decl.signedInAs")} {user.name}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-slate-800">{t("decl.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("decl.subtitle")}</p>
        </div>

        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] divide-y divide-slate-100">
          {clauses.map((c, i) => (
            <div key={i} className="p-5 flex gap-4">
              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <c.icon size={16} className="text-slate-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-1.5">{c.h}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{c.p}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compulsory acceptance */}
        <div className={`mt-5 rounded-xl border p-5 transition-colors ${attempted && !checked ? "bg-red-50 border-red-300" : checked ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={checked}
              onChange={e => { setChecked(e.target.checked); if (e.target.checked) setAttempted(false); }}
              className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer shrink-0" />
            <span className={`text-sm leading-relaxed ${checked ? "text-emerald-900" : "text-slate-700"}`}>
              {t("decl.checkbox")}
            </span>
          </label>
          {attempted && !checked && (
            <p className="text-sm text-red-600 mt-3 flex items-center gap-1.5 pl-7">
              <XCircle size={14} /> {t("decl.mustAccept")}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-5">
          <button onClick={onBack}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-white">
            {t("decl.back")}
          </button>
          <button onClick={proceed} disabled={!checked}
            className="flex-1 bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {t("decl.accept")} <ArrowRight size={14} />
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">SIH 2026 · Team Stack_OF · PS SIH26130</p>
      </div>
      <SupportDock />
    </div>
  );
}


// ==========================================================================
//  SAHAYAK — KNOWLEDGE BASE & CHATBOT ENGINE
// --------------------------------------------------------------------------
//  Sahayak ("Helper") is a rule-based FAQ chatbot.  It matches typed queries
//  against keyword patterns with a simple score so phrasing variations work
//  without any backend.  Unanswered queries escalate to the helpline number.
// ==========================================================================

const HELP_PHONE = "1800-572-7246";
const HELP_EMAIL = "support@industrysaarthi.gov.in";
const HELP_HOURS = "Mon – Sat, 9:00 AM – 6:00 PM IST";

const KB = [
  { patterns: ["login","sign in","password","forgot","account","लॉगिन","पासवर्ड"],
    answer: "To sign in, enter any email and password — this is a demo and no real credentials are checked. If you are stuck, press 'Skip and continue as guest'." },
  { patterns: ["approval","process","how long","time","days","अनुमति","कितने दिन"],
    answer: "Processing times vary:\n• GST Registration: ~7 days\n• Udyam/MSME: 1 day (instant)\n• Factory Licence: 30–45 days\n• PCB Consent: 45–60 days\n\nYour roadmap shows the estimate for each approval." },
  { patterns: ["document","file","upload","scan","ocr","दस्तावेज़","अपलोड"],
    answer: "Go to Document Check in the sidebar.\n• Upload & Scan: OCR-based checks on an uploaded image.\n• Format Verification: checks PAN/Aadhaar/GSTIN structure and real check digits — no database needed." },
  { patterns: ["pan","aadhaar","gstin","udyam","format","verify","पैन","आधार"],
    answer: "In Document Check → Format Verification, paste the number. The tool checks:\n• Structure against the official pattern\n• Verhoeff check digit on Aadhaar\n• Mod-36 check character on GSTIN\n• Whether the GSTIN contains your PAN in positions 3–12" },
  { patterns: ["appointment","book","slot","office","visit","अपॉइंटमेंट","बुकिंग"],
    answer: "Open the Approval Roadmap → press 'Start Application' on any offline approval. An office-visit panel expands with address, officer details, steps, and a slot picker. Booked appointments appear in purple on the dashboard calendar." },
  { patterns: ["calendar","deadline","date","due","समय-सीमा","कैलेंडर"],
    answer: "The dashboard calendar shows:\n• Deadline bubbles: red ≤2 days, amber ≤5, green ≤10, blue later\n• Appointment bubbles: purple\n\nClick any date to see what is due or scheduled that day." },
  { patterns: ["scheme","benefit","subsidy","loan","incentive","योजना","लाभ","सब्सिडी"],
    answer: "Go to Schemes in the sidebar. Schemes are matched automatically to your project sector. Each shows the benefit amount, eligibility, and a direct link to the official government portal." },
  { patterns: ["translate","language","hindi","marathi","regional","local","अनुवाद","भाषा"],
    answer: "Scan & Translate has three modes:\n1. Filled Document — upload a local-language form; each field is translated and validated.\n2. Blank Form — upload an English form; get it translated to your language.\n3. Type & Translate — type a phrase and get an instant translation either way." },
  { patterns: ["roadmap","step","parallel","phase","workflow","रोडमैप","चरण"],
    answer: "The Approval Roadmap splits approvals into:\n• Phase 1 — no dependencies, file simultaneously.\n• Phase 2 — must wait for others first.\nStart any approval to see whether it is online or needs an office visit." },
  { patterns: ["contact","phone","call","help","support","human","agent","संपर्क","फोन","सहायता"],
    answer: `For human help:\n📞 Helpline: ${HELP_PHONE}\n   (${HELP_HOURS})\n✉️  Email: ${HELP_EMAIL}` },
  { patterns: ["new project","register","start","create","नई परियोजना","पंजीकरण"],
    answer: "Click 'New Project' in the sidebar. Enter your business name, sector, state, entity type and size. The system identifies all required approvals automatically." },
  { patterns: ["offline","online","portal","website","link","ऑनलाइन","पोर्टल"],
    answer: "Each approval is tagged:\n• Fully online — direct link to the official portal.\n• Office visit needed — address, officer name, and slot picker.\n• Hybrid — file online first, then attend a hearing." },
  { patterns: ["declaration","terms","accept","घोषणा","शर्तें"],
    answer: "The Declaration appears once per session. Tick the checkbox to confirm you have read the terms. It shows every session as it is a legal notice and is not persisted." },
];

function matchKB(query) {
  const q = query.toLowerCase();
  let best = null, bestScore = 0;
  KB.forEach(entry => {
    const score = entry.patterns.filter(p => q.includes(p)).length;
    if (score > bestScore) { bestScore = score; best = entry; }
  });
  return bestScore >= 1 ? best : null;
}

/**
 * LoginPage — demo-only sign-in gate.
 *
 * IMPORTANT: this stores nothing. There is no backend call, no localStorage,
 * no cookie, and no password check. What you type lives in component state for
 * the length of the render and is discarded on submit — refreshing the page
 * returns you here. It exists so the prototype opens the way the real product
 * would, and so the role choice can drive RBAC views later.
 *
 * In production this becomes: POST /auth/login -> JWT in an httpOnly cookie,
 * with the role claim driving Role Based Access Control across the app.
 */
function LoginPage({ onLogin }) {
  const { t, lang } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Business Owner");
  const [busy, setBusy] = useState(false);
  const [authStep, setAuthStep] = useState("login");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const isHindi = lang === "hi";
  const govtDemoOtp = "482716";
  const ownerDemoOtp = "314159";
  const demoOtp = role === "Govt. Officer" ? govtDemoOtp : ownerDemoOtp;

  const roles = [
    { id: "Business Owner", label: t("login.roleOwner") },
    { id: "Govt. Officer", label: t("login.roleOfficer") },
  ];

  const submit = async () => {
  if (!email.trim() || !password.trim()) return;

  setBusy(true);

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "Invalid email or password");
      setBusy(false);
      return;
    }

    console.log("Logged in user:", data.user);

    // Convert database role into the role used by the existing UI
    const uiRole =
      data.user.role === "business_owner"
        ? "Business Owner"
        : data.user.role === "govt_officer"
          ? "Govt. Officer"
          : data.user.role;

    // Continue with the existing Industry Saarthi login flow
    onLogin({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: uiRole
    });

  } catch (error) {

    console.error("Login error:", error);

    alert("Unable to connect to the Industry Saarthi server.");

  } finally {
    setBusy(false);
  }
};

  const registerBusinessOwner = async () => {
    setRegisterError("");
    setRegisterSuccess("");

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword || !registerConfirmPassword) {
      setRegisterError(isHindi ? "कृपया सभी फ़ील्ड भरें।" : "Please fill in all fields.");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(isHindi ? "पासवर्ड मेल नहीं खाते।" : "Passwords do not match.");
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError(isHindi ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          role: "business_owner"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setRegisterError(data.message || (isHindi ? "पंजीकरण विफल रहा।" : "Registration failed."));
        return;
      }

      setEmail(registerEmail.trim());
      setPassword("");
      setRole("Business Owner");
      setRegisterSuccess(
        isHindi
          ? "खाता सफलतापूर्वक बनाया गया। अब अपने ईमेल और पासवर्ड से साइन इन करें।"
          : "Account created successfully. You can now sign in with your email and password."
      );
      setAuthStep("login");
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
    } catch (error) {
      console.error("Registration error:", error);
      setRegisterError(
        isHindi
          ? "Industry Saarthi सर्वर से कनेक्ट नहीं हो सका।"
          : "Unable to connect to the Industry Saarthi server."
      );
    } finally {
      setBusy(false);
    }
  };

  const openRegistration = () => {
    setRegisterError("");
    setRegisterSuccess("");
    setAuthStep("register");
  };

  const backToRegistrationLogin = () => {
    setRegisterError("");
    setRegisterSuccess("");
    setAuthStep("login");
  };

  const verifyOtp = () => {
    setOtpError("");
    if (otp.replace(/\s/g, "") !== demoOtp) {
      setOtpError(role === "Govt. Officer" ? (isHindi ? "गलत OTP। कृपया 482716 दर्ज करें।" : "Incorrect OTP. For this demo, enter 482716.") : (isHindi ? "गलत OTP। कृपया 314159 दर्ज करें।" : "Incorrect OTP. For this demo, enter 314159."));
      return;
    }

    setBusy(true);
    setTimeout(() => {
      const display = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      onLogin({ name: display || (role === "Govt. Officer" ? "Government Officer" : "Demo User"), role });
    }, 650);
  };

  const resendOtp = () => {
    setResendMessage(role === "Govt. Officer" ? (isHindi ? "नया OTP भेजा गया।" : "A new OTP has been sent to your registered device.") : (isHindi ? "नया ईमेल सत्यापन कोड भेजा गया।" : "A new email verification code has been sent."));
    setOtp("");
    setOtpError("");
    setTimeout(() => setResendMessage(""), 3000);
  };

  const backToLogin = () => {
    setAuthStep("login");
    setOtp("");
    setOtpError("");
    setResendMessage("");
  };

  const guestLogin = () => {
    setBusy(true);
    setTimeout(() => onLogin({ name: "Demo User", role: "Business Owner" }), 700);
  };

  if (authStep === "register") {
    return (
      <div className="min-h-screen bg-[#EAF8F5] font-sans">
        <div className="flex justify-end p-4"><LanguageToggle /></div>
        <div className="flex items-center justify-center px-4 pb-10 pt-2">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <img
                src="/industry-saarthi-logo-clean.png"
                alt="Industry Saarthi"
                className="w-20 h-20 object-contain mx-auto mb-3"
              />
              <h1 className="text-2xl font-semibold text-slate-800">Industry Saarthi</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isHindi ? "नया Business Owner खाता बनाएँ" : "Create a new Business Owner account"}
              </p>
            </div>

            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isHindi ? "पूरा नाम" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  placeholder={isHindi ? "अपना नाम दर्ज करें" : "Enter your full name"}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isHindi ? "ईमेल" : "Email"}
                </label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isHindi ? "पासवर्ड" : "Password"}
                </label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  placeholder={isHindi ? "कम से कम 6 अक्षर" : "At least 6 characters"}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isHindi ? "पासवर्ड की पुष्टि करें" : "Confirm Password"}
                </label>
                <input
                  type="password"
                  value={registerConfirmPassword}
                  onChange={e => setRegisterConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && registerBusinessOwner()}
                  placeholder={isHindi ? "पासवर्ड दोबारा दर्ज करें" : "Re-enter your password"}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
                />
              </div>

              {registerError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                  {registerError}
                </div>
              )}

              <button
                onClick={registerBusinessOwner}
                disabled={busy}
                className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {isHindi ? "खाता बनाया जा रहा है..." : "Creating account..."}</>
                  : <>{isHindi ? "खाता बनाएँ" : "Create Account"} <ArrowRight size={14} /></>}
              </button>

              <button
                onClick={backToRegistrationLogin}
                className="w-full text-xs text-slate-500 hover:text-[#0F5B54] pt-1"
              >
                ← {isHindi ? "पहले से खाता है? साइन इन करें" : "Already have an account? Sign in"}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-5">
              SIH 2026 · Team Stack_OF · PS SIH26130
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (authStep === "emailOtp") {
    return (
      <div className="min-h-screen bg-[#EAF8F5] font-sans">
        <div className="flex justify-end p-4">
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-center px-4 pb-10 pt-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-7">
              <img src="/industry-saarthi-logo-clean.png" alt="Industry Saarthi" className="w-20 h-20 object-contain mx-auto mb-3" />
              <h1 className="text-2xl font-semibold text-slate-800">Industry Saarthi</h1>
              <p className="text-sm text-slate-500 mt-1">{isHindi ? "ईमेल सत्यापन" : "Email Verification"}</p>
            </div>

            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#176B63]/10 flex items-center justify-center">
                  <Mail size={24} className="text-[#0F5B54]" />
                </div>
              </div>

              <div className="text-center mb-5">
                <h2 className="text-lg font-semibold text-slate-800">
                  {isHindi ? "अपना ईमेल सत्यापित करें" : "Verify your email"}
                </h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {isHindi
                    ? "आपके द्वारा दर्ज किए गए ईमेल पते पर 6 अंकों का सत्यापन कोड भेजा गया है।"
                    : "A 6-digit verification code has been sent to the email address you entered."}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-2 break-all">{email}</p>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">
                {isHindi ? "6 अंकों का OTP दर्ज करें" : "Enter 6-digit OTP"}
              </label>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOtp()}
                placeholder="• • • • • •"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-center text-xl tracking-[0.45em] font-semibold focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
              />

              {otpError && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 text-center">{otpError}</div>}
              {resendMessage && <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700 text-center">{resendMessage}</div>}

              <button onClick={verifyOtp} disabled={otp.length !== 6 || busy}
                className="w-full mt-4 bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {busy ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {isHindi ? "सत्यापन हो रहा है..." : "Verifying..."}</> : <>{isHindi ? "ईमेल सत्यापित करें और जारी रखें" : "Verify Email & Continue"} <ArrowRight size={14} /></>}
              </button>

              <div className="flex items-center justify-between mt-4">
                <button onClick={backToLogin} className="text-xs text-slate-500 hover:text-slate-700">← {isHindi ? "लॉगिन पर वापस जाएँ" : "Back to login"}</button>
                <button onClick={resendOtp} className="text-xs font-medium text-[#0F5B54] hover:underline">{isHindi ? "कोड पुनः भेजें" : "Resend code"}</button>
              </div>

              <div className="mt-5 bg-[#176B63]/5 border border-[#176B63]/15 rounded-lg p-3 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-700">{isHindi ? "डेमो OTP:" : "Demo OTP:"}</strong> 314159
                <br />
                {isHindi ? "यह SIH प्रोटोटाइप के लिए simulated email verification flow है। Production में इसे वास्तविक email verification service से जोड़ा जाएगा।" : "This is a simulated email verification flow for the SIH prototype. In production, it would connect to a real email verification service."}
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-5">SIH 2026 · Team Stack_OF · PS SIH26130</p>
          </div>
        </div>
      </div>
    );
  }

  if (authStep === "otp") {
    return (
      <div className="min-h-screen bg-[#EAF8F5] font-sans">
        <div className="flex justify-end p-4">
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-center px-4 pb-10 pt-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-7">
              <img
                src="/industry-saarthi-logo-clean.png"
                alt="Industry Saarthi"
                className="w-20 h-20 object-contain mx-auto mb-3"
              />
              <h1 className="text-2xl font-semibold text-slate-800">Industry Saarthi</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isHindi ? "दो-कारक प्रमाणीकरण" : "Two-Factor Authentication"}
              </p>
            </div>

            <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#176B63]/10 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-[#0F5B54]" />
                </div>
              </div>

              <div className="text-center mb-5">
                <h2 className="text-lg font-semibold text-slate-800">
                  {isHindi ? "अपनी पहचान सत्यापित करें" : "Verify your identity"}
                </h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {isHindi
                    ? "आपके पंजीकृत मोबाइल नंबर पर 6 अंकों का सत्यापन कोड भेजा गया है।"
                    : "A 6-digit verification code has been sent to your registered mobile number."}
                </p>
                <p className="text-xs text-slate-400 mt-1">••••••••••</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">
                  {isHindi ? "6 अंकों का OTP दर्ज करें" : "Enter 6-digit OTP"}
                </label>
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpError("");
                  }}
                  onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOtp()}
                  placeholder="• • • • • •"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-center text-xl tracking-[0.45em] font-semibold focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent"
                />
              </div>

              {otpError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 text-center">
                  {otpError}
                </div>
              )}

              {resendMessage && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700 text-center">
                  {resendMessage}
                </div>
              )}

              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || busy}
                className="w-full mt-4 bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy
                  ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {isHindi ? "सत्यापन हो रहा है..." : "Verifying..."}</>
                  : <>{isHindi ? "सत्यापित करें और जारी रखें" : "Verify & Continue"} <ArrowRight size={14} /></>}
              </button>

              <div className="flex items-center justify-between mt-4">
                <button onClick={backToLogin} className="text-xs text-slate-500 hover:text-slate-700">
                  ← {isHindi ? "लॉगिन पर वापस जाएँ" : "Back to login"}
                </button>
                <button onClick={resendOtp} className="text-xs font-medium text-[#0F5B54] hover:underline">
                  {isHindi ? "OTP पुनः भेजें" : "Resend OTP"}
                </button>
              </div>

              <div className="mt-5 bg-[#176B63]/5 border border-[#176B63]/15 rounded-lg p-3 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-700">{isHindi ? "डेमो OTP:" : "Demo OTP:"}</strong> 482716
                <br />
                {isHindi
                  ? "यह SIH प्रोटोटाइप के लिए simulated 2FA flow है। Production में इसे वास्तविक MFA सेवा से जोड़ा जाएगा।"
                  : "This is a simulated 2FA flow for the SIH prototype. In production, it would connect to a real MFA service."}
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-5">SIH 2026 · Team Stack_OF · PS SIH26130</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF8F5] font-sans">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <div className="flex items-center justify-center px-4 pb-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <img
            src="/industry-saarthi-logo-clean.png"
            alt="Industry Saarthi"
            className="w-20 h-20 object-contain mx-auto mb-3"
          />
          <h1 className="text-2xl font-semibold text-slate-800">Industry Saarthi</h1>
          <p className="text-sm text-slate-500 mt-1">{t("login.tagline")}</p>
        </div>

        <div className="bg-white/90 rounded-2xl border border-[#176B63]/10 shadow-[0_8px_28px_rgba(23,107,99,0.06)] p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("login.email")}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder={t("login.emailPh")}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("login.password")}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder={t("login.passwordPh")}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63] focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t("login.signInAs")}</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  className={`px-2 py-3 rounded-lg text-xs font-medium border transition-all leading-tight ${role === r.id ? "bg-[#176B63]/10 border-[#176B63]/60 text-[#0F5B54]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {r.id === "Business Owner" ? <User size={15} className="mx-auto mb-1" /> : <Landmark size={15} className="mx-auto mb-1" />}
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {(role === "Govt. Officer" || role === "Business Owner") && (
            <div className="bg-[#176B63]/5 border border-[#176B63]/15 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
              <ShieldCheck size={15} className="text-[#0F5B54] mt-0.5 shrink-0" />
              <span>{role === "Govt. Officer" ? (isHindi ? "सरकारी अधिकारियों के लिए अतिरिक्त 2FA सत्यापन आवश्यक है।" : "Additional 2FA verification is required for Government Officers.") : (isHindi ? "जारी रखने के लिए आपके ईमेल पते का सत्यापन आवश्यक है।" : "Email verification is required to continue as a Business Owner.")}</span>
            </div>
          )}

          <button onClick={submit} disabled={!email.trim() || busy}
            className="w-full bg-[#176B63] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#12564F] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {busy
              ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t("login.signingIn")}</>
              : <>{t("login.signIn")} <ArrowRight size={14} /></>}
          </button>

          {registerSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700">
              {registerSuccess}
            </div>
          )}

          {role === "Business Owner" && (
            <div className="text-center text-xs text-slate-500">
              {isHindi ? "नया खाता है?" : "Don't have an account?"}{" "}
              <button
                onClick={openRegistration}
                className="font-semibold text-[#176B63] hover:underline"
              >
                {isHindi ? "रजिस्टर करें" : "Register here"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">{t("login.or")}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button onClick={guestLogin} disabled={busy}
            className="w-full border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {t("login.guest")}
          </button>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>{t("login.noticeTitle")}</strong> {t("login.notice")}
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">SIH 2026 · Team Stack_OF · PS SIH26130</p>
      </div>
      </div>
      <SupportDock />
    </div>
  );
}

// ==========================================================================
//  MAIN APP — STATE, SIDEBAR AND ROUTING
// --------------------------------------------------------------------------
//  Holds all app-level state:
//    projects      -> array of registered projects, each with its approvals
//    activeProject -> index of the project currently being viewed
//    page          -> which screen the sidebar has selected
//  
//  updateApproval() is passed down to the roadmap so a child card can flip
//  an approval's status without owning the data.
// ==========================================================================
/**
 * App — root component. Owns projects, the active project index and routing.
 */
export default function App() {
  // Language is owned here at the root so the toggle affects every screen,
  // including login and the declaration. Session-only, like everything else.
  const [lang, setLang] = useState("en");
  const t = makeT(lang);

  // user === null means nobody is signed in, so we render <LoginPage>.
  // declined === false until the mandatory declaration has been accepted.
  // Both are session-only: never written to storage, so a refresh resets them.
  const [user, setUser] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(0);
  /* Appointments booked from the roadmap, keyed by approval id. Held here so
     both the roadmap and the dashboard calendar work from one source. */
  const [bookings, setBookings] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [govtApprovals, setGovtApprovals] = useState(GOVT_PENDING_APPROVALS);
  const [govtReview, setGovtReview] = useState(null);

  const logout = () => {
    setUser(null);
    setAccepted(false);
    setPage("dashboard");
    setProjects([]);
    setActiveProject(0);
    setBookings({});
    setGovtApprovals(GOVT_PENDING_APPROVALS);
    setGovtReview(null);
  };

  // Everything below the provider can call useT(), including the two gates.
  const langValue = { lang, setLang, t };

  // Gate 1 — sign in.
  if (!user) {
    return (
      <LangCtx.Provider value={langValue}>
        <LoginPage onLogin={setUser} />
      </LangCtx.Provider>
    );
  }

  // Gate 2 — the declaration must be accepted before the app is reachable.
  if (!accepted) {
    return (
      <LangCtx.Provider value={langValue}>
        <DeclarationPage user={user} onAccept={() => setAccepted(true)} onBack={logout} />
      </LangCtx.Provider>
    );
  }

  const addProject = (project) => {
    setProjects(prev => [...prev, project]);
    setActiveProject(projects.length);
  };

  const updateApproval = (approvalId, newStatus) => {
    setProjects(prev => prev.map((p, i) => i === activeProject ? {
      ...p,
      approvals: p.approvals.map(a => a.id === approvalId ? { ...a, status: newStatus } : a)
    } : p));
  };

  const nav = user.role === "Govt. Officer"
    ? [
        { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { id: "approvals", label: t("gov.pendingTitle"), icon: FileCheck },
        { id: "appointments", label: t("gov.appointmentsTitle"), icon: CalendarDays },
        { id: "reports", label: t("gov.reportsTitle"), icon: BarChart3 },
      ]
    : [
        { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { id: "new", label: t("nav.new"), icon: Plus },
        { id: "roadmap", label: t("nav.roadmap"), icon: Route },
        { id: "documents", label: t("nav.documents"), icon: FileCheck },
        { id: "schemes", label: t("nav.schemes"), icon: Gift },
        { id: "translate", label: t("nav.translate"), icon: ScanLine },
      ];

  return (
    <LangCtx.Provider value={langValue}>
    <div className="flex h-screen bg-[#EAF8F5] font-sans text-slate-800">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-0 overflow-hidden"} bg-[#DDF3EE] border-r border-[#176B63]/15 flex flex-col shrink-0 transition-all`}>
        <div className="p-5 border-b border-[#176B63]/10">
          <div className="flex items-center gap-3">
            <img
              src="/industry-saarthi-logo-clean.png"
              alt="Industry Saarthi"
              className="w-12 h-12 object-contain shrink-0"
            />
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Industry
              </h1>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Saarthi
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${page === n.id ? "bg-[#176B63] text-white font-medium shadow-sm" : "text-slate-700 hover:bg-white/45"}`}>
              <n.icon size={16} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#176B63]/10">
          <div className="bg-white/55 rounded-xl p-3 text-xs text-slate-600 border border-white/60">
            <p className="font-medium text-slate-700 mb-0.5">SIH 2026 · Stack_OF</p>
            <p>PS ID: SIH26130</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-[#F7FCFB]/95 backdrop-blur border-b border-[#176B63]/10 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_12px_rgba(23,107,99,0.04)]">
          {/* Sidebar toggle — utility icon profile */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-600 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
            <LayoutDashboard size={18} />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 w-full">
            <div className="hidden md:flex items-center gap-2 w-full max-w-[430px] rounded-xl border border-[#176B63]/10 bg-white/75 px-3.5 py-2.5 shadow-sm">
              <Search size={17} className="text-slate-400 shrink-0" />
              <input aria-label={t("hdr.search")} placeholder={t("hdr.search")} className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400" />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button title={t("hdr.notifications")} aria-label={t("hdr.notifications")} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-[#176B63] hover:bg-white transition-colors relative">
                <BellIcon size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </button>
              <button title={t("hdr.settings")} aria-label={t("hdr.settings")} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-[#176B63] hover:bg-white transition-colors">
                <Settings size={18} />
              </button>

              {user.role !== "Govt. Officer" && projects.length > 0 && (
                <select value={activeProject} onChange={e => setActiveProject(Number(e.target.value))} className="hidden xl:block text-sm border border-[#176B63]/10 rounded-xl px-3 py-2.5 bg-white/80">
                  {projects.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                </select>
              )}
              <LanguageToggle compact />
              <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-[#176B63]/10">
                <div className="w-10 h-10 bg-[#176B63]/10 rounded-full flex items-center justify-center text-[#176B63] text-xs font-bold shrink-0">
                  {user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="hidden lg:block leading-tight">
                  <p className="text-sm font-semibold text-slate-700">{user.name}</p>
                  <p className="text-[11px] text-slate-400">{user.role}</p>
                </div>
                <button onClick={logout} title={t("nav.signOut")} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <XCircle size={17} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6 lg:p-7 max-w-[1400px] mx-auto">
          {user.role === "Govt. Officer" ? (
            <>
              {page === "dashboard" && <GovtOfficerDashboard user={user} setPage={setPage} approvals={govtApprovals} onReview={setGovtReview} />}
              {page === "approvals" && <GovtApprovalsPage setPage={setPage} approvals={govtApprovals} onReview={setGovtReview} />}
              {page === "appointments" && <GovtAppointmentsPage setPage={setPage} />}
              {page === "reports" && <GovtReportsPage setPage={setPage} />}
              {page === "translate" && <TranslatePage />}
            </>
          ) : (
            <>
              {page === "dashboard" && <DashboardPage projects={projects} setPage={setPage} setActiveProject={setActiveProject} bookings={bookings} />}
              {page === "new" && <NewProjectPage onSubmit={addProject} setPage={setPage} />}
              {page === "roadmap" && <RoadmapPage project={projects[activeProject]} updateApproval={updateApproval} setPage={setPage} bookings={bookings} onBook={(id, b) => setBookings(prev => ({ ...prev, [id]: b }))} />}
              {page === "documents" && <DocumentsPage project={projects[activeProject]} />}
              {page === "schemes" && <SchemesPage project={projects[activeProject]} />}
              {page === "translate" && <TranslatePage />}
            </>
          )}
        </div>
      </main>

      {/* Business owners get Gattu/support; government officers use a focused work interface. */}
      {user.role !== "Govt. Officer" && <SupportDock />}
      {user.role === "Govt. Officer" && govtReview && (
        <GovtApprovalReviewModal
          approval={govtReview}
          onClose={() => setGovtReview(null)}
          onDecision={(id, decision) => {
            setGovtApprovals(prev => prev.filter(a => a.id !== id));
            setGovtReview(null);
          }}
        />
      )}
    </div>
    </LangCtx.Provider>
  );
}
