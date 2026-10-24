import { useState, useEffect, useCallback } from "react";
import {
  FileText, Shield, Clock, Bell, CheckCircle, AlertTriangle,
  ChevronRight, Plus, Upload, Search, BarChart3, Users, Building2,
  MapPin, IndianRupee, Globe, Eye, Trash2, ArrowRight, X,
  LayoutDashboard, FolderOpen, Route, FileCheck, Gift, Languages,
  ChevronDown, AlertCircle, Timer, Zap, TrendingUp, Calendar,
  ImageIcon, ScanLine, Type, ShieldCheck, XCircle, RotateCcw,
  CalendarDays, Navigation, Phone, Mail, User, ExternalLink,
  Landmark, Laptop, UserCheck, Fingerprint, GitCompare, Clock3
} from "lucide-react";

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
  { id: "s1", name: "MSME Technology Upgrade Scheme", ministry: "Ministry of MSME", benefit: "Up to ₹15 Lakhs subsidy on technology upgrades", sectors: ["Manufacturing", "Food Processing", "Textiles"], eligibility: "MSME registered, turnover < ₹50 Cr" },
  { id: "s2", name: "Startup India Seed Fund", ministry: "DPIIT", benefit: "Up to ₹50 Lakhs for proof of concept", sectors: ["IT/Software", "E-Commerce", "Pharmaceuticals"], eligibility: "DPIIT recognized startup, < 2 years old" },
  { id: "s3", name: "PLI Scheme", ministry: "Ministry of Commerce", benefit: "4-6% incentive on incremental sales", sectors: ["Manufacturing", "Pharmaceuticals", "Renewable Energy"], eligibility: "Minimum investment threshold met" },
  { id: "s4", name: "PM Vishwakarma Yojana", ministry: "Ministry of MSME", benefit: "Collateral-free loan up to ₹3 Lakhs", sectors: ["Manufacturing", "Textiles", "Food Processing", "Construction"], eligibility: "Traditional artisans and craftspeople" },
  { id: "s5", name: "Stand-Up India", ministry: "Ministry of Finance", benefit: "Loan ₹10 Lakhs to ₹1 Crore", sectors: ["Manufacturing", "IT/Software", "Food Processing", "E-Commerce", "Textiles", "Renewable Energy", "Construction", "Pharmaceuticals"], eligibility: "SC/ST/Women entrepreneurs" },
  { id: "s6", name: "Software Technology Parks Scheme", ministry: "MeitY", benefit: "100% FDI, duty-free imports, tax benefits", sectors: ["IT/Software"], eligibility: "Software export units" },
  { id: "s7", name: "Green Energy Subsidy", ministry: "MNRE", benefit: "Up to 40% subsidy on solar installations", sectors: ["Renewable Energy", "Manufacturing"], eligibility: "Units installing renewable energy systems" },
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
  const map = {
    approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Approved" },
    pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "In Progress" },
    rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejected" },
    not_started: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: "Not Started" },
    issue: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Issue Found" },
    valid: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Valid" },
  };
  const s = map[status] || map.not_started;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>;
}

/**
 * StatCard — a single metric tile used on the dashboard.
 */
function StatCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
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
 * Shows headline counts, an approval progress bar, and an alerts column that
 * surfaces the next deadline, how many approvals can run in parallel, how many
 * need a physical office visit, and how many schemes matched.
 * Falls back to an empty state prompting project registration.
 */
function DashboardPage({ projects, setPage, setActiveProject }) {
  const activeProject = projects[0];
  const approvals = activeProject?.approvals || [];
  const approved = approvals.filter(a => a.status === "approved").length;
  const pending = approvals.filter(a => a.status === "pending").length;
  const upcoming = approvals.filter(a => a.status === "not_started").length;
  const nextDeadline = approvals.find(a => a.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your approval journey</p>
        </div>
        <button onClick={() => setPage("new")} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Approvals" value={approvals.length} sub={activeProject?.name} color="blue" />
        <StatCard icon={CheckCircle} label="Approved" value={approved} sub={`${approvals.length ? Math.round(approved/approvals.length*100) : 0}% complete`} color="green" />
        <StatCard icon={Clock} label="In Progress" value={pending} sub="Awaiting response" color="amber" />
        <StatCard icon={Timer} label="Next Deadline" value={nextDeadline ? `${nextDeadline.timeline}d` : "—"} sub={nextDeadline?.name || "No pending"} color="red" />
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No projects yet</h3>
          <p className="text-slate-500 text-sm mb-6">Register your first project to get a personalized approval roadmap</p>
          <button onClick={() => setPage("new")} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            Register Project
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Approval Progress</h2>
              <button onClick={() => { setActiveProject(0); setPage("roadmap"); }} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                View Roadmap <ChevronRight size={14} />
              </button>
            </div>
            <div className="p-5">
              <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${approvals.length ? (approved/approvals.length*100) : 0}%` }} />
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Bell size={16} /> Alerts</h3>
              <div className="space-y-3">
                {pending > 0 && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">{nextDeadline?.name}</p>
                      <p className="text-xs text-amber-600">Due in {nextDeadline?.timeline} days</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Zap size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800">Parallel approvals available</p>
                    <p className="text-xs text-blue-600">{approvals.filter(a=>a.parallel).length} can run simultaneously</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Landmark size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">Office visits required</p>
                    <p className="text-xs text-amber-600">{approvals.filter(a => APPROVAL_CHANNELS[a.name] && APPROVAL_CHANNELS[a.name].mode !== "online").length} approvals need an in-person visit — start them in the roadmap to book a slot</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <Gift size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-800">Schemes matched</p>
                    <p className="text-xs text-emerald-600">{SCHEMES_DB.filter(s => s.sectors.includes(activeProject?.sector)).length} government schemes found</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Project Info</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-slate-700 font-medium">{activeProject?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sector</span><span className="text-slate-700 font-medium">{activeProject?.sector}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">State</span><span className="text-slate-700 font-medium">{activeProject?.state}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Est. Time</span><span className="text-slate-700 font-medium">{Math.max(...approvals.map(a=>a.timeline))} days</span></div>
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
        ← Back to Dashboard
      </button>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-800">Register New Project</h1>
          <p className="text-slate-500 text-sm mt-1">Tell us about your business and we'll identify required approvals</p>
        </div>

        <div className="flex border-b border-slate-100">
          {["Business Details", "Review & Submit"].map((s, i) => (
            <button key={i} onClick={() => setStep(i + 1)} className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${step === i + 1 ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project / Business Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. GreenTech Pvt Ltd" className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry Sector</label>
                <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select sector</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {["Sole Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Enterprise Size</label>
                <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {["Micro (< ₹1 Cr)", "Small (₹1-10 Cr)", "Medium (₹10-50 Cr)", "Large (> ₹50 Cr)"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => { if (form.name && form.sector && form.state) setStep(2); }} disabled={!form.name || !form.sector || !form.state} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
                Continue
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Project</span><span className="font-medium text-slate-700">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sector</span><span className="font-medium text-slate-700">{form.sector}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">State</span><span className="font-medium text-slate-700">{form.state}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium text-slate-700">{form.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="font-medium text-slate-700">{form.size}</span></div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">AI Analysis Complete</p>
                </div>
                <p className="text-sm text-blue-700">
                  Based on your {form.sector} project in {form.state}, we identified <strong>{getApprovals(form.sector).length} approvals</strong> required.
                  {" "}<strong>{getApprovals(form.sector).filter(a => a.parallel).length}</strong> can run in parallel, saving you up to <strong>{Math.round(getApprovals(form.sector).reduce((s,a) => s + (a.parallel ? a.timeline : 0), 0) * 0.6)} days</strong>.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Identified Approvals:</h3>
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
                      {a.parallel && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">Parallel</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Back</button>
                <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  Create Project & View Roadmap <ArrowRight size={14} />
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
function RoadmapPage({ project, updateApproval }) {
  const [expanded, setExpanded] = useState(null);
  const [bookings, setBookings] = useState({});

  if (!project) return <div className="text-center py-20 text-slate-500">No project selected</div>;
  const { approvals } = project;

  const handleStart = (id) => {
    updateApproval(id, "pending");
    setExpanded(id);
  };

  const handleBook = (id, booking) => setBookings(prev => ({ ...prev, [id]: booking }));

  const phases = [
    { label: "Phase 1 — Parallel Applications", items: approvals.filter(a => a.parallel && !a.dependency) },
    { label: "Phase 2 — Sequential / Dependent", items: approvals.filter(a => !a.parallel || a.dependency) },
  ];

  const offlineCount = approvals.filter(a => APPROVAL_CHANNELS[a.name] && APPROVAL_CHANNELS[a.name].mode !== "online").length;
  const onlineCount = approvals.filter(a => APPROVAL_CHANNELS[a.name]?.mode === "online").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Approval Roadmap</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name} · {project.sector} · {project.state}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Approved</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> In Progress</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /> Not Started</div>
          <div className="flex items-center gap-2"><Zap size={12} className="text-blue-500" /> Parallel</div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
          <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${(approvals.filter(a=>a.status==="approved").length / approvals.length * 100)}%` }} />
        </div>
        <p className="text-xs text-slate-400 text-right">{approvals.filter(a=>a.status==="approved").length}/{approvals.length} complete</p>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-600"><Laptop size={14} /> {onlineCount} can be finished online</span>
          <span className="flex items-center gap-1.5 text-amber-600"><Landmark size={14} /> {offlineCount} need an office visit</span>
          <span className="flex items-center gap-1.5 text-slate-500"><CalendarDays size={14} /> {Object.keys(bookings).length} appointment{Object.keys(bookings).length === 1 ? "" : "s"} booked</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press <strong>Start Application</strong> on any approval below to see whether it is online or needs a visit, along with the office address, the authority to meet, and slot booking.</p>
      </div>

      {phases.map((phase, pi) => (
        <div key={pi}>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            {pi === 0 ? <Zap size={18} className="text-blue-500" /> : <Route size={18} className="text-slate-400" />}
            {phase.label}
          </h2>
          {pi === 0 && <p className="text-sm text-slate-500 mb-4">These approvals have no dependencies and can be applied for simultaneously, saving significant time.</p>}
          <div className="space-y-3">
            {phase.items.map((a) => {
              const ch = APPROVAL_CHANNELS[a.name];
              const isOpen = expanded === a.id;
              const started = a.status === "pending" || a.status === "approved";
              return (
                <div key={a.id} className={`bg-white rounded-xl border p-5 transition-all ${isOpen ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-semibold text-slate-800">{a.name}</h3>
                        {a.parallel && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Parallel</span>}
                      </div>
                      <p className="text-sm text-slate-500">{a.dept}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mb-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> ~{a.timeline} days</span>
                    <span className="flex items-center gap-1.5"><FileText size={14} /> {a.docs.length} documents</span>
                    {ch?.mode === "online" && <span className="flex items-center gap-1.5 text-emerald-600"><Laptop size={14} /> Fully online</span>}
                    {ch?.mode === "offline" && <span className="flex items-center gap-1.5 text-amber-600"><Landmark size={14} /> Office visit needed</span>}
                    {ch?.mode === "hybrid" && <span className="flex items-center gap-1.5 text-violet-600"><Landmark size={14} /> Online + visit</span>}
                    {bookings[a.id] && <span className="flex items-center gap-1.5 text-blue-600"><CalendarDays size={14} /> Slot booked</span>}
                    {a.dependency && <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500" /> Depends on {approvals.find(x=>x.id===a.dependency)?.name}</span>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {a.docs.map((d, j) => (
                      <span key={j} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md">{d}</span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.status === "not_started" && (
                      <button onClick={() => handleStart(a.id)} className="text-xs bg-blue-600 text-white px-3.5 py-2 rounded-md hover:bg-blue-700 font-medium flex items-center gap-1.5">
                        <ArrowRight size={13} /> Start Application
                      </button>
                    )}
                    {started && (
                      <button onClick={() => setExpanded(isOpen ? null : a.id)} className="text-xs border border-slate-200 text-slate-600 px-3.5 py-2 rounded-md hover:bg-slate-50 font-medium flex items-center gap-1.5">
                        {ch?.mode === "online" ? <Laptop size={13} /> : <Landmark size={13} />}
                        {isOpen ? "Hide details" : ch?.mode === "online" ? "Show portal link" : "Show office visit details"}
                        <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                    {a.status === "pending" && (
                      <button onClick={() => updateApproval(a.id, "approved")} className="text-xs bg-emerald-600 text-white px-3.5 py-2 rounded-md hover:bg-emerald-700 font-medium">
                        Mark Approved
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
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Upload & Validate Document</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white">
              {Object.keys(DOC_VALIDATION_RULES).map(d => <option key={d}>{d}</option>)}
              <option>Factory License</option>
              <option>NOC Certificate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Number (for validation)</label>
            <input type="text" value={docInput} onChange={e => setDocInput(e.target.value)} placeholder={DOC_VALIDATION_RULES[docType]?.format || "Enter document number"} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={simulateUpload} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              <Upload size={14} /> Upload & Validate
            </button>
          </div>
        </div>

        {DOC_VALIDATION_RULES[docType] && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-slate-600 font-medium mb-1">OCR will check for these fields:</p>
            <div className="flex flex-wrap gap-1.5">
              {DOC_VALIDATION_RULES[docType].fields.map((f, i) => (
                <span key={i} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Validation Results</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {uploads.map(doc => (
              <div key={doc.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${doc.status === "valid" ? "bg-emerald-50" : doc.status === "issue" ? "bg-orange-50" : "bg-blue-50"}`}>
                      <FileText size={18} className={doc.status === "valid" ? "text-emerald-600" : doc.status === "issue" ? "text-orange-600" : "text-blue-600"} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.type}</p>
                      <p className="text-xs text-slate-400">{doc.size} · Uploaded at {doc.uploadedAt}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status === "uploading" ? "pending" : doc.status === "validating" ? "pending" : doc.status} />
                </div>

                {doc.status === "uploading" && <p className="text-sm text-blue-600 flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Uploading document...</p>}
                {doc.status === "validating" && <p className="text-sm text-amber-600 flex items-center gap-2"><span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> Running OCR & AI validation...</p>}

                {doc.status === "valid" && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mt-2">
                    <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle size={14} /> All checks passed. Document is ready for submission.</p>
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
  const sector = project?.sector || "Manufacturing";
  const matched = SCHEMES_DB.filter(s => s.sectors.includes(sector));
  const other = SCHEMES_DB.filter(s => !s.sectors.includes(sector));
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Government Schemes</h1>
        <p className="text-slate-500 text-sm mt-1">Matched to your {sector} project{project?.state ? ` in ${project.state}` : ""}</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <Gift size={20} className="text-emerald-600" />
        <p className="text-sm text-emerald-800"><strong>{matched.length} schemes</strong> match your project profile. Review eligibility and apply directly.</p>
      </div>

      <div className="space-y-3">
        {matched.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full p-5 text-left flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800">{s.name}</h3>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Matched</span>
                </div>
                <p className="text-sm text-slate-500">{s.ministry}</p>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded === s.id ? "rotate-180" : ""}`} />
            </button>
            {expanded === s.id && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-0 pt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">BENEFIT</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2"><IndianRupee size={14} className="text-emerald-600" /> {s.benefit}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">ELIGIBILITY</p>
                  <p className="text-sm text-slate-700">{s.eligibility}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">APPLICABLE SECTORS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.sectors.map(sec => <span key={sec} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{sec}</span>)}
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Check Eligibility & Apply</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {other.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-700 mt-6">Other Available Schemes</h2>
          <div className="space-y-2">
            {other.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.ministry} · {s.benefit}</p>
                </div>
                <span className="text-xs text-slate-400">Not matching</span>
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

  const Spinner = () => <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;

  const Step = ({ icon: Icon, label, active, done, children }) => (
    <div className={`p-3.5 rounded-lg border transition-all ${done ? "bg-emerald-50 border-emerald-200" : active ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100" : "bg-slate-50 border-slate-200 opacity-40"}`}>
      <div className="flex items-center gap-2">
        {done ? <CheckCircle size={15} className="text-emerald-600" /> : active ? <Spinner /> : <Icon size={15} className="text-slate-400" />}
        <p className={`text-sm font-medium ${done ? "text-emerald-700" : active ? "text-blue-700" : "text-slate-400"}`}>{label}</p>
      </div>
      {(active || done) && children && <div className="mt-1.5 ml-6 text-xs text-slate-500">{children}</div>}
    </div>
  );

  // --- MODE SELECTION ---
  if (!mode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Scan & Translate</h1>
          <p className="text-slate-500 text-sm mt-1">Upload a document image — we'll translate it and check if everything is correct</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button onClick={() => setMode("filled")} className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-blue-300 hover:bg-blue-50 transition-all group">
            <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <FileCheck size={22} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Filled Document / Form</h3>
            <p className="text-sm text-slate-500">Upload a filled form in any local language. We'll translate every field to English, show you what's filled, and flag what's wrong or missing.</p>
            <p className="text-xs text-blue-600 font-medium mt-3 flex items-center gap-1">Select this mode <ChevronRight size={12} /></p>
          </button>
          <button onClick={() => setMode("blank")} className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-violet-300 hover:bg-violet-50 transition-all group">
            <div className="w-11 h-11 bg-violet-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
              <Languages size={22} className="text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Blank / Unfilled Form</h3>
            <p className="text-sm text-slate-500">Upload an unfilled English form. We'll translate all labels, instructions, and sections into your chosen language so you know exactly what to fill.</p>
            <p className="text-xs text-violet-600 font-medium mt-3 flex items-center gap-1">Select this mode <ChevronRight size={12} /></p>
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
            <h1 className="text-2xl font-semibold text-slate-800">Check Filled Document</h1>
            <p className="text-slate-500 text-sm">Upload a filled form in a local language → translated → each field validated</p>
          </div>
        </div>

        {/* Scenario picker */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Demo scenarios</h3>
          <div className="space-y-2">
            {filledScenarios.map(s => (
              <button key={s.id} onClick={() => { setFilledScenario(s.id); resetAll(); }} className={`w-full text-left p-3 rounded-lg border transition-all ${filledScenario === s.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <p className={`text-sm font-medium ${filledScenario === s.id ? "text-blue-700" : "text-slate-700"}`}>{s.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {!imagePreview ? (
            <div>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => document.getElementById("fInput").click()}>
                <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Drop filled document image here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG</p>
                <input id="fInput" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div className="mt-3 text-center"><button onClick={useDemoFilled} className="text-sm text-blue-600 font-medium hover:underline">Use demo document →</button></div>
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
                  {filledPipeline.stage === "idle" && <button onClick={runFilledPipeline} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><ScanLine size={14} /> Scan, Translate & Validate</button>}
                  <button onClick={resetAll} className="border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"><RotateCcw size={14} /> Reset</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        {filledPipeline.stage !== "idle" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Processing</h3>
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
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Field-by-Field Review</h3>
                <p className="text-xs text-slate-400 mt-0.5">Each field from your document — original, translated, and what to fix</p>
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
                        <p className="text-[10px] text-slate-400 mb-0.5">ORIGINAL</p>
                        <p className="text-sm text-slate-700">{f.value}</p>
                      </div>
                      <div className="bg-blue-50 rounded px-3 py-2">
                        <p className="text-[10px] text-blue-500 mb-0.5">TRANSLATED</p>
                        <p className="text-sm text-slate-700">{f.translated}</p>
                      </div>
                    </div>
                    {f.suggestion && (
                      <div className={`mt-2 px-3 py-2 rounded text-xs flex items-start gap-2 ${f.status === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                        {f.status === "error" ? <XCircle size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                        <span><strong>Fix needed:</strong> {f.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Full text side by side */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Full Document — Original & Translation</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">ORIGINAL ({filledResult.sourceLang})</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{filledResult.ocrText}</pre>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-600 mb-2">ENGLISH TRANSLATION</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{filledResult.translatedText}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
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
            <h1 className="text-2xl font-semibold text-slate-800">Translate Blank Form</h1>
            <p className="text-slate-500 text-sm">Upload an unfilled English form → choose a language → get a fully translated version</p>
          </div>
        </div>

        {/* Language picker */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Translate form into</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TARGET_LANGS).filter(([k]) => k !== "en").map(([k, v]) => (
              <button key={k} onClick={() => setTargetLang(k)} className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${targetLang === k ? "bg-violet-50 border-violet-300 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {!imagePreview ? (
            <div>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}
                onClick={() => document.getElementById("bInput").click()}>
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Drop blank form image here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG</p>
                <input id="bInput" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div className="mt-3 text-center"><button onClick={useDemoBlank} className="text-sm text-violet-600 font-medium hover:underline">Use demo blank form →</button></div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-40 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                <img src={imagePreview} alt="form" className="w-full h-auto" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Will translate to: <strong>{TARGET_LANGS[targetLang]}</strong></p>
                <div className="flex gap-2 mt-3">
                  {blankPipeline.stage === "idle" && <button onClick={runBlankPipeline} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 flex items-center gap-2"><Languages size={14} /> Scan & Translate Form</button>}
                  <button onClick={resetAll} className="border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2"><RotateCcw size={14} /> Reset</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        {blankPipeline.stage !== "idle" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Processing</h3>
            <Step icon={ScanLine} label="OCR — Extracting form text" active={blankPipeline.stage==="ocr"} done={["translate","done"].includes(blankPipeline.stage)} />
            <Step icon={Languages} label={`Translating form to ${TARGET_LANGS[targetLang]}`} active={blankPipeline.stage==="translate"} done={blankPipeline.stage==="done"}>
              {blankResult && <span>{blankResult.fieldCount} fields across {blankResult.sections} sections translated</span>}
            </Step>
          </div>
        )}

        {/* Blank form results */}
        {blankResult && blankPipeline.stage === "done" && (
          <div className="space-y-5">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 flex items-center gap-3">
              <CheckCircle size={22} className="text-violet-600" />
              <div>
                <p className="font-semibold text-violet-800">Form translated to {TARGET_LANGS[targetLang]}</p>
                <p className="text-sm text-violet-600">{blankResult.fieldCount} fields · {blankResult.sections} sections · Ready to print or fill</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Side-by-Side: English → {TARGET_LANGS[targetLang]}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">ORIGINAL (English)</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{blankResult.sourceText}</pre>
                </div>
                <div className="bg-violet-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-violet-600 mb-2">TRANSLATED ({TARGET_LANGS[targetLang]})</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{blankResult.translations[targetLang] || "Translation not available for this language in demo. In production, Bhashini API handles all 22 scheduled languages."}</pre>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>How to use:</strong> Print or save the translated version. Each field label in {TARGET_LANGS[targetLang]} maps to the English original on the left. Fill the official English form using the translated version as your guide.
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
  const ch = APPROVAL_CHANNELS[approval.name];
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [confirming, setConfirming] = useState(false);

  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0];

  // No channel data mapped for this approval
  if (!ch) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          Application started. Channel details for this approval are being fetched from the department portal.
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
              <p className="text-sm font-semibold text-emerald-800 mb-0.5">No office visit needed</p>
              <p className="text-sm text-emerald-700">{ch.reason}</p>
              {ch.note && (
                <div className="mt-2.5 bg-white/70 border border-emerald-100 rounded px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /> {ch.note}
                </div>
              )}
              <a href={ch.onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 mt-3">
                Continue on official portal <ExternalLink size={13} />
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
      onBook(approval.id, { date, slot, token, office: o.name, head: o.head });
      setConfirming(false);
    }, 1500);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${ch.mode === "hybrid" ? "bg-violet-50 border-violet-200" : "bg-amber-50 border-amber-200"}`}>
        <Landmark size={17} className={`mt-0.5 shrink-0 ${ch.mode === "hybrid" ? "text-violet-600" : "text-amber-600"}`} />
        <div>
          <p className={`text-sm font-semibold ${ch.mode === "hybrid" ? "text-violet-800" : "text-amber-800"}`}>
            {ch.mode === "hybrid" ? "File online, then visit the office" : "This one requires an office visit"}
          </p>
          <p className={`text-sm ${ch.mode === "hybrid" ? "text-violet-700" : "text-amber-700"}`}>{ch.reason}</p>
        </div>
      </div>

      {ch.onlineUrl && (
        <a href={ch.onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
          Step 1: File online first <ExternalLink size={13} />
        </a>
      )}

      {/* Where to go */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Landmark size={13} /> WHERE TO GO</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-800">{o.name}</p>
              <p className="text-xs text-slate-500">{o.dept}</p>
            </div>
            <p className="text-sm text-slate-700 flex items-start gap-1.5"><MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> {o.address}</p>
            <p className="text-sm text-slate-700 flex items-center gap-1.5"><Clock3 size={13} className="text-slate-400" /> {o.hours}</p>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(o.mapQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
              <Navigation size={13} /> Open in Google Maps
            </a>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3.5">
            <p className="text-[10px] font-semibold text-slate-400 mb-2">REGIONAL HEAD / AUTHORITY</p>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><User size={15} className="text-blue-600" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{o.head}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{o.designation}</p>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              <a href={`tel:${o.phone}`} className="text-xs text-slate-700 flex items-center gap-2 hover:text-blue-600"><Phone size={12} className="text-slate-400" /> {o.phone}</a>
              <a href={`mailto:${o.email}`} className="text-xs text-slate-700 flex items-center gap-2 hover:text-blue-600 break-all"><Mail size={12} className="text-slate-400 shrink-0" /> {o.email}</a>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Route size={13} /> WHAT TO DO, STEP BY STEP</p>
        <div className="space-y-3">
          {ch.steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
              <div>
                <p className="text-sm font-medium text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carry */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5"><FolderOpen size={13} /> DOCUMENTS TO CARRY</p>
        <p className="text-[11px] text-slate-400 mb-3">Bring originals plus one photocopy set of each</p>
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
                <p className="text-sm font-semibold text-emerald-800">Appointment confirmed</p>
                <p className="text-xs text-emerald-700 mt-0.5">{booking.office}</p>
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1.5"><User size={11} /> Meeting: {booking.head}</p>
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
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><CalendarDays size={13} /> BOOK YOUR APPOINTMENT</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Pick a date</label>
              <input type="date" value={date} min={minDate} max={maxDate} onChange={e => { setDate(e.target.value); setSlot(""); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full sm:w-56" />
              <p className="text-[11px] text-slate-400 mt-1">Bookable from tomorrow up to 45 days ahead.</p>
            </div>
            {date && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Pick a time slot</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => {
                    const isFull = (t.charCodeAt(0) + date.charCodeAt(9)) % 5 === 0;
                    return (
                      <button key={t} disabled={isFull} onClick={() => setSlot(t)}
                        className={`px-2.5 py-2 rounded-lg text-xs border transition-all ${isFull ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through" : slot === t ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Struck-out slots are already full.</p>
              </div>
            )}
            {date && slot && (
              <button onClick={confirmBooking} disabled={confirming} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2">
                {confirming ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking...</> : <><CalendarDays size={14} /> Confirm appointment</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
//  IDENTITY & DOCUMENT VERIFICATION
// --------------------------------------------------------------------------
//  Three independent layers of checking:
//  
//    1. ID FORMAT   -> is the PAN / Aadhaar / GSTIN / Udyam number even
//                      shaped correctly? When it fails we say precisely why
//                      ('you entered 8 characters, PAN needs 10'). When it
//                      passes we decode it (the 4th char of a PAN reveals
//                      whether it belongs to an individual, company or trust).
//  
//    2. NAME MATCH  -> compares the name on each document against the
//                      applicant name, tolerant of initials and honorifics.
//                      Returns a similarity score, not a yes/no.
//  
//    3. CROSS-DOC   -> the check departments actually run. Characters 3-12 of
//                      a GSTIN ARE the holder's PAN, so if they disagree the
//                      documents belong to different entities. Also flags
//                      inconsistent name spellings and duplicated ID numbers.
// ==========================================================================

const ID_RULES = {
  PAN: {
    label: "PAN Number",
    placeholder: "ABCPD1234E",
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    length: 10,
    hint: "5 letters, 4 digits, 1 letter",
    explain: (v) => {
      if (v.length !== 10) return `PAN must be exactly 10 characters — you entered ${v.length}`;
      if (!/^[A-Z]{5}/.test(v)) return "First 5 characters must all be letters";
      if (!/^[A-Z]{5}[0-9]{4}/.test(v)) return "Characters 6-9 must be digits";
      if (!/[A-Z]$/.test(v)) return "The last character must be a letter";
      return null;
    },
    extra: (v) => {
      const t = v[3];
      const map = { P: "Individual", C: "Company", H: "Hindu Undivided Family", F: "Firm / LLP", A: "Association of Persons", T: "Trust", B: "Body of Individuals", G: "Government", J: "Artificial Juridical Person", L: "Local Authority" };
      return map[t] ? `4th character '${t}' means this PAN belongs to: ${map[t]}` : null;
    },
  },
  Aadhaar: {
    label: "Aadhaar Number",
    placeholder: "4532 8876 1234",
    regex: /^\d{12}$/,
    length: 12,
    hint: "12 digits",
    normalize: (v) => v.replace(/\s/g, ""),
    explain: (v) => {
      const d = v.replace(/\s/g, "");
      if (!/^\d*$/.test(d)) return "Aadhaar can only contain digits";
      if (d.length !== 12) return `Aadhaar must be 12 digits — you entered ${d.length}`;
      if (d[0] === "0" || d[0] === "1") return "Aadhaar numbers never start with 0 or 1";
      return null;
    },
  },
  GSTIN: {
    label: "GST Number",
    placeholder: "27ABCPD1234E1Z5",
    regex: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/,
    length: 15,
    hint: "2 digits (state) + 10 char PAN + 3 characters",
    explain: (v) => {
      if (v.length !== 15) return `GSTIN must be exactly 15 characters — you entered ${v.length}`;
      if (!/^\d{2}/.test(v)) return "First 2 characters must be the state code digits";
      if (v[13] !== "Z") return "The 14th character must be the letter Z";
      return null;
    },
    extra: (v) => {
      const states = { "27": "Maharashtra", "29": "Karnataka", "33": "Tamil Nadu", "24": "Gujarat", "07": "Delhi", "09": "Uttar Pradesh", "08": "Rajasthan", "36": "Telangana", "19": "West Bengal", "32": "Kerala" };
      const s = states[v.substring(0, 2)];
      return s ? `State code ${v.substring(0,2)} = ${s}` : `State code ${v.substring(0,2)} is not a recognised Indian state code`;
    },
  },
  Udyam: {
    label: "Udyam Registration Number",
    placeholder: "UDYAM-MH-18-0012345",
    regex: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/,
    length: 19,
    hint: "UDYAM-XX-00-0000000",
    explain: (v) => {
      if (!v.startsWith("UDYAM-")) return "Must begin with UDYAM-";
      if (!/^UDYAM-[A-Z]{2}-/.test(v)) return "State code must be 2 capital letters after UDYAM-";
      if (!/^UDYAM-[A-Z]{2}-\d{2}-/.test(v)) return "District code must be 2 digits";
      if (!/\d{7}$/.test(v)) return "Must end with a 7-digit serial number";
      return null;
    },
  },
};

/**
 * normaliseName — strips punctuation, collapses whitespace, uppercases, and
 * removes honorifics (Shri / Smt / Mr / Mrs / Ms / Dr) so that
 * 'Shri. Sunil  Patil' and 'SUNIL PATIL' compare as equal.
 */
function normaliseName(n) {
  return n.trim().toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ")
    .replace(/^(SHRI|SMT|MR|MRS|MS|DR)\s+/i, "");
}

/**
 * nameSimilarity — token-overlap score from 0 to 100.
 *
 * Exact match after normalisation returns 100. Otherwise it takes the ratio of
 * shared tokens (Dice coefficient) and adds a bonus when a single-letter token
 * in one name matches the first letter of a token in the other, so that
 * 'K. Muruganandham' scores well against 'Kumar Muruganandham' instead of
 * being wrongly rejected.
 *
 * Thresholds used by the caller: 100 = pass, 60-99 = warning, below 60 = error.
 */
function nameSimilarity(a, b) {
  const A = normaliseName(a), B = normaliseName(b);
  if (!A || !B) return 0;
  if (A === B) return 100;
  const ta = A.split(" ").filter(Boolean), tb = B.split(" ").filter(Boolean);
  const shared = ta.filter(t => tb.includes(t)).length;
  const base = (shared * 2) / (ta.length + tb.length) * 100;
  // initial-match bonus: "K. MURUGANANDHAM" vs "KUMAR MURUGANANDHAM"
  let bonus = 0;
  ta.forEach(t => { if (t.length === 1 && tb.some(x => x[0] === t)) bonus += 8; });
  tb.forEach(t => { if (t.length === 1 && ta.some(x => x[0] === t)) bonus += 8; });
  return Math.min(100, Math.round(base + bonus));
}

/**
 * VerifySection — tab 2 of Document Check.
 *
 * The user enters the applicant name once, then adds one row per document
 * (type + name printed on it + its ID number). runVerification() produces
 * three grouped reports: ID format checks, name checks, and cross-document
 * correctness checks. 'Load sample data' fills in a realistic set that
 * deliberately contains a 14-character GSTIN so the failure path is visible.
 */
function VerifySection() {
  const [applicantName, setApplicantName] = useState("");
  const [docs, setDocs] = useState([
    { id: 1, type: "PAN", nameOnDoc: "", idNumber: "" },
    { id: 2, type: "Aadhaar", nameOnDoc: "", idNumber: "" },
  ]);
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const addDoc = () => setDocs(p => [...p, { id: Date.now(), type: "GSTIN", nameOnDoc: "", idNumber: "" }]);
  const removeDoc = (id) => setDocs(p => p.filter(d => d.id !== id));
  const update = (id, field, val) => setDocs(p => p.map(d => d.id === id ? { ...d, [field]: val } : d));

  const loadSample = () => {
    setApplicantName("Sunil Vijay Patil");
    setDocs([
      { id: 1, type: "PAN", nameOnDoc: "Sunil Vijay Patil", idNumber: "ABCPD1234E" },
      { id: 2, type: "Aadhaar", nameOnDoc: "Sunil V Patil", idNumber: "4532 8876 1234" },
      { id: 3, type: "GSTIN", nameOnDoc: "Shri Ganesh Industries", idNumber: "27ABCPD1234E1Z" },
      { id: 4, type: "Udyam", nameOnDoc: "Sunil Patil", idNumber: "UDYAM-MH-18-0012345" },
    ]);
    setReport(null);
  };

  const runVerification = () => {
    setRunning(true); setReport(null);
    setTimeout(() => {
      const idChecks = [], nameChecks = [], crossChecks = [];

      docs.forEach(d => {
        const rule = ID_RULES[d.type];
        const raw = (d.idNumber || "").trim().toUpperCase();
        const val = rule.normalize ? rule.normalize(raw) : raw;

        // --- ID format check ---
        if (!raw) {
          idChecks.push({ doc: d.type, status: "error", title: `${rule.label} is empty`, detail: `Enter the ${rule.label} exactly as printed on the document.` });
        } else if (rule.regex.test(val)) {
          const extra = rule.extra ? rule.extra(val) : null;
          idChecks.push({ doc: d.type, status: "pass", title: `${rule.label} format is valid`, detail: extra || `Matches the expected pattern (${rule.hint}).` });
        } else {
          idChecks.push({ doc: d.type, status: "error", title: `${rule.label} format is invalid`, detail: rule.explain(val) || `Expected pattern: ${rule.hint}` });
        }

        // --- Name presence check ---
        if (!d.nameOnDoc.trim()) {
          nameChecks.push({ doc: d.type, status: "error", title: `Name missing on ${d.type}`, detail: "Enter the name exactly as it appears on this document." });
        } else {
          const score = nameSimilarity(applicantName, d.nameOnDoc);
          if (score === 100) {
            nameChecks.push({ doc: d.type, status: "pass", score, title: `Name matches exactly`, detail: `"${d.nameOnDoc}" matches the applicant name.` });
          } else if (score >= 60) {
            nameChecks.push({ doc: d.type, status: "warn", score, title: `Name partially matches (${score}%)`, detail: `Document says "${d.nameOnDoc}" but applicant name is "${applicantName}". Departments usually accept initials, but an affidavit may be asked for. Keep the spellings identical across all documents where you can.` });
          } else {
            nameChecks.push({ doc: d.type, status: "error", score, title: `Name does not match (${score}%)`, detail: `Document says "${d.nameOnDoc}" but applicant name is "${applicantName}". This mismatch will get the application rejected. Correct the name or attach a gazette name-change certificate.` });
          }
        }
      });

      // --- Cross-document correctness ---
      const pan = docs.find(d => d.type === "PAN");
      const gst = docs.find(d => d.type === "GSTIN");
      if (pan && gst && pan.idNumber && gst.idNumber) {
        const panV = pan.idNumber.trim().toUpperCase();
        const gstV = gst.idNumber.trim().toUpperCase();
        const embedded = gstV.substring(2, 12);
        if (embedded === panV) {
          crossChecks.push({ status: "pass", title: "GSTIN contains the correct PAN", detail: `Characters 3-12 of the GSTIN (${embedded}) match your PAN. This is the strongest correctness signal a department checks.` });
        } else {
          crossChecks.push({ status: "error", title: "GSTIN does not contain your PAN", detail: `The GSTIN embeds ${embedded || "(nothing readable)"} but your PAN is ${panV}. Either the GSTIN belongs to a different entity or one of the two numbers is mistyped.` });
        }
      }

      const names = docs.filter(d => d.nameOnDoc.trim()).map(d => normaliseName(d.nameOnDoc));
      const distinct = [...new Set(names)];
      if (distinct.length > 1) {
        crossChecks.push({ status: "warn", title: `${distinct.length} different name spellings across documents`, detail: `Found: ${distinct.join(" / ")}. Departments cross-verify names between documents. Fewer variations means fewer queries.` });
      } else if (distinct.length === 1) {
        crossChecks.push({ status: "pass", title: "Name spelling is consistent everywhere", detail: "All documents carry the same name. No affidavit will be needed." });
      }

      const dupes = docs.map(d => (d.idNumber || "").trim().toUpperCase()).filter(Boolean);
      if (new Set(dupes).size !== dupes.length) {
        crossChecks.push({ status: "error", title: "The same ID number appears on two documents", detail: "Each document must carry its own distinct number. Check for a copy-paste mistake." });
      }

      const all = [...idChecks, ...nameChecks, ...crossChecks];
      setReport({
        idChecks, nameChecks, crossChecks,
        errors: all.filter(c => c.status === "error").length,
        warns: all.filter(c => c.status === "warn").length,
        passes: all.filter(c => c.status === "pass").length,
        total: all.length,
      });
      setRunning(false);
    }, 1700);
  };

  const canRun = applicantName.trim() && docs.length > 0;

  const Row = ({ c }) => (
    <div className="px-5 py-3.5 flex items-start gap-3">
      {c.status === "pass" && <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />}
      {c.status === "warn" && <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />}
      {c.status === "error" && <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
      <div>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${c.status === "pass" ? "text-slate-700" : c.status === "warn" ? "text-amber-700" : "text-red-700"}`}>{c.title}</p>
          {c.doc && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c.doc}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.detail}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Applicant */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><UserCheck size={15} /> Applicant name</h3>
          <button onClick={loadSample} className="text-xs text-blue-600 font-medium hover:underline">Load sample data →</button>
        </div>
        <input type="text" value={applicantName} onChange={e => { setApplicantName(e.target.value); setReport(null); }} placeholder="Enter name exactly as it should appear on the application" className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm" />
        <p className="text-xs text-slate-400 mt-1.5">Every document below is compared against this name.</p>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Fingerprint size={15} /> Documents to verify</h3>
          <button onClick={addDoc} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-1"><Plus size={12} /> Add document</button>
        </div>
        <div className="p-5 space-y-3">
          {docs.map(d => (
            <div key={d.id} className="grid sm:grid-cols-[130px_1fr_1fr_32px] gap-2.5 items-start">
              <select value={d.type} onChange={e => { update(d.id, "type", e.target.value); setReport(null); }} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white">
                {Object.keys(ID_RULES).map(t => <option key={t}>{t}</option>)}
              </select>
              <input type="text" value={d.nameOnDoc} onChange={e => { update(d.id, "nameOnDoc", e.target.value); setReport(null); }} placeholder="Name printed on document" className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
              <div>
                <input type="text" value={d.idNumber} onChange={e => { update(d.id, "idNumber", e.target.value); setReport(null); }} placeholder={ID_RULES[d.type].placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono" />
                <p className="text-[10px] text-slate-400 mt-1">{ID_RULES[d.type].hint}</p>
              </div>
              <button onClick={() => removeDoc(d.id)} disabled={docs.length <= 1} className="p-2.5 text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-300"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <button onClick={runVerification} disabled={!canRun || running} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2">
            {running ? <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</> : <><ShieldCheck size={14} /> Run verification</>}
          </button>
          {!canRun && <p className="text-xs text-slate-400 mt-2">Enter the applicant name to enable verification.</p>}
        </div>
      </div>

      {/* Report */}
      {report && (
        <div className="space-y-5">
          <div className={`rounded-xl border p-5 ${report.errors > 0 ? "bg-red-50 border-red-200" : report.warns > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-center gap-3">
              {report.errors > 0 ? <XCircle size={22} className="text-red-600" /> : report.warns > 0 ? <AlertTriangle size={22} className="text-amber-600" /> : <CheckCircle size={22} className="text-emerald-600" />}
              <div>
                <p className={`font-semibold ${report.errors > 0 ? "text-red-800" : report.warns > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                  {report.errors > 0 ? `${report.errors} problem${report.errors > 1 ? "s" : ""} will get this application rejected` : report.warns > 0 ? "No blockers, but some things are worth fixing" : "All checks passed — documents are consistent"}
                </p>
                <p className={`text-sm ${report.errors > 0 ? "text-red-600" : report.warns > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {report.passes} passed · {report.warns} warnings · {report.errors} errors, out of {report.total} checks
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><Fingerprint size={16} /> ID number checks</h3></div>
            <div className="divide-y divide-slate-100">{report.idChecks.map((c, i) => <Row key={i} c={c} />)}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><UserCheck size={16} /> Name checks</h3></div>
            <div className="divide-y divide-slate-100">{report.nameChecks.map((c, i) => <Row key={i} c={c} />)}</div>
          </div>

          {report.crossChecks.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><GitCompare size={16} /> Cross-document correctness</h3>
                <p className="text-xs text-slate-400 mt-0.5">Checks whether your documents agree with each other</p>
              </div>
              <div className="divide-y divide-slate-100">{report.crossChecks.map((c, i) => <Row key={i} c={c} />)}</div>
            </div>
          )}
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
//    'Name & ID Verification'   -> VerifySection (identity + cross-doc)
// ==========================================================================

/**
 * DocumentsPage — thin wrapper that hosts the two document tabs.
 */
function DocumentsPage({ project }) {
  const [tab, setTab] = useState("upload");

  const tabs = [
    { id: "upload", label: "Upload & Scan", icon: Upload, desc: "OCR-based checks on an uploaded document" },
    { id: "verify", label: "Name & ID Verification", icon: Fingerprint, desc: "Check name, ID format, and cross-document correctness" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Document Check</h1>
        <p className="text-slate-500 text-sm mt-1">Catch problems before you submit — bad scans, wrong ID formats, and name mismatches</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-5 py-4 text-left transition-colors ${tab === t.id ? "bg-blue-50 border-b-2 border-blue-600" : "hover:bg-slate-50 border-b-2 border-transparent"}`}>
              <div className={`flex items-center gap-2 mb-0.5 ${tab === t.id ? "text-blue-700" : "text-slate-600"}`}>
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
  const [page, setPage] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new", label: "New Project", icon: Plus },
    { id: "roadmap", label: "Approval Roadmap", icon: Route },
    { id: "documents", label: "Document Check", icon: FileCheck },
    { id: "schemes", label: "Schemes", icon: Gift },
    { id: "translate", label: "Scan & Translate", icon: ScanLine },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-0 overflow-hidden"} bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all`}>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">ApprovalEase</h1>
              <p className="text-[10px] text-slate-400 leading-tight">Industrial Compliance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${page === n.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
              <n.icon size={16} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-0.5">SIH 2026 · Stack_OF</p>
            <p>PS ID: SIH26130</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-600 p-1">
            <LayoutDashboard size={18} />
          </button>
          <div className="flex items-center gap-3">
            {projects.length > 0 && (
              <select value={activeProject} onChange={e => setActiveProject(Number(e.target.value))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                {projects.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
            )}
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">SO</div>
          </div>
        </header>

        <div className="p-6 max-w-5xl mx-auto">
          {page === "dashboard" && <DashboardPage projects={projects} setPage={setPage} setActiveProject={setActiveProject} />}
          {page === "new" && <NewProjectPage onSubmit={addProject} setPage={setPage} />}
          {page === "roadmap" && <RoadmapPage project={projects[activeProject]} updateApproval={updateApproval} />}
          {page === "documents" && <DocumentsPage project={projects[activeProject]} />}
          {page === "schemes" && <SchemesPage project={projects[activeProject]} />}
          {page === "translate" && <TranslatePage />}
        </div>
      </main>
    </div>
  );
}
