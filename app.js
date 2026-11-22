/* =====================================================================
   app.js  —  MedConnect application layer (React 18 + JSX, no build)
   ---------------------------------------------------------------------
   Loaded by index.html as <script type="text/babel">. Babel transpiles
   the JSX using the classic React.createElement runtime.

   Depends on globals provided by earlier scripts:
     • React / ReactDOM        — UMD globals
     • window.MCData           — from data.js (mock data + pick())
     • window.ApiService       — from api.js (localStorage + Gemini + fallbacks)
     • window.lucide           — from CDN (icons); falls back to ApiService

   Structure:
     A. Helpers + Store   B. i18n + useT   C. Toast   D. Icon
     E. UI primitives     F. Shared widgets
     G. Auth + Verification
     H. Patient interface  I. Doctor interface
     J. App router + mount
   ===================================================================== */

/* Pull the React hooks we use into short locals. */
var useState = React.useState;
var useEffect = React.useEffect;
var useMemo = React.useMemo;
var useRef = React.useRef;
var useSyncExternalStore = React.useSyncExternalStore;
var createContext = React.createContext;
var useContext = React.useContext;
var Children = React.Children;

/* ===================================================================
   A1. cn(...inputs) — className combiner
   -------------------------------------------------------------------
   Joins strings/arrays/objects into one className string. Replacement
   for clsx + tailwind-merge. Used by EVERY component to merge variant
   classes with caller overrides. */
function cn() {
  var out = [];
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (!v) continue;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) out.push(cn.apply(null, v));
    else if (typeof v === "object") for (var k in v) if (v[k]) out.push(k);
  }
  return out.join(" ");
}

/* ===================================================================
   A2. STORE — global app state (no role switching; strict separation)
   -------------------------------------------------------------------
   A tiny observable store backed by useSyncExternalStore. State shape:
     { lang, authState, role, user:{name,email}, doctorCreds, doctorVerified }

   PERSISTENCE: every change is saved via ApiService.saveSession() so a
   refresh auto-restores the session (auto-login).

   STRICT SEPARATION: there is NO switchRole action. `role` is set once
   at login and never mutated. To use the other interface, the user must
   sign out and sign back in with the other account. */
var storeState = ApiService.getSession() || {
  lang: "en",
  authState: "unauthenticated",
  role: null,
  user: null,
  doctorCreds: null,
  doctorVerified: false,
};
var listeners = new Set();
function getState() { return storeState; }
function setState(updater) {
  var update = typeof updater === "function" ? updater(storeState) : updater;
  storeState = Object.assign({}, storeState, update);
  ApiService.saveSession(storeState); // persist for auto-login
  listeners.forEach(function (l) { l(); });
}
function subscribe(l) { listeners.add(l); return function () { listeners.delete(l); }; }
function useStore(selector) {
  return useSyncExternalStore(subscribe, function () { return selector(storeState); }, function () { return selector(storeState); });
}

/* Store actions. login() is the ONLY way to set role — enforcing that
 * role switching requires sign-out + sign-in. */
var actions = {
  setLang: function (lang) { setState({ lang: lang }); },
  toggleLang: function () { setState(function (s) { return { lang: s.lang === "en" ? "ar" : "en" }; }); },
  /* login(role, user, opts?) — sets role + authState.
   *   patient          -> authenticated immediately.
   *   doctor + verified -> authenticated (lands in DoctorApp).
   *   doctor + !verified-> pending (lands in DoctorVerification). */
  login: function (role, user, opts) {
    opts = opts || {};
    setState({
      authState: role === "doctor" && !opts.verified ? "pending" : "authenticated",
      role: role,
      user: user,
      doctorCreds: opts.creds || null,
      doctorVerified: !!opts.verified,
    });
  },
  submitDoctorVerification: function (creds) {
    setState({ doctorCreds: creds, authState: "pending", doctorVerified: false });
  },
  approveDoctor: function () { setState({ doctorVerified: true, authState: "authenticated" }); },
  resetVerification: function () { setState({ doctorCreds: null, authState: "pending", doctorVerified: false }); },
  logout: function () {
    ApiService.clearSession();
    setState({ authState: "unauthenticated", role: null, user: null, doctorCreds: null, doctorVerified: false });
  },
};
/* Merge actions into storeState so useStore(s => s.someAction) resolves.
 * (loadState()/ApiService.getSession() omits functions via JSON.stringify,
 *  so re-merge after load. setState preserves them via Object.assign spread.) */
Object.assign(storeState, actions);

/* ===================================================================
   B. i18n — bilingual dictionary + useT() hook
   -------------------------------------------------------------------
   T holds every UI string as {en, ar}. useT() returns {lang, t, p}:
     t('key')  -> translated string
     p(bilingualObj) -> picks the right language field from MCData */
var T = {
  "brand.name": { en: "MedConnect", ar: "ميديكونكت" },
  "brand.tagline": { en: "Verified medical knowledge & collaboration", ar: "المعرفة الطبية الموثّقة والتعاون المهني" },
  "auth.welcome": { en: "Welcome to MedConnect", ar: "مرحبًا بك في ميديكونكت" },
  "auth.subtitle": { en: "Trusted healthcare knowledge & collaboration platform for verified doctors and patients.", ar: "منصة موثوقة للمعرفة الطبية والتعاون بين الأطباء المعتمدين والمرضى." },
  "auth.login": { en: "Sign In", ar: "تسجيل الدخول" },
  "auth.signup": { en: "Create Account", ar: "إنشاء حساب" },
  "auth.toggleToSignup": { en: "Don't have an account? Sign up", ar: "ليس لديك حساب؟ أنشئ حسابًا" },
  "auth.toggleToLogin": { en: "Already have an account? Sign in", ar: "لديك حساب بالفعل؟ سجّل الدخول" },
  "auth.name": { en: "Full Name", ar: "الاسم الكامل" },
  "auth.email": { en: "Email Address", ar: "البريد الإلكتروني" },
  "auth.password": { en: "Password", ar: "كلمة المرور" },
  "auth.selectRole": { en: "Select your role", ar: "اختر دورك" },
  "auth.rolePatient": { en: "Patient", ar: "مريض" },
  "auth.roleDoctor": { en: "Doctor", ar: "طبيب" },
  "auth.rolePatientDesc": { en: "Find verified doctors & trusted answers", ar: "اعثر على أطباء موثوقين وإجابات معتمدة" },
  "auth.roleDoctorDesc": { en: "Share verified knowledge & collaborate", ar: "شارك المعرفة الموثقة وتعاون مع الزملاء" },
  "auth.continue": { en: "Continue", ar: "متابعة" },
  "auth.createAccount": { en: "Create Account", ar: "إنشاء الحساب" },
  "auth.demoPatient": { en: "Demo Patient", ar: "مريض تجريبي" },
  "auth.demoDoctor": { en: "Demo Doctor", ar: "طبيب تجريبي" },
  "auth.testVerification": { en: "Test New Doctor Verification", ar: "اختبار توثيق طبيب جديد" },
  "auth.demoHint": { en: "One-click demo accounts — no typing required.", ar: "حسابات تجريبية بنقرة واحدة — دون كتابة." },
  "auth.featureVerified": { en: "Verified doctor badges", ar: "شارات الأطباء الموثّقين" },
  "auth.featureQR": { en: "Secure temporary QR record access", ar: "وصول آمن مؤقت بالرمز للسجل الطبي" },
  "auth.featureAI": { en: "AI clinical & symptom assistant", ar: "مساعد ذكي سريري وعرض الأعراض" },
  "auth.featureCommunity": { en: "Specialty community channels", ar: "قنوات مجتمعية حسب التخصص" },
  "verify.title": { en: "Doctor Verification", ar: "توثيق الطبيب" },
  "verify.subtitle": { en: "All doctors are verified to eliminate fake practitioners. Please submit your credentials.", ar: "يتم توثيق جميع الأطباء لاستبعاد الممارسين المزيفين. يرجى تقديم بيانات اعتمادك." },
  "verify.license": { en: "Medical License Number", ar: "رقم رخصة الممارسة الطبية" },
  "verify.specialty": { en: "Medical Specialty", ar: "التخصص الطبي" },
  "verify.selectSpecialty": { en: "Select specialty", ar: "اختر التخصص" },
  "verify.yearsExp": { en: "Years of Experience", ar: "سنوات الخبرة" },
  "verify.clinic": { en: "Clinic / Hospital Affiliation", ar: "العيادة / المستشفى التابع له" },
  "verify.upload": { en: "Upload Certificate / ID", ar: "رفع الشهادة / الهوية" },
  "verify.uploadHint": { en: "Medical license certificate or government ID (PDF / image)", ar: "شهادة الرخصة الطبية أو الهوية الرسمية (PDF / صورة)" },
  "verify.submit": { en: "Submit for Verification", ar: "إرسال للتوثيق" },
  "verify.submitting": { en: "Submitting…", ar: "جارٍ الإرسال…" },
  "verify.pendingTitle": { en: "Verification Pending", ar: "التوثيق قيد المراجعة" },
  "verify.pendingBody": { en: "Our medical board is reviewing your credentials. You'll gain full verified-doctor access once approved.", ar: "يقوم المجلس الطبي بمراجعة بيانات اعتمادك. ستحصل على وصول كامل كطبيب موثّق فور الاعتماد." },
  "verify.pendingEstimate": { en: "Estimated review time: 24–48 hours", ar: "الوقت المتوقع للمراجعة: 24–48 ساعة" },
  "verify.demoApprove": { en: "Approve now (Demo)", ar: "اعتماد الآن (تجريبي)" },
  "verify.resubmit": { en: "Re-edit information", ar: "إعادة تعديل البيانات" },
  "verify.logout": { en: "Sign out", ar: "تسجيل الخروج" },
  "badge.verified": { en: "Verified Doctor", ar: "طبيب موثّق" },
  "badge.pending": { en: "Pending Verification", ar: "قيد التوثيق" },
  "topbar.signOut": { en: "Sign Out", ar: "تسجيل الخروج" },
  "nav.home": { en: "Home", ar: "الرئيسية" },
  "nav.healthRecord": { en: "Health Record", ar: "السجل الصحي" },
  "nav.search": { en: "Find Care", ar: "البحث عن رعاية" },
  "nav.community": { en: "Community", ar: "المجتمع" },
  "nav.profile": { en: "Profile", ar: "الملف" },
  "nav.clinicalAssistant": { en: "AI Assistant", ar: "المساعد الذكي" },
  "nav.communityPublic": { en: "Public Feed", ar: "المحتوى العام" },
  "nav.forumPrivate": { en: "Doctors Forum", ar: "منتدى الأطباء" },
  "patient.greeting": { en: "Hello", ar: "مرحبًا" },
  "patient.upcomingAppts": { en: "Upcoming Appointments", ar: "المواعيد القادمة" },
  "patient.healthUpdates": { en: "Health Updates", ar: "تحديثات صحية" },
  "patient.featuredDoctors": { en: "Featured Verified Doctors", ar: "أطباء موثّقون مميزون" },
  "patient.viewAll": { en: "View all", ar: "عرض الكل" },
  "patient.qaShareRecord": { en: "Share Record (QR)", ar: "مشاركة السجل (رمز)" },
  "patient.qaAskAI": { en: "Ask AI about symptoms", ar: "اسأل الذكي عن الأعراض" },
  "patient.qaFindDoctor": { en: "Find a specialist", ar: "ابحث عن أخصائي" },
  "patient.qaCommunity": { en: "Browse community", ar: "تصفح المجتمع" },
  "booking.title": { en: "Book Appointment", ar: "حجز موعد" },
  "booking.fee": { en: "Consultation fee", ar: "رسوم الاستشارة" },
  "booking.date": { en: "Preferred Date & Time", ar: "التاريخ والوقت المفضل" },
  "booking.type": { en: "Consultation Type", ar: "نوع الاستشارة" },
  "booking.inperson": { en: "In-person", ar: "حضوري" },
  "booking.video": { en: "Video", ar: "فيديو" },
  "booking.notes": { en: "Booking Notes / Case Description", ar: "ملاحظات الحجز / وصف الحالة" },
  "booking.notesHint": { en: "Optional — can be left empty", ar: "اختياري — يمكن تركه فارغًا" },
  "booking.submit": { en: "Confirm Booking", ar: "تأكيد الحجز" },
  "booking.confirmed": { en: "Booking confirmed — added to your appointments", ar: "تم تأكيد الحجز — أُضيف إلى مواعيدك" },
  "record.title": { en: "Smart Health Record", ar: "السجل الصحي الذكي" },
  "record.subtitle": { en: "Store medical reports & lab results. Generate temporary secure access to share with a doctor during a visit.", ar: "خزّن التقارير الطبية ونتائج المختبر. أنشئ وصولًا آمنًا مؤقتًا لمشاركته مع الطبيب أثناء الزيارة." },
  "record.documents": { en: "Documents & Reports", ar: "المستندات والتقارير" },
  "record.upload": { en: "Upload Document", ar: "رفع مستند" },
  "record.generateQR": { en: "Generate Temporary Access", ar: "إنشاء وصول مؤقت" },
  "record.qrTitle": { en: "Temporary Access QR Code", ar: "رمز الوصول المؤقت" },
  "record.qrDesc": { en: "Share this QR or one-time link with your doctor. Access expires automatically.", ar: "شارك هذا الرمز أو الرابط لمرة واحدة مع طبيبك. ينتهي الوصول تلقائيًا." },
  "record.validity": { en: "Valid for", ar: "صالح لمدة" },
  "record.oneHour": { en: "1 hour", ar: "ساعة واحدة" },
  "record.copyLink": { en: "Copy one-time link", ar: "نسخ الرابط لمرة واحدة" },
  "record.linkCopied": { en: "Link copied to clipboard", ar: "تم نسخ الرابط" },
  "record.activeAccess": { en: "Active Access Sessions", ar: "جلسات الوصول النشطة" },
  "record.revoke": { en: "Revoke", ar: "إلغاء" },
  "record.noDocs": { en: "No documents yet", ar: "لا مستندات بعد" },
  "record.accessedBy": { en: "Accessed by", ar: "تم الوصول بواسطة" },
  "search.manualTitle": { en: "Manual Search", ar: "البحث اليدوي" },
  "search.aiTitle": { en: "AI Smart Search", ar: "البحث الذكي" },
  "search.manual": { en: "Find a Doctor", ar: "ابحث عن طبيب" },
  "search.ai": { en: "AI Symptom & Knowledge", ar: "الذكي: الأعراض والمعرفة" },
  "search.specialty": { en: "Specialty", ar: "التخصص" },
  "search.location": { en: "Location", ar: "الموقع" },
  "search.rating": { en: "Min Rating", ar: "أدنى تقييم" },
  "search.allSpecialties": { en: "All specialties", ar: "كل التخصصات" },
  "search.allLocations": { en: "All locations", ar: "كل المواقع" },
  "search.apply": { en: "Apply Filters", ar: "تطبيق الفلاتر" },
  "search.results": { en: "results", ar: "نتائج" },
  "search.book": { en: "Book Appointment", ar: "حجز موعد" },
  "search.askPlaceholder": { en: "Describe your symptoms or ask a medical question…", ar: "صف أعراضك أو اطرح سؤالًا طبيًا…" },
  "search.ask": { en: "Ask AI", ar: "اسأل الذكي" },
  "search.analyzing": { en: "Analyzing…", ar: "جارٍ التحليل…" },
  "search.preAnsweredTitle": { en: "Doctor-Verified Pre-Answered Solutions", ar: "حلول موثّقة مسبقة من الأطباء" },
  "search.preAnsweredDesc": { en: "Retrieved from our knowledge base — each answer is approved by a verified doctor.", ar: "مسترجعة من قاعدة معرفتنا — كل إجابة معتمدة من طبيب موثّق." },
  "search.approvedBy": { en: "Approved by", ar: "اعتمدها" },
  "search.recommendedDocs": { en: "Recommended Verified Specialists", ar: "أخصائيون موثّقون موصى بهم" },
  "search.noResults": { en: "No doctors match these filters", ar: "لا أطباء يطابقون هذه الفلاتر" },
  "search.clinicalRef": { en: "Peer-Reviewed References", ar: "مراجع محلّاة من الأقران" },
  "search.instantSummary": { en: "Instant Patient Summary", ar: "ملخص فوري للمريض" },
  "search.summaryDesc": { en: "When a patient grants temporary QR/link access, AI reads and summarizes their records in seconds.", ar: "عند منح المريض وصولاً مؤقتًا بالرمز/الرابط، يقرأ الذكي ويلخّص سجلاتهم في ثوانٍ." },
  "search.generateSummary": { en: "Generate Patient Summary", ar: "إنشاء ملخص المريض" },
  "search.noAccess": { en: "No active patient access sessions. Ask the patient to generate a temporary QR.", ar: "لا جلسات وصول نشطة للمريض. اطلب من المريض إنشاء رمز وصول مؤقت." },
  "gl.filterTitle": { en: "Guideline sources", ar: "مصادر الإرشادات" },
  "gl.aligned": { en: "Aligned with", ar: "متوافق مع" },
  "gl.allSources": { en: "All sources", ar: "كل المصادر" },
  "gl.filtered": { en: "Filtered by guideline source", ar: "مُصفّى حسب مصدر الإرشاد" },
  "mentor.title": { en: "Consultant Mentor Mode", ar: "وضع المرشد الاستشاري" },
  "mentor.subtitle": { en: "Upload a lab report, ultrasound, or CTG — the AI structures the read into consultant-level clinical cards with guideline citations and a self-quiz.", ar: "ارفع تقرير مختبر أو موجات صوتية أو تخطيط قلب الجنين — يُهيكل الذكي القراءة في بطاقات سريرية بمستوى استشاري مع استشهادات الإرشادات واختبار ذاتي." },
  "mentor.upload": { en: "Upload report / image", ar: "رفع تقرير / صورة" },
  "mentor.analyzeSample": { en: "Analyze Sample Report", ar: "تحليل تقرير نموذجي" },
  "mentor.analyzing": { en: "Running consultant analysis…", ar: "جارٍ التحليل الاستشاري…" },
  "mentor.reportLabel": { en: "Report analyzed", ar: "التقرير المُحلّل" },
  "mentor.card1": { en: "Pathophysiology & Reading", ar: "الفيزيولوجيا المرضية والقراءة" },
  "mentor.physiology": { en: "Physiology (normal)", ar: "الفيزيولوجيا (الطبيعي)" },
  "mentor.pathology": { en: "Pathology (this case)", ar: "المرضي (هذه الحالة)" },
  "mentor.card2": { en: "Differential Diagnosis", ar: "التشخيص التفريقي" },
  "mentor.severity": { en: "Severity", ar: "الخطورة" },
  "mentor.card3": { en: "Actionable Clinical Decision", ar: "القرار السريري القابل للتطبيق" },
  "mentor.intervene": { en: "When to intervene", ar: "متى تتدخل" },
  "mentor.observe": { en: "When to observe", ar: "متى تراقب" },
  "mentor.card4": { en: "Guideline References & Common Pitfalls", ar: "مراجع الإرشادات والمزالق الشائعة" },
  "mentor.references": { en: "References", ar: "المراجع" },
  "mentor.pitfalls": { en: "Common pitfalls", ar: "المزالق الشائعة" },
  "mentor.card5": { en: "Clinical Pearls & Patient Communication Script", ar: "لآلئ سريرية ونص تواصل المريض" },
  "mentor.pearls": { en: "Clinical pearls", ar: "لآلئ سريرية" },
  "mentor.patientScript": { en: "Patient communication script", ar: "نص تواصل المريض" },
  "mentor.card6": { en: "Board-Style Self-Quiz", ar: "اختبار ذاتي بأسلوب المجلس" },
  "mentor.quizHint": { en: "3 MCQs — select an answer to see the rationale.", ar: "3 أسئلة اختيار — اختر إجابة لرؤية التبرير." },
  "mentor.correct": { en: "Correct", ar: "صحيح" },
  "mentor.incorrect": { en: "Incorrect", ar: "خطأ" },
  "mentor.rationale": { en: "Rationale", ar: "التبرير" },
  "mentor.retry": { en: "Retry quiz", ar: "إعادة الاختبار" },
  "mentor.score": { en: "Score", ar: "النتيجة" },
  "surgical.tab": { en: "Surgical Tips", ar: "نصائح جراحية" },
  "surgical.title": { en: "Surgical Tips & Tricks", ar: "نصائح وحيل جراحية" },
  "surgical.subtitle": { en: "Verified surgeons share short procedural videos, step-by-step intraoperative tricks, and complication-avoidance protocols.", ar: "جراحون موثّقون يشاركون فيديوهات إجرائية قصيرة، وحيل داخل العملية خطوة بخطوة، وبروتوكولات تجنّب المضاعفات." },
  "surgical.all": { en: "All specialties", ar: "كل التخصصات" },
  "surgical.video": { en: "Procedural Video", ar: "فيديو إجرائي" },
  "surgical.trick": { en: "Intra-op Trick", ar: "حيلة داخل العملية" },
  "surgical.protocol": { en: "Protocol", ar: "بروتوكول" },
  "surgical.steps": { en: "Step-by-step", ar: "خطوة بخطوة" },
  "surgical.share": { en: "Share Tip", ar: "شارك نصيحة" },
  "surgical.locked": { en: "Verified surgeons only", ar: "للجراحين الموثّقين فقط" },
  "surgical.watch": { en: "Watch", ar: "شاهد" },
  "doctor.greeting": { en: "Good day, Dr.", ar: "يوم سعيد، د." },
  "doctor.schedule": { en: "Today's Schedule", ar: "جدول اليوم" },
  "doctor.accessRequests": { en: "Incoming Patient Access Requests", ar: "طلبات وصول المرضى الواردة" },
  "doctor.referralNotifs": { en: "Referral Notifications", ar: "إشعارات الإحالات" },
  "doctor.metrics": { en: "Community Engagement", ar: "تفاعل المجتمع" },
  "doctor.accept": { en: "Accept", ar: "قبول" },
  "doctor.viewSummary": { en: "View AI Summary", ar: "عرض ملخص الذكي" },
  "doctor.referTo": { en: "Refer to Specialist", ar: "إحالة إلى أخصائي" },
  "doctor.referralFrom": { en: "Referred from", ar: "مُحال من" },
  "doctor.openCase": { en: "Open Case File", ar: "فتح ملف الحالة" },
  "doctor.noRequests": { en: "No pending requests", ar: "لا طلبات معلّقة" },
  "doctor.noReferrals": { en: "No new referrals", ar: "لا إحالات جديدة" },
  "doctor.metricArticles": { en: "Articles Published", ar: "مقالات منشورة" },
  "doctor.metricUpvotes": { en: "Total Upvotes", ar: "إجمالي التصويتات" },
  "doctor.metricReferrals": { en: "Referrals Sent", ar: "إحالات مرسلة" },
  "doctor.metricPatients": { en: "Patients This Week", ar: "المرضى هذا الأسبوع" },
  "referral.title": { en: "Smart Referral", ar: "الإحالة الذكية" },
  "referral.subtitle": { en: "Transfer the summarized case file to a verified specialist on the platform.", ar: "حوّل ملف الحالة المُلخّص إلى أخصائي موثّق على المنصة." },
  "referral.selectDoctor": { en: "Select verified specialist", ar: "اختر أخصائيًا موثّقًا" },
  "referral.reason": { en: "Referral note", ar: "ملاحظة الإحالة" },
  "referral.includeSummary": { en: "Include AI patient summary", ar: "تضمين ملخص الذكي للمريض" },
  "referral.send": { en: "Send Referral", ar: "إرسال الإحالة" },
  "referral.sent": { en: "Referral sent successfully", ar: "تم إرسال الإحالة بنجاح" },
  "referral.caseFile": { en: "Case file being transferred", ar: "ملف الحالة قيد التحويل" },
  "profile.personal": { en: "Personal Details", ar: "البيانات الشخصية" },
  "profile.privacy": { en: "Privacy Controls", ar: "ضوابط الخصوصية" },
  "profile.language": { en: "Language", ar: "اللغة" },
  "profile.save": { en: "Save Changes", ar: "حفظ التغييرات" },
  "profile.saved": { en: "Settings saved", ar: "تم حفظ الإعدادات" },
  "profile.clinicHours": { en: "Clinic Hours", ar: "ساعات العيادة" },
  "profile.referralPrefs": { en: "Referral Preferences", ar: "تفضيلات الإحالة" },
  "profile.acceptReferrals": { en: "Accept incoming referrals", ar: "قبول الإحالات الواردة" },
  "profile.credentials": { en: "Verified Credentials", ar: "بيانات الاعتماد الموثّقة" },
  "profile.consultationFee": { en: "Consultation Fee", ar: "رسوم الاستشارة" },
  "profile.feeSaved": { en: "Consultation fee saved — updated on all your doctor cards", ar: "تم حفظ الرسوم — محدّث على كل بطاقاتك" },
  "gen.close": { en: "Close", ar: "إغلاق" },
  "gen.cancel": { en: "Cancel", ar: "إلغاء" },
  "gen.yearsExp": { en: "yrs exp", ar: "سنوات خبرة" },
  "footer.rights": { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },
  "footer.disclaimer": { en: "MedConnect is a demonstration platform. Verified badges indicate credential review within this demo only.", ar: "ميديكونكت منصة عرض تجريبي. تشير شارات التوثيق إلى مراجعة البيانات داخل هذا العرض فقط." },
  "footer.about": { en: "About", ar: "حول" },
  "footer.privacy": { en: "Privacy", ar: "الخصوصية" },
  "footer.terms": { en: "Terms", ar: "الشروط" },
  "footer.contact": { en: "Contact", ar: "تواصل" },
};
function tr(key, lang) { var e = T[key]; return e ? e[lang] : key; }
function useT() {
  var lang = useStore(function (s) { return s.lang; });
  return { lang: lang, t: function (k) { return tr(k, lang); }, p: function (b) { return MCData.pick(b, lang); } };
}

/* ===================================================================
   C. TOAST — lightweight notification system
   -------------------------------------------------------------------
   `toast(msg)` and `toast.success(msg)` push a transient pill at the
   top-center. ToastHost renders the list. _pushToast is reassigned by
   ToastHost on mount; until then calls just console.log. */
var _pushToast = function (msg) { console.log("[toast]", msg); };
var toast = function (msg, type) { _pushToast(msg, type); };
toast.success = function (msg) { _pushToast(msg, "success"); };
toast.error = function (msg) { _pushToast(msg, "error"); };
function ToastHost() {
  var [items, setItems] = useState([]);
  // Reassign _pushToast so toast() calls reach React state.
  useEffect(function () {
    _pushToast = function (msg, type) {
      var id = Math.random().toString(36).slice(2);
      setItems(function (arr) { return arr.concat([{ id: id, msg: msg, type: type || "success" }]); });
      setTimeout(function () { setItems(function (arr) { return arr.filter(function (x) { return x.id !== id; }); }); }, 3000);
    };
  }, []);
  return (
    <div className="fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map(function (it) {
        return (
          <div key={it.id} className="mc-fade-in flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg" style={{ background: it.type === "error" ? "#e11d48" : "#0d9488" }}>
            <Icon name="CheckCircle2" className="size-4" />
            <span>{it.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ===================================================================
   D. ICON — lucide renderer with offline fallback
   -------------------------------------------------------------------
   Tries window.lucide[name] (toSvg or [tag,attrs,children] array).
   If lucide is unreachable (offline), renders ApiService.iconFallbackSvg
   so the layout keeps its icon slots. The span's [&_svg]:w-full forces
   the inner SVG to fill the caller's size class (e.g. size-4). */
function nodeToHtml(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (!Array.isArray(node)) return "";
  var tag = node[0]; var attrs = node[1] || {};
  var attrStr = Object.keys(attrs).map(function (k) { return k + '="' + attrs[k] + '"'; }).join(" ");
  var children = node.length > 2 && Array.isArray(node[2]) ? node[2] : node.slice(2);
  var inner = (Array.isArray(children) ? children : []).map(nodeToHtml).join("");
  return "<" + tag + " " + attrStr + ">" + inner + "</" + tag + ">";
}
function Icon(_a) {
  var name = _a.name || "Stethoscope", className = _a.className;
  var L = window.lucide;
  var svg = "";
  if (L) {
    var icon = L[name];
    if (!icon) {
      var kebab = name.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
      icon = (L.icons && (L.icons[name] || L.icons[kebab])) || null;
    }
    if (icon && typeof icon.toSvg === "function") svg = icon.toSvg();
    else if (icon && Array.isArray(icon)) svg = nodeToHtml(icon);
  }
  if (!svg) svg = ApiService.iconFallbackSvg(name); // offline fallback
  return <span className={cn("inline-flex shrink-0 items-center justify-center [&_svg]:w-full [&_svg]:h-full", className)} aria-hidden={true} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* ===================================================================
   E. UI PRIMITIVES  (no Radix — custom, dependency-free)
   -------------------------------------------------------------------
   Each is a styled wrapper used across every screen. Comments note the
   variant classes and which handler props they forward. */

/* Button — variant: default|destructive|outline|secondary|ghost|link
 *          size: default|sm|lg|icon. Forwards onClick, disabled, type. */
function Button(_a) {
  var variant = _a.variant, size = _a.size, className = _a.className, children = _a.children, props = {};
  Object.keys(_a).forEach(function (k) { if (k !== "variant" && k !== "size" && k !== "className" && k !== "children") props[k] = _a[k]; });
  var variants = {
    default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
    destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
    outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  var sizes = { default: "h-9 px-4 py-2", sm: "h-8 rounded-md gap-1.5 px-3", lg: "h-10 rounded-md px-6", icon: "size-9" };
  return (
    <button {...props} className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", variants[variant || "default"], sizes[size || "default"], className)}>
      {children}
    </button>
  );
}

/* Card — surface container. */
function Card(_a) {
  var className = _a.className, children = _a.children, props = {};
  Object.keys(_a).forEach(function (k) { if (k !== "className" && k !== "children") props[k] = _a[k]; });
  return <div {...props} className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}>{children}</div>;
}

/* Badge — variant: default|secondary|destructive|outline. */
function Badge(_a) {
  var variant = _a.variant, className = _a.className, children = _a.children;
  var variants = { default: "border-transparent bg-primary text-primary-foreground", secondary: "border-transparent bg-secondary text-secondary-foreground", destructive: "border-transparent bg-destructive text-white", outline: "text-foreground" };
  return <span className={cn("inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium gap-1 transition-colors", variants[variant || "default"], className)}>{children}</span>;
}

/* Input — text/email/password/number/date/datetime-local input. */
function Input(_a) {
  var className = _a.className, props = {};
  Object.keys(_a).forEach(function (k) { if (k !== "className") props[k] = _a[k]; });
  return <input {...props} className={cn("flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} />;
}
function Label(_a) {
  var className = _a.className, children = _a.children, props = {};
  Object.keys(_a).forEach(function (k) { if (k !== "className" && k !== "children") props[k] = _a[k]; });
  return <label {...props} className={cn("text-sm font-medium leading-none", className)}>{children}</label>;
}
function Textarea(_a) {
  var className = _a.className, props = {};
  Object.keys(_a).forEach(function (k) { if (k !== "className") props[k] = _a[k]; });
  return <textarea {...props} className={cn("flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} />;
}

/* Avatar — gradient circle with initials fallback. */
function Avatar(_a) {
  var className = _a.className, children = _a.children;
  return <span className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}>{children}</span>;
}
function AvatarFallback(_a) {
  var className = _a.className, children = _a.children;
  return <span className={cn("flex size-full items-center justify-center rounded-full bg-muted", className)}>{children}</span>;
}

/* Switch — toggle. checked + onCheckedChange(boolean). Uses justify-end
 * when checked so the knob auto-flips for RTL. */
function Switch(_a) {
  var checked = _a.checked, onCheckedChange = _a.onCheckedChange, className = _a.className;
  return (
    <button type="button" role="switch" aria-checked={!!checked} onClick={function () { onCheckedChange && onCheckedChange(!checked); }} className={cn("inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent px-0.5 transition-colors", checked ? "bg-primary justify-end" : "bg-input justify-start", className)}>
      <span className="block size-4 rounded-full bg-background shadow" />
    </button>
  );
}

/* Select — custom dropdown. value + onValueChange + placeholder.
   Children are <SelectItem value="x">label</SelectItem> (data carriers). */
function Select(_a) {
  var value = _a.value, onValueChange = _a.onValueChange, placeholder = _a.placeholder, children = _a.children, className = _a.className;
  var [open, setOpen] = useState(false); var ref = useRef(null);
  useEffect(function () {
    if (!open) return;
    var handler = function (e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return function () { document.removeEventListener("mousedown", handler); };
  }, [open]);
  var items = Children.toArray(children).filter(function (c) { return c && c.props && c.props.value !== undefined; });
  var selected = items.filter(function (c) { return c.props.value === value; })[0];
  var label = selected ? selected.props.children : null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={function () { setOpen(!open); }} className={cn("flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
        <span className={cn(!label && "text-muted-foreground")}>{label || placeholder}</span>
        <Icon name="ChevronDown" className="size-4 opacity-50" />
      </button>
      {open && (
        <div className="mc-zoom-in absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md scroll-area-thin">
          {items.map(function (c) {
            return (
              <button key={c.props.value} type="button" onClick={function () { onValueChange(c.props.value); setOpen(false); }} className={cn("flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none", c.props.value === value ? "bg-accent text-accent-foreground" : "hover:bg-accent")}>
                {c.props.children}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function SelectItem(_a) { return null; } /* data carrier only */

/* Tabs — value + onValueChange. Context shared with Trigger/Content. */
var TabsCtx = createContext(null);
function Tabs(_a) {
  var value = _a.value, onValueChange = _a.onValueChange, children = _a.children, className = _a.className;
  return (
    <TabsCtx.Provider value={{ value: value, onChange: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}
function TabsList(_a) { var className = _a.className, children = _a.children; return <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>{children}</div>; }
function TabsTrigger(_a) {
  var value = _a.value, children = _a.children, className = _a.className;
  var ctx = useContext(TabsCtx); var active = ctx.value === value;
  return <button type="button" onClick={function () { ctx.onChange(value); }} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all", active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground", className)}>{children}</button>;
}
function TabsContent(_a) {
  var value = _a.value, children = _a.children, className = _a.className;
  var ctx = useContext(TabsCtx); if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

/* Dialog — modal. open + onOpenChange. Esc to close, overlay click. */
function Dialog(_a) {
  var open = _a.open, onOpenChange = _a.onOpenChange, children = _a.children, className = _a.className;
  useEffect(function () {
    if (!open) return;
    var onKey = function (e) { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return function () { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="mc-fade-in absolute inset-0 bg-black/50" onClick={function () { onOpenChange(false); }} />
      <div className={cn("mc-zoom-in relative z-10 w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto scroll-area-thin", className)}>
        {children}
        <button type="button" onClick={function () { onOpenChange(false); }} className="absolute top-4 end-4 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100">
          <Icon name="X" className="size-4" />
        </button>
      </div>
    </div>
  );
}
function DialogHeader(_a) { var children = _a.children; return <div className="mb-4 flex flex-col gap-2 text-start">{children}</div>; }
function DialogTitle(_a) { var className = _a.className, children = _a.children; return <h2 className={cn("text-lg font-semibold leading-none", className)}>{children}</h2>; }
function DialogDescription(_a) { var children = _a.children; return <p className="text-sm text-muted-foreground">{children}</p>; }
function DialogFooter(_a) { var children = _a.children; return <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>; }

/* DropdownMenu — trigger + content. Closes on outside click. */
var DropdownCtx = createContext(null);
function DropdownMenu(_a) {
  var children = _a.children;
  var [open, setOpen] = useState(false); var ref = useRef(null);
  useEffect(function () {
    if (!open) return;
    var handler = function (e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return function () { document.removeEventListener("mousedown", handler); };
  }, [open]);
  return (
    <DropdownCtx.Provider value={{ open: open, setOpen: setOpen }}>
      <div className="relative" ref={ref}>{children}</div>
    </DropdownCtx.Provider>
  );
}
function DropdownMenuTrigger(_a) {
  var children = _a.children, asChild = _a.asChild;
  var ctx = useContext(DropdownCtx);
  var child = asChild ? children : <button type="button">{children}</button>;
  return React.cloneElement(child, { onClick: function (e) { e.stopPropagation(); ctx.setOpen(!ctx.open); child.props.onClick && child.props.onClick(e); } });
}
function DropdownMenuContent(_a) {
  var children = _a.children, className = _a.className, align = _a.align;
  var ctx = useContext(DropdownCtx); if (!ctx.open) return null;
  return <div className={cn("mc-zoom-in absolute z-50 mt-2 min-w-[12rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md", align === "end" ? "end-0" : "start-0", className)}>{children}</div>;
}
function DropdownMenuItem(_a) {
  var children = _a.children, onClick = _a.onClick, className = _a.className;
  var ctx = useContext(DropdownCtx);
  return (
    <button type="button" onClick={function (e) { onClick && onClick(e); ctx.setOpen(false); }} className={cn("relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground", className)}>
      {children}
    </button>
  );
}
function DropdownMenuLabel(_a) { var children = _a.children; return <div className="truncate px-2 py-1.5 text-sm font-semibold">{children}</div>; }
function DropdownMenuSeparator() { return <div className="-mx-1 my-1 h-px bg-border" />; }

/* Sheet — mobile drawer. open + onOpenChange + SheetTrigger(asChild). */
var SheetCtx = createContext(null);
function Sheet(_a) { var open = _a.open, onOpenChange = _a.onOpenChange, children = _a.children; return <SheetCtx.Provider value={{ open: open, onOpenChange: onOpenChange }}>{children}</SheetCtx.Provider>; }
function SheetTrigger(_a) {
  var children = _a.children, asChild = _a.asChild;
  var ctx = useContext(SheetCtx);
  var child = asChild ? children : <button type="button">{children}</button>;
  return React.cloneElement(child, { onClick: function (e) { ctx.onOpenChange(true); child.props.onClick && child.props.onClick(e); } });
}
function SheetContent(_a) {
  var children = _a.children, className = _a.className;
  var ctx = useContext(SheetCtx);
  useEffect(function () {
    if (!ctx.open) return;
    var onKey = function (e) { if (e.key === "Escape") ctx.onOpenChange(false); };
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return function () { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [ctx.open]);
  if (!ctx.open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="mc-fade-in absolute inset-0 bg-black/50" onClick={function () { ctx.onOpenChange(false); }} />
      <div className={cn("mc-slide-in absolute inset-y-0 start-0 w-64 overflow-y-auto bg-background shadow-lg", className)}>{children}</div>
    </div>
  );
}
function SheetTitle(_a) { var children = _a.children; return <h2 className="sr-only">{children}</h2>; }

/* Accordion — type:single|multiple, collapsible, defaultValue.
   AccordionItem(value) > AccordionTrigger > AccordionContent. */
var AccordionCtx = createContext(null);
var AccordionItemCtx = createContext(null);
function Accordion(_a) {
  var type = _a.type, collapsible = _a.collapsible, defaultValue = _a.defaultValue, children = _a.children, className = _a.className;
  var [open, setOpen] = useState(function () { if (defaultValue == null) return type === "multiple" ? [] : null; return defaultValue; });
  var isOpen = function (v) { return type === "multiple" ? (Array.isArray(open) && open.indexOf(v) > -1) : open === v; };
  var toggle = function (v) {
    if (type === "multiple") { setOpen(function (cur) { return Array.isArray(cur) && cur.indexOf(v) > -1 ? cur.filter(function (x) { return x !== v; }) : (cur || []).concat([v]); }); }
    else { setOpen(function (cur) { return cur === v ? (collapsible ? null : cur) : v; }); }
  };
  return (
    <AccordionCtx.Provider value={{ isOpen: isOpen, toggle: toggle }}>
      <div className={className}>{children}</div>
    </AccordionCtx.Provider>
  );
}
function AccordionItem(_a) {
  var value = _a.value, children = _a.children, className = _a.className;
  return (
    <AccordionItemCtx.Provider value={value}>
      <div className={cn("border-b last:border-b-0", className)}>{children}</div>
    </AccordionItemCtx.Provider>
  );
}
function AccordionTrigger(_a) {
  var children = _a.children, className = _a.className;
  var ctx = useContext(AccordionCtx); var item = useContext(AccordionItemCtx);
  var open = ctx && item && ctx.isOpen(item);
  return (
    <h3 className="flex">
      <button type="button" onClick={function () { ctx && item && ctx.toggle(item); }} className={cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all outline-none hover:underline", className)}>
        {children}
        <Icon name="ChevronDown" className={cn("pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
    </h3>
  );
}
function AccordionContent(_a) {
  var children = _a.children, className = _a.className;
  var ctx = useContext(AccordionCtx); var item = useContext(AccordionItemCtx);
  if (ctx && item && !ctx.isOpen(item)) return null;
  return <div className={cn("pt-0 pb-4 text-sm", className)}>{children}</div>;
}

/* ===================================================================
   F. SHARED WIDGETS
   ------------------------------------------------------------------- */

/* VerifiedBadge — the pulsing teal/blue checkmark shown next to every
 * verified doctor's name. withLabel adds the text "Verified Doctor". */
function VerifiedBadge(_a) {
  var className = _a.className, size = _a.size, withLabel = _a.withLabel;
  var t = useT().t;
  var dims = size === "md" ? "size-4" : "size-3.5";
  var text = size === "md" ? "text-xs" : "text-[11px]";
  return (
    <span className={cn("verified-pulse inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-500 to-sky-600 px-1.5 py-0.5 font-semibold text-white shadow-sm", withLabel && text, className)} title={t("badge.verified")}>
      <Icon name="BadgeCheck" className={dims} />
      {withLabel && <span>{t("badge.verified")}</span>}
    </span>
  );
}
function PendingBadge(_a) {
  var className = _a.className; var t = useT().t;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700", className)} title={t("badge.pending")}>
      <Icon name="Clock3" className="size-3.5" />
      <span>{t("badge.pending")}</span>
    </span>
  );
}

/* DoctorAvatar — gradient circle with the doctor's initials. */
function DoctorAvatar(_a) {
  var initials = _a.initials, gradient = _a.gradient, className = _a.className, ring = _a.ring;
  return (
    <Avatar className={cn("size-10", ring && "ring-2 ring-teal-500/40 ring-offset-2 ring-offset-background", className)}>
      <AvatarFallback className={cn("bg-gradient-to-br font-semibold text-white", gradient)}>{initials}</AvatarFallback>
    </Avatar>
  );
}

/* DoctorCard — reusable verified-doctor card. Shows the consultationFee
 * badge (from ApiService.getDoctorFee, so a doctor's saved edit reflects
 * everywhere). onBook opens the BookingModal (patient) or is omitted. */
function DoctorCard(_a) {
  var doctor = _a.doctor, onBook = _a.onBook, compact = _a.compact;
  var _b = useT(); var t = _b.t, p = _b.p;
  var spec = MCData.getSpecialty(doctor.specialtyId);
  var fee = ApiService.getDoctorFee(doctor.id); // merged stored + default
  return (
    <Card className="group relative overflow-hidden border-border/70 p-4 transition-all hover:shadow-md hover:border-teal-300">
      <div className="flex items-start gap-3">
        <DoctorAvatar initials={doctor.initials} gradient={doctor.avatarGradient} ring={true} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold leading-tight">{p(doctor.nameDisplay)}</h3>
            {doctor.verified && <VerifiedBadge />}
          </div>
          <p className="mt-0.5 text-xs font-medium text-teal-700">{p(spec.name)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon name="Star" className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{doctor.rating}</span>
              <span>{"(" + doctor.reviews + ")"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="MapPin" className="size-3.5" />
              {p(doctor.location)}
            </span>
          </div>
          {/* consultationFee badge — NEW */}
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
              <Icon name="CircleDollarSign" className="size-3" />
              {p(fee)}
            </span>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{doctor.yearsExp}</span>
            {" "}
            <span>{t("gen.yearsExp")}</span>
          </div>
          {onBook && (
            <Button size="sm" onClick={onBook} className="bg-teal-600 hover:bg-teal-700">
              <Icon name="Calendar" className="size-3.5" />
              {t("search.book")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/* BookingModal — patient booking form. Shows doctor + fee, collects
 * date/time, type, optional notes. Saves via ApiService.saveAppointment
 * so the booking appears in PatientHome + DoctorHome schedules. */
function BookingModal(_a) {
  var open = _a.open, onOpenChange = _a.onOpenChange, doctor = _a.doctor;
  var _b = useT(); var t = _b.t, p = _b.p;
  var fee = doctor ? ApiService.getDoctorFee(doctor.id) : null;
  /* Form state — EVERY useState below is ONE call (array destructuring).
   * The previous corrupted version used `useState(x)[0], setX = useState(x)[1]`
   * which created TWO hooks per field (broken setter binding). This version
   * calls useState exactly once per piece of state. */
  var [date, setDate] = useState("");
  var [time, setTime] = useState("");
  var [type, setType] = useState("in-person");
  var [notes, setNotes] = useState("");
  var [submitting, setSubmitting] = useState(false);
  var [paymentMethod, setPaymentMethod] = useState("clinic");
  var [paymentDetail, setPaymentDetail] = useState("");
  var [savedPayment, setSavedPayment] = useState(null);

  /* Reset the form whenever the modal reopens so a fresh booking starts
   * with empty fields. Runs only when `open` flips to true. */
  useEffect(function () {
    if (open) {
      setDate(""); setTime(""); setType("in-person"); setNotes(""); setSubmitting(false);
      var method = ApiService.getUserPayment();
      var verifiedMethod = method && method.verified ? method : null;
      setSavedPayment(verifiedMethod);
      setPaymentMethod(verifiedMethod ? verifiedMethod.type : "clinic");
      setPaymentDetail(verifiedMethod ? verifiedMethod.detail : "");
    }
  }, [open]);

  function handleSubmit() {
    if (!doctor) return;
    if (!date) { toast.error(t("booking.date")); return; }
    setSubmitting(true);
    var booking = {
      id: "bk" + Date.now(),
      doctorId: doctor.id,
      patientName: { en: "Reem Al-Qahtani", ar: "ريم القحطاني" },
      time: { en: time, ar: time },
      date: { en: date, ar: date },
      type: type === "video" ? { en: "Video", ar: "فيديو" } : { en: "In-person", ar: "حضوري" },
      fee: fee,
      notes: notes,
      status: { en: "Pending", ar: "قيد التأكيد" },
    };
    ApiService.saveAppointment(booking); // persists -> surfaces in PatientHome
    window.dispatchEvent(new Event("mc:appointments-updated"));
    setTimeout(function () {
      setSubmitting(false);
      toast.success(t("booking.confirmed"));
      onOpenChange(false);
    }, 500);
  }

  if (!doctor) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("booking.title")}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {/* Doctor + consultationFee badge row. */}
        <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
          <DoctorAvatar initials={doctor.initials} gradient={doctor.avatarGradient} ring={true} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold">{p(doctor.nameDisplay)}</h3>
              {doctor.verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground">{p(MCData.getSpecialty(doctor.specialtyId).name)}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
            <Icon name="CircleDollarSign" className="size-3.5" />
            {p(fee)}
          </span>
        </div>
        {/* Date/time + type. datetime-local gives a native picker. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("booking.date")}</Label>
            <Input type="datetime-local" value={date} onChange={function (e) { setDate(e.target.value); }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("booking.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectItem value="in-person">{t("booking.inperson")}</SelectItem>
              <SelectItem value="video">{t("booking.video")}</SelectItem>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>{p({ en: "Payment Method", ar: "طريقة الدفع" })}</Label>
            {savedPayment && paymentMethod === savedPayment.type && paymentDetail === savedPayment.detail && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {p({ en: "Verified", ar: "موثّق" })}
              </span>
            )}
          </div>
          <Select value={paymentMethod} onValueChange={function (value) {
            setPaymentMethod(value);
            setPaymentDetail(savedPayment && value === savedPayment.type ? savedPayment.detail : "");
          }}>
            <SelectItem value="clinic">{p({ en: "Pay at Clinic", ar: "الدفع في العيادة" })}</SelectItem>
            <SelectItem value="card">{p({ en: "Credit Card", ar: "بطاقة ائتمان" })}</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
          </Select>
          {paymentMethod !== "clinic" && (
            <Input
              type={paymentMethod === "paypal" ? "email" : "text"}
              inputMode={paymentMethod === "card" ? "numeric" : undefined}
              autoComplete={paymentMethod === "card" ? "cc-number" : "email"}
              placeholder={paymentMethod === "paypal" ? "you@example.com" : p({ en: "Card number", ar: "رقم البطاقة" })}
              aria-label={paymentMethod === "paypal" ? "PayPal email" : "Card number"}
              value={paymentDetail}
              onChange={function (e) { setPaymentDetail(e.target.value); }}
            />
          )}
        </div>
        {/* Optional notes — left empty by default per booking.notesHint. */}
        <div className="flex flex-col gap-1.5">
          <Label>{t("booking.notes")}</Label>
          <Textarea placeholder={t("booking.notesHint")} value={notes} onChange={function (e) { setNotes(e.target.value); }} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={function () { onOpenChange(false); }}>{t("gen.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
          {submitting ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="Calendar" className="size-4" />}
          {t("booking.submit")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ===================================================================
   F3. QrAccessModal — temporary secure record access (QR + one-time link)
   -------------------------------------------------------------------
   Renders a scannable QR via window.QRCode (qrcodejs) when online. If the
   CDN script is unreachable, falls back to ApiService.qrFallbackSvg so
   the modal still shows a code silhouette. The token regenerates on every
   open so each access session is one-time. */
function QrAccessModal(_a) {
  var open = _a.open, onOpenChange = _a.onOpenChange;
  var _b = useT(); var t = _b.t, p = _b.p;
  var [token, setToken] = useState("");
  var [copied, setCopied] = useState(false);
  var qrRef = useRef(null);
  var link = "https://medconnect.app/r/" + token;

  /* On open: mint a fresh token + (re)render the QR into qrRef. The QR
   * library mutates the DOM node directly, so we clear it first. */
  useEffect(function () {
    if (!open) return;
    setToken("MC-" + Math.random().toString(36).slice(2, 10));
  }, [open]);
  useEffect(function () {
    if (!open || !token || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    if (window.QRCode) {
      try { new window.QRCode(qrRef.current, { text: link, width: 180, height: 180 }); }
      catch (e) { qrRef.current.innerHTML = ApiService.qrFallbackSvg(link, 180); }
    } else {
      qrRef.current.innerHTML = ApiService.qrFallbackSvg(link, 180);
    }
  }, [open, token, link]);

  function copyLink() {
    try { navigator.clipboard.writeText(link); } catch (e) {}
    setCopied(true);
    toast.success(t("record.linkCopied"));
    setTimeout(function () { setCopied(false); }, 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("record.qrTitle")}</DialogTitle>
        <DialogDescription>{t("record.qrDesc")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-2">
        <div ref={qrRef} className="grid size-[180px] place-items-center rounded-lg border border-border bg-white p-2 text-foreground [&_img]:size-full [&_svg]:size-full" />
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Icon name="Clock3" className="size-3.5" />
          <span>{t("record.validity")}: {t("record.oneHour")}</span>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink} className="w-full">
          <Icon name="Link" className="size-3.5" />
          {copied ? t("record.linkCopied") : t("record.copyLink")}
        </Button>
      </div>
    </Dialog>
  );
}

/* ===================================================================
   F4. ReferralModal — smart case transfer to a verified specialist
   -------------------------------------------------------------------
   Caller passes `sourceCase` (e.g. a forum case or referral notification
   title+summary). The doctor picks a recipient, optional note, and an
   "include AI patient summary" switch. On send -> toast + close. */
function ReferralModal(_a) {
  var open = _a.open, onOpenChange = _a.onOpenChange, sourceCase = _a.sourceCase;
  var _b = useT(); var t = _b.t, p = _b.p;
  var [targetId, setTargetId] = useState(null);
  var [note, setNote] = useState("");
  var [includeSummary, setIncludeSummary] = useState(true);
  var [sending, setSending] = useState(false);

  useEffect(function () {
    if (open) { setTargetId(null); setNote(""); setIncludeSummary(true); setSending(false); }
  }, [open]);

  function send() {
    if (!targetId) { toast.error(t("referral.selectDoctor")); return; }
    setSending(true);
    setTimeout(function () {
      setSending(false);
      toast.success(t("referral.sent"));
      onOpenChange(false);
    }, 600);
  }

  /* Exclude the demo doctor (d1) from the recipient list so the doctor
   * cannot refer to themselves. */
  var recipients = MCData.doctors.filter(function (d) { return d.id !== "d1"; });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("referral.title")}</DialogTitle>
        <DialogDescription>{t("referral.subtitle")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {sourceCase && (
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="font-semibold text-foreground">{t("referral.caseFile")}</div>
            <p className="mt-1 line-clamp-2 text-muted-foreground">{p(sourceCase.title)}</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label>{t("referral.selectDoctor")}</Label>
          <Select value={targetId} onValueChange={setTargetId} placeholder={t("referral.selectDoctor")}>
            {recipients.map(function (d) {
              return <SelectItem key={d.id} value={d.id}>{p(d.nameDisplay)} — {p(MCData.getSpecialty(d.specialtyId).name)}</SelectItem>;
            })}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("referral.reason")}</Label>
          <Textarea value={note} onChange={function (e) { setNote(e.target.value); }} placeholder={t("referral.reason")} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/70 p-3">
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" className="size-4 text-teal-600" />
            <span className="text-sm">{t("referral.includeSummary")}</span>
          </div>
          <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={function () { onOpenChange(false); }}>{t("gen.cancel")}</Button>
        <Button onClick={send} disabled={sending} className="bg-teal-600 hover:bg-teal-700">
          {sending ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="Send" className="size-4" />}
          {t("referral.send")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ===================================================================
   F5. PatientSummaryModal — AI-generated instant patient summary
   -------------------------------------------------------------------
   Renders MCData.patientSummary as structured cards (summary text, key
   findings, recommendations). Triggered by DoctorSearch (when a patient
   has granted QR access) and DoctorHome (when accepting an access req). */
function PatientSummaryModal(_a) {
  var open = _a.open, onOpenChange = _a.onOpenChange;
  var _b = useT(); var t = _b.t, p = _b.p;
  var s = MCData.patientSummary;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon name="Sparkles" className="size-5 text-teal-600" />
          {t("search.instantSummary")}
        </DialogTitle>
        <DialogDescription>{t("search.summaryDesc")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {/* Patient header */}
        <div className="flex items-center gap-3 rounded-md bg-muted/40 p-3">
          <DoctorAvatar initials="ر" gradient="from-teal-400 to-emerald-500" />
          <div>
            <div className="font-semibold">{p(s.patientName)}</div>
            <div className="text-xs text-muted-foreground">{p(s.ageGender)}</div>
          </div>
        </div>
        {/* Narrative summary */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon name="FileText" className="size-4 text-teal-600" />
            <span>{p({ en: "AI Summary", ar: "ملخص الذكي" })}</span>
          </div>
          <p className="text-sm text-muted-foreground">{p(s.summary)}</p>
        </Card>
        {/* Two-column findings + recommendations */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">{p({ en: "Key Findings", ar: "النتائج الرئيسية" })}</div>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {s.keyFindings.map(function (k, i) {
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="CircleDot" className="mt-0.5 size-3 shrink-0 text-teal-600" />
                    <span>{p(k)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">{p({ en: "Recommendations", ar: "التوصيات" })}</div>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {s.recommendations.map(function (r, i) {
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="ArrowRight" className="mt-0.5 size-3 shrink-0 text-teal-600" />
                    <span>{p(r)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={function () { onOpenChange(false); }}>{t("gen.close")}</Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ===================================================================
   F6. Layout helpers — SectionTitle, StatCard, QuickAction
   ------------------------------------------------------------------- */

/* SectionTitle — heading row with optional icon + optional action link.
   Used at the top of every card group on patient/doctor dashboards. */
function SectionTitle(_a) {
  var title = _a.title, icon = _a.icon, action = _a.action, onAction = _a.onAction;
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon && <Icon name={icon} className="size-4 text-teal-600" />}
        {title}
      </h2>
      {action && (
        <Button variant="ghost" size="sm" onClick={onAction} className="text-teal-700">
          {action}
          <Icon name="ChevronRight" className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/* StatCard — small KPI tile (icon + value + sub delta + label). */
function StatCard(_a) {
  var icon = _a.icon, label = _a.label, value = _a.value, sub = _a.sub, tone = _a.tone;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", tone || "bg-teal-50 text-teal-600")}>
          <Icon name={icon} className="size-[18px]" />
        </span>
        {sub && <span className="text-[11px] font-medium text-teal-700">{sub}</span>}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
    </Card>
  );
}

/* QuickAction — square tile with icon + label, used on the patient home
   quick-actions row. The whole tile is a button. */
function QuickAction(_a) {
  var icon = _a.icon, label = _a.label, onClick = _a.onClick, tone = _a.tone;
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-2 rounded-lg border border-border/70 bg-card p-3 text-start transition-all hover:border-teal-300 hover:shadow-sm">
      <span className={cn("grid size-9 place-items-center rounded-lg", tone || "bg-teal-50 text-teal-600")}>
        <Icon name={icon} className="size-[18px]" />
      </span>
      <span className="text-xs font-medium leading-snug">{label}</span>
    </button>
  );
}

/* ===================================================================
   G. AUTH + VERIFICATION
   ------------------------------------------------------------------- */

/* TopBar — application header. Brand + language toggle + user dropdown.
   CRITICAL: there is NO role switcher pill here. Role is set once at
   login and never mutated; switching interfaces requires sign-out +
   sign-in with the other account. The dropdown only exposes Sign Out. */
function TopBar(_a) {
  var onMenuClick = _a.onMenuClick;
  var _b = useT(); var t = _b.t, lang = _b.lang;
  var user = useStore(function (s) { return s.user; });
  var toggleLang = useStore(function (s) { return s.toggleLang; });
  var logout = useStore(function (s) { return s.logout; });
  var initials = user ? user.name.split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2) : "?";
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      {/* Mobile menu button — opens the Sheet drawer (AppShell owns it). */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Icon name="Menu" className="size-5" />
      </Button>
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-sm">
          <Icon name="HeartPulse" className="size-5" />
        </span>
        <div className="hidden sm:block">
          <div className="text-sm font-bold leading-tight">{t("brand.name")}</div>
          <div className="text-[10px] leading-tight text-muted-foreground">{t("brand.tagline")}</div>
        </div>
      </div>
      <div className="ms-auto flex items-center gap-2">
        {/* Language toggle — flips store.lang, which also flips <html dir>. */}
        <Button variant="outline" size="sm" onClick={toggleLang}>
          <Icon name="Languages" className="size-3.5" />
          <span>{lang === "en" ? "العربية" : "English"}</span>
        </Button>
        {/* User dropdown — email label + Sign Out only (no role switcher). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <button className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 transition-colors hover:bg-accent">
              <Avatar className="size-7">
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-sky-500 text-[10px] font-bold text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium sm:inline">{user && user.name}</span>
              <Icon name="ChevronDown" className="size-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user && user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <Icon name="LogOut" className="size-4" />
              {t("topbar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* AppShell — wraps every authenticated screen.
   Renders TopBar, the desktop nav rail (lg+) / mobile Sheet drawer, and
   the sticky Footer. The same `nav` list drives both layouts. min-h-screen
   flex-col + mt-auto footer ensures the footer hugs the viewport bottom
   when content is short and pushes down naturally when content overflows. */
function AppShell(_a) {
  var active = _a.active, onNavigate = _a.onNavigate, nav = _a.nav, children = _a.children;
  var t = useT().t;
  var [drawerOpen, setDrawerOpen] = useState(false);
  /* NavList is reused by both the desktop aside and the mobile Sheet so
   * the only difference is the container. Selecting an item closes the
   * mobile drawer. */
  function NavList() {
    return (
      <nav className="flex flex-col gap-1 p-3">
        {nav.map(function (item) {
          var isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={function () { onNavigate(item.key); setDrawerOpen(false); }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-teal-50 text-teal-700" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon name={item.icon} className="size-4" />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>
    );
  }
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar onMenuClick={function () { setDrawerOpen(true); }} />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-e border-border bg-card lg:block">
          <NavList />
        </aside>
        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent>
            <SheetTitle>{t("brand.name")}</SheetTitle>
            <NavList />
          </SheetContent>
        </Sheet>
        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

/* Footer — sticky bottom strip. mt-auto (inherited from AppShell's flex
 * column) keeps it pinned to the viewport bottom when content is short. */
function Footer() {
  var t = useT().t;
  return (
    <footer className="mt-auto border-t border-border bg-card px-4 py-4 text-xs text-muted-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">{t("brand.name")}</span>
          <span>— {t("footer.disclaimer")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a className="hover:text-foreground" href="#">{t("footer.about")}</a>
          <a className="hover:text-foreground" href="#">{t("footer.privacy")}</a>
          <a className="hover:text-foreground" href="#">{t("footer.terms")}</a>
          <a className="hover:text-foreground" href="#">{t("footer.contact")}</a>
          <span className="text-muted-foreground/70">© 2024 — {t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}

/* AuthScreen — login + signup form + three demo buttons.
   Demo Patient        -> immediate patient login (verified-by-default).
   Demo Doctor         -> immediate verified-doctor login (lands in DoctorApp).
   Test Verification   -> doctor login with verified=false so Router
                          renders DoctorVerification (the pending flow). */
function AuthScreen() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var login = useStore(function (s) { return s.login; });
  var [mode, setMode] = useState("login");
  var [role, setRole] = useState("patient");
  var [name, setName] = useState("");
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [submitting, setSubmitting] = useState(false);

  function submit() {
    setSubmitting(true);
    setTimeout(function () {
      setSubmitting(false);
      var user = { name: name || (role === "doctor" ? "Dr. New Applicant" : "New Patient"), email: email || "user@medconnect.app" };
      if (role === "patient") {
        login("patient", user);
      } else {
        /* A fresh doctor signup ALWAYS enters verification (not pre-verified)
         * so the new doctor walks through DoctorVerification. */
        login("doctor", user, { verified: false });
      }
    }, 500);
  }

  function demoPatient() {
    var a = MCData.DEMO_ACCOUNTS.patient;
    login("patient", { name: a.name, email: a.email });
  }
  function demoDoctor() {
    var a = MCData.DEMO_ACCOUNTS.doctor;
    login("doctor", { name: a.name, email: a.email }, { creds: a.doctorCreds, verified: true });
  }
  function testVerification() {
    login("doctor", { name: "Dr. New Applicant", email: "new.doctor@medconnect.app" }, { verified: false });
  }

  var features = [
    { key: "auth.featureVerified", icon: "BadgeCheck" },
    { key: "auth.featureQR", icon: "QrCode" },
    { key: "auth.featureAI", icon: "Sparkles" },
    { key: "auth.featureCommunity", icon: "Users" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 via-background to-sky-50 lg:flex-row">
      {/* Marketing panel */}
      <div className="flex flex-1 flex-col justify-center p-8 lg:p-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-md">
              <Icon name="HeartPulse" className="size-7" />
            </span>
            <div>
              <div className="text-xl font-extrabold">{t("brand.name")}</div>
              <div className="text-xs text-muted-foreground">{t("brand.tagline")}</div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight">{t("auth.welcome")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {features.map(function (f) {
              return (
                <div key={f.key} className="flex items-start gap-2 rounded-lg border border-border/70 bg-card p-3">
                  <Icon name={f.icon} className="mt-0.5 size-4 text-teal-600" />
                  <span className="text-xs font-medium">{t(f.key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Auth panel */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md p-6">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-lg font-bold">{mode === "login" ? t("auth.login") : t("auth.signup")}</h2>
            <p className="text-xs text-muted-foreground">{t("auth.subtitle")}</p>
          </div>
          {/* Role selector — Patient vs Doctor (two-card toggle). */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button onClick={function () { setRole("patient"); }} className={cn("flex flex-col items-start gap-0.5 rounded-md border p-3 text-start transition-all", role === "patient" ? "border-teal-300 bg-teal-50" : "border-border hover:border-teal-200")}>
              <Icon name="User" className="size-4 text-teal-600" />
              <span className="text-sm font-semibold">{t("auth.rolePatient")}</span>
              <span className="text-[10px] text-muted-foreground">{t("auth.rolePatientDesc")}</span>
            </button>
            <button onClick={function () { setRole("doctor"); }} className={cn("flex flex-col items-start gap-0.5 rounded-md border p-3 text-start transition-all", role === "doctor" ? "border-teal-300 bg-teal-50" : "border-border hover:border-teal-200")}>
              <Icon name="Stethoscope" className="size-4 text-teal-600" />
              <span className="text-sm font-semibold">{t("auth.roleDoctor")}</span>
              <span className="text-[10px] text-muted-foreground">{t("auth.roleDoctorDesc")}</span>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("auth.name")}</Label>
                <Input value={name} onChange={function (e) { setName(e.target.value); }} placeholder={t("auth.name")} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("auth.password")}</Label>
              <Input type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} placeholder="••••••••" />
            </div>
            <Button onClick={submit} disabled={submitting} className="mt-1 bg-teal-600 hover:bg-teal-700">
              {submitting ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="ArrowRight" className="size-4" />}
              {mode === "login" ? t("auth.continue") : t("auth.createAccount")}
            </Button>
          </div>
          <button onClick={function () { setMode(mode === "login" ? "signup" : "login"); }} className="mt-3 w-full text-center text-xs text-teal-700 hover:underline">
            {mode === "login" ? t("auth.toggleToSignup") : t("auth.toggleToLogin")}
          </button>
          {/* Demo buttons — one-click access for offline testing. */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-[11px] text-muted-foreground">{t("auth.demoHint")}</div>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" size="sm" onClick={demoPatient}>
                <Icon name="User" className="size-3.5" />
                {t("auth.demoPatient")}
              </Button>
              <Button variant="outline" size="sm" onClick={demoDoctor}>
                <Icon name="Stethoscope" className="size-3.5" />
                {t("auth.demoDoctor")}
              </Button>
              <Button variant="secondary" size="sm" onClick={testVerification}>
                <Icon name="ShieldCheck" className="size-3.5" />
                {t("auth.testVerification")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* DoctorVerification — two visual states.
   form     -> credential submission form (license, specialty, years,
               clinic, certificate upload).
   pending  -> "Verification Pending" review screen with a Demo Approve
               button (calls actions.approveDoctor -> authenticated). */
function DoctorVerification() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var creds = useStore(function (s) { return s.doctorCreds; });
  var submitVerification = useStore(function (s) { return s.submitDoctorVerification; });
  var approve = useStore(function (s) { return s.approveDoctor; });
  var reset = useStore(function (s) { return s.resetVerification; });
  var logout = useStore(function (s) { return s.logout; });
  /* Form state — each useState is ONE call. Pre-fill from store creds so
   * a returning pending-doctor sees their submitted values. */
  var [license, setLicense] = useState((creds && creds.license) || "");
  var [specialty, setSpecialty] = useState((creds && creds.specialty) || "");
  var [years, setYears] = useState((creds && creds.yearsExp) || "");
  var [clinic, setClinic] = useState((creds && creds.clinic) || "");
  var [fileName, setFileName] = useState((creds && creds.fileName) || "");
  var [submitting, setSubmitting] = useState(false);

  /* Show the pending review screen once creds are on file. */
  var hasCreds = !!(creds && creds.license);

  function submit() {
    if (!license || !specialty || !clinic) { toast.error(t("verify.subtitle")); return; }
    setSubmitting(true);
    setTimeout(function () {
      setSubmitting(false);
      submitVerification({ license: license, specialty: specialty, yearsExp: years, clinic: clinic, fileName: fileName });
      toast.success(t("verify.pendingTitle"));
    }, 600);
  }

  if (hasCreds) {
    /* ---- Pending state ---- */
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-background to-teal-50 p-6">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700">
            <Icon name="Clock3" className="size-8" />
          </div>
          <h1 className="text-lg font-bold">{t("verify.pendingTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("verify.pendingBody")}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <Icon name="Clock3" className="size-3.5" />
            <span>{t("verify.pendingEstimate")}</span>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={approve} className="bg-teal-600 hover:bg-teal-700">
              <Icon name="ShieldCheck" className="size-4" />
              {t("verify.demoApprove")}
            </Button>
            <Button variant="outline" onClick={reset}>
              <Icon name="PencilLine" className="size-4" />
              {t("verify.resubmit")}
            </Button>
            <Button variant="ghost" onClick={logout}>
              <Icon name="LogOut" className="size-4" />
              {t("verify.logout")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ---- Form state ---- */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-background to-sky-50 p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white">
            <Icon name="ShieldCheck" className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold">{t("verify.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("verify.subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("verify.license")}</Label>
            <Input value={license} onChange={function (e) { setLicense(e.target.value); }} placeholder="MED-LIC-XXXXX" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("verify.specialty")}</Label>
            <Select value={specialty} onValueChange={setSpecialty} placeholder={t("verify.selectSpecialty")}>
              {MCData.specialties.map(function (s) {
                return <SelectItem key={s.id} value={s.id}>{p(s.name)}</SelectItem>;
              })}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("verify.yearsExp")}</Label>
            <Input type="number" value={years} onChange={function (e) { setYears(e.target.value); }} placeholder="10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("verify.clinic")}</Label>
            <Input value={clinic} onChange={function (e) { setClinic(e.target.value); }} placeholder={t("verify.clinic")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("verify.upload")}</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground transition-colors hover:border-teal-300 hover:bg-teal-50">
              <Icon name="Upload" className="size-4 text-teal-600" />
              <span className="flex-1 truncate">{fileName || t("verify.uploadHint")}</span>
              <input type="file" className="hidden" onChange={function (e) { setFileName(e.target.files && e.target.files[0] ? e.target.files[0].name : ""); }} />
            </label>
          </div>
          <Button onClick={submit} disabled={submitting} className="mt-1 bg-teal-600 hover:bg-teal-700">
            {submitting ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="Send" className="size-4" />}
            {submitting ? t("verify.submitting") : t("verify.submit")}
          </Button>
          <Button variant="ghost" onClick={logout} className="text-muted-foreground">
            <Icon name="LogOut" className="size-4" />
            {t("verify.logout")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ===================================================================
   H. PATIENT INTERFACE
   ------------------------------------------------------------------- */

/* PatientHome — dashboard.
   - Greeting + vitals grid (Heart Rate, BP, Steps, Sleep).
   - Quick-actions row (Share QR, Ask AI, Find Doctor, Community).
   - Upcoming appointments (merged: ApiService.getAppointments() newest
     first + MCData.patientAppointments mock data).
   - Health update alert cards (tone-coloured icons).
   - Featured verified doctors with onBook -> BookingModal.
   QrAccessModal lives here; BookingModal state is owned by PatientApp
   and reached via the onBookDoctor callback. */
function PatientHome(_a) {
  var onNavigate = _a.onNavigate, onBookDoctor = _a.onBookDoctor;
  var _b = useT(); var t = _b.t, p = _b.p;
  var user = useStore(function (s) { return s.user; });
  var [qrOpen, setQrOpen] = useState(false);

  function loadAppointments() {
    var saved = ApiService.getAppointments();
    return saved.concat(MCData.patientAppointments).slice(0, 6);
  }
  var [appointments, setAppointments] = useState(loadAppointments);

  useEffect(function () {
    function refreshAppointments() {
      setAppointments(loadAppointments());
    }
    window.addEventListener("mc:appointments-updated", refreshAppointments);
    return function () {
      window.removeEventListener("mc:appointments-updated", refreshAppointments);
    };
  }, []);

  var featured = MCData.doctors.slice(0, 6);

  /* Tone classes for health-update alert icons. */
  var toneClasses = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-600",
  };

  var quickActions = [
    { icon: "QrCode", label: t("patient.qaShareRecord"), tone: "bg-teal-50 text-teal-600", onClick: function () { setQrOpen(true); } },
    { icon: "Sparkles", label: t("patient.qaAskAI"), tone: "bg-fuchsia-50 text-fuchsia-600", onClick: function () { onNavigate("search"); } },
    { icon: "Stethoscope", label: t("patient.qaFindDoctor"), tone: "bg-sky-50 text-sky-600", onClick: function () { onNavigate("search"); } },
    { icon: "Users", label: t("patient.qaCommunity"), tone: "bg-violet-50 text-violet-600", onClick: function () { onNavigate("community"); } },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("patient.greeting")}, {user && user.name}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Here's your health overview for today.", ar: "إليك نظرة عامة على صحتك اليوم." })}</p>
      </div>
      {/* Vitals grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MCData.vitals.map(function (v) {
          return (
            <Card key={v.id} className="p-4">
              <div className="flex items-center justify-between">
                <Icon name={v.icon} className={cn("size-5", v.tone)} />
                <span className="text-[10px] font-medium text-muted-foreground">{v.trend}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold">{p(v.value)}</span>
                <span className="text-[11px] text-muted-foreground">{p(v.unit)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{p(v.label)}</div>
            </Card>
          );
        })}
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map(function (qa, i) {
          return <QuickAction key={i} icon={qa.icon} label={qa.label} tone={qa.tone} onClick={qa.onClick} />;
        })}
      </div>
      {/* Appointments + health updates (2/3 + 1/3 on lg) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title={t("patient.upcomingAppts")} icon="CalendarClock" action={t("patient.viewAll")} onAction={function () { onNavigate("record"); }} />
          <div className="flex flex-col gap-3">
            {appointments.map(function (appt) {
              var doc = MCData.getDoctor(appt.doctorId);
              return (
                <Card key={appt.id} className="flex items-center gap-3 p-4">
                  {doc && <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-10 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold">{doc ? p(doc.nameDisplay) : p({ en: "Doctor", ar: "طبيب" })}</h3>
                      {doc && doc.verified && <VerifiedBadge />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{p(appt.type)}</p>
                    {appt.notes && <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">{"\"" + appt.notes + "\""}</p>}
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-semibold">{p(appt.time)}</div>
                    <div className="text-[11px] text-muted-foreground">{p(appt.date)}</div>
                    <Badge variant="outline" className={cn("mt-1", p(appt.status) === p({ en: "Confirmed", ar: "مؤكد" }) ? "border-teal-200 bg-teal-50 text-teal-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{p(appt.status)}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
        <section>
          <SectionTitle title={t("patient.healthUpdates")} icon="Bell" />
          <div className="flex flex-col gap-3">
            {MCData.healthUpdates.map(function (u) {
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClasses[u.tone])}>
                      <Icon name={u.icon} className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">{p(u.title)}</h3>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{p(u.time)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p(u.body)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
      {/* Featured doctors */}
      <section>
        <SectionTitle title={t("patient.featuredDoctors")} icon="Stethoscope" action={t("patient.viewAll")} onAction={function () { onNavigate("search"); }} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(function (d) {
            return <DoctorCard key={d.id} doctor={d} onBook={function () { onBookDoctor(d); }} />;
          })}
        </div>
      </section>
      <QrAccessModal open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}

/* PatientHealthRecord — Smart Health Record.
   - Document list (MCData.healthDocs) with type/date/size/accessed-by.
   - "Generate Temporary Access" -> QrAccessModal.
   - Active/expired access sessions (MCData.accessSessions) with revoke. */
function PatientHealthRecord() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var [qrOpen, setQrOpen] = useState(false);
  var [sessions, setSessions] = useState(MCData.accessSessions);

  function revoke(id) {
    setSessions(function (arr) {
      return arr.map(function (s) { return s.id === id ? Object.assign({}, s, { status: "expired" }) : s; });
    });
    toast.success(p({ en: "Access revoked", ar: "تم إلغاء الوصول" }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("record.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("record.subtitle")}</p>
      </div>
      {/* Generate-access banner */}
      <Card className="flex flex-col items-start gap-3 bg-gradient-to-br from-teal-50 to-sky-50 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-sm">
          <Icon name="QrCode" className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{t("record.generateQR")}</h2>
          <p className="text-xs text-muted-foreground">{t("record.qrDesc")}</p>
        </div>
        <Button onClick={function () { setQrOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
          <Icon name="KeyRound" className="size-4" />
          {t("record.generateQR")}
        </Button>
      </Card>
      {/* Documents */}
      <section>
        <SectionTitle title={t("record.documents")} icon="FolderOpen" action={t("record.upload")} onAction={function () { toast.success(p({ en: "Upload dialog (demo)", ar: "حوار الرفع (تجريبي)" })); }} />
        <div className="grid gap-3 sm:grid-cols-2">
          {MCData.healthDocs.map(function (doc) {
            var docDoctor = MCData.getDoctor(doc.doctorId);
            return (
              <Card key={doc.id} className="flex items-center gap-3 p-4">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", doc.tone)}>
                  <Icon name={doc.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{p(doc.name)}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span>{p(doc.type)}</span>
                    <span>·</span>
                    <span>{p(doc.date)}</span>
                    <span>·</span>
                    <span>{doc.size}</span>
                  </div>
                  {docDoctor && <div className="mt-1 text-[11px] font-medium text-teal-700">{t("record.accessedBy")} {p(docDoctor.nameDisplay)}</div>}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Icon name="Download" className="size-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
      {/* Active sessions */}
      <section>
        <SectionTitle title={t("record.activeAccess")} icon="KeyRound" />
        <div className="flex flex-col gap-3">
          {sessions.length === 0 && <Card className="p-4 text-sm text-muted-foreground">{t("record.noDocs")}</Card>}
          {sessions.map(function (s) {
            var doc = MCData.getDoctor(s.doctorId);
            var active = s.status === "active";
            return (
              <Card key={s.id} className="flex items-center gap-3 p-4">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", active ? "bg-teal-50 text-teal-600" : "bg-muted text-muted-foreground")}>
                  <Icon name={active ? "ShieldCheck" : "Lock"} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold">{doc ? p(doc.nameDisplay) : p({ en: "Doctor", ar: "طبيب" })}</h3>
                    {doc && doc.verified && <VerifiedBadge />}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    <span>{p(s.createdAt)}</span>
                    <span> · </span>
                    <span className={active ? "text-teal-700" : "text-amber-700"}>{p(s.expiresAt)}</span>
                  </div>
                </div>
                {active && <Button variant="outline" size="sm" onClick={function () { revoke(s.id); }} className="text-rose-600 hover:bg-rose-50">{t("record.revoke")}</Button>}
              </Card>
            );
          })}
        </div>
      </section>
      <QrAccessModal open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}

/* PatientSearch — two-tab search.
   Tab "manual": filter by specialty / location / min rating.
   Tab "ai":     type a symptom -> retrieves MCData.preAnswered
                 (doctor-verified solutions) + recommended specialists. */
function PatientSearch(_a) {
  var onBookDoctor = _a.onBookDoctor;
  var _b = useT(); var t = _b.t, p = _b.p;
  var [tab, setTab] = useState("manual");
  /* Manual filter state */
  var [specialtyId, setSpecialtyId] = useState("all");
  var [location, setLocation] = useState("all");
  var [minRating, setMinRating] = useState("0");
  /* AI state */
  var [query, setQuery] = useState("");
  var [analyzing, setAnalyzing] = useState(false);
  var [results, setResults] = useState(null);

  /* Apply manual filters (memoised so the list only recomputes on filter change). */
  var filtered = useMemo(function () {
    return MCData.doctors.filter(function (d) {
      if (specialtyId !== "all" && d.specialtyId !== specialtyId) return false;
      if (location !== "all" && p(d.location) !== location) return false;
      if (Number(d.rating) < Number(minRating)) return false;
      return true;
    });
  }, [specialtyId, location, minRating]);

  function askAI() {
    if (!query.trim()) return;
    setAnalyzing(true);
    setResults(null);
    /* Simulated retrieval: keyword match against preAnswered questions.
     * Falls back to the first two pre-answered entries if no match. */
    setTimeout(function () {
      var q = query.toLowerCase();
      var firstWord = q.split(/\s+/)[0];
      var matched = MCData.preAnswered.filter(function (pa) {
        var blob = (pa.question.en + pa.question.ar + pa.tags.map(function (tag) { return tag.en; }).join(" ")).toLowerCase();
        return blob.indexOf(firstWord) > -1;
      });
      if (!matched.length) matched = MCData.preAnswered.slice(0, 2);
      setResults(matched);
      setAnalyzing(false);
    }, 800);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.search")}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Find a verified doctor or get AI guidance.", ar: "اعثر على طبيب موثّق أو احصل على إرشاد ذكي." })}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="manual"><Icon name="Search" className="size-3.5" /> {t("search.manual")}</TabsTrigger>
          <TabsTrigger value="ai"><Icon name="Sparkles" className="size-3.5" /> {t("search.ai")}</TabsTrigger>
        </TabsList>
        {/* ---- Manual search ---- */}
        <TabsContent value="manual" className="mt-4">
          <div className="flex flex-col gap-4">
            <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("search.specialty")}</Label>
                <Select value={specialtyId} onValueChange={setSpecialtyId} placeholder={t("search.allSpecialties")}>
                  <SelectItem value="all">{t("search.allSpecialties")}</SelectItem>
                  {MCData.specialties.map(function (s) { return <SelectItem key={s.id} value={s.id}>{p(s.name)}</SelectItem>; })}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("search.location")}</Label>
                <Select value={location} onValueChange={setLocation} placeholder={t("search.allLocations")}>
                  <SelectItem value="all">{t("search.allLocations")}</SelectItem>
                  {MCData.locations.map(function (l, i) { return <SelectItem key={i} value={l.en}>{p(l)}</SelectItem>; })}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("search.rating")}</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectItem value="0">{p({ en: "Any rating", ar: "أي تقييم" })}</SelectItem>
                  <SelectItem value="4.5">4.5+</SelectItem>
                  <SelectItem value="4.7">4.7+</SelectItem>
                  <SelectItem value="4.8">4.8+</SelectItem>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={function () { toast.success(filtered.length + " " + t("search.results")); }} className="w-full bg-teal-600 hover:bg-teal-700">
                  <Icon name="Filter" className="size-4" />
                  {t("search.apply")}
                </Button>
              </div>
            </Card>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} {t("search.results")}</span>
            </div>
            {filtered.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">{t("search.noResults")}</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(function (d) {
                  return <DoctorCard key={d.id} doctor={d} onBook={function () { onBookDoctor(d); }} />;
                })}
              </div>
            )}
          </div>
        </TabsContent>
        {/* ---- AI smart search ---- */}
        <TabsContent value="ai" className="mt-4">
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <Label className="mb-1.5 block">{t("search.askPlaceholder")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={query} onChange={function (e) { setQuery(e.target.value); }} placeholder={t("search.askPlaceholder")} onKeyDown={function (e) { if (e.key === "Enter") askAI(); }} />
                <Button onClick={askAI} disabled={analyzing} className="bg-teal-600 hover:bg-teal-700">
                  {analyzing ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="Sparkles" className="size-4" />}
                  {analyzing ? t("search.analyzing") : t("search.ask")}
                </Button>
              </div>
            </Card>
            {results && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionTitle title={t("search.preAnsweredTitle")} icon="BadgeCheck" />
                  <p className="-mt-2 mb-3 text-xs text-muted-foreground">{t("search.preAnsweredDesc")}</p>
                  <div className="flex flex-col gap-3">
                    {results.map(function (pa) {
                      var doc = MCData.getDoctor(pa.doctorId);
                      return (
                        <Card key={pa.id} className="p-4">
                          <p className="text-sm font-semibold">{p(pa.question)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{p(pa.answer)}</p>
                          <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2">
                            {doc && <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-6 text-[10px]" />}
                            <span className="text-[11px] font-medium">{doc ? p(doc.nameDisplay) : ""}</span>
                            {doc && doc.verified && <VerifiedBadge />}
                            <span className="text-[11px] text-muted-foreground">{t("search.approvedBy")} {doc ? p(MCData.getSpecialty(doc.specialtyId).name) : ""}</span>
                            <span className="ms-auto text-[11px] text-muted-foreground">▲ {pa.upvotes}</span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <SectionTitle title={t("search.recommendedDocs")} icon="Stethoscope" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {MCData.doctors.slice(0, 3).map(function (d) {
                      return <DoctorCard key={d.id} doctor={d} onBook={function () { onBookDoctor(d); }} />;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* PatientCommunity — public feed of verified articles/videos/images by
   specialty channel + a Q&A board. Patients can read but not post. */
function PatientCommunity() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var [channel, setChannel] = useState("all");
  /* Build the channel chip list: "All" + every specialty. */
  var channels = [{ id: "all", name: { en: "All", ar: "الكل" } }].concat(
    MCData.specialties.map(function (s) { return { id: s.id, name: s.name }; })
  );
  var posts = MCData.communityPosts.filter(function (c) { return channel === "all" || c.channelId === channel; });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.community")}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Verified articles, videos and Q&A from doctors.", ar: "مقالات وفيديوهات وأسئلة موثّقة من الأطباء." })}</p>
      </div>
      {/* Channel chips */}
      <div className="flex flex-wrap gap-2">
        {channels.map(function (c) {
          return (
            <button key={c.id} onClick={function () { setChannel(c.id); }} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", channel === c.id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border text-muted-foreground hover:bg-accent")}>
              {p(c.name)}
            </button>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Posts (2/3) */}
        <section className="lg:col-span-2">
          <SectionTitle title={p({ en: "Featured Content", ar: "محتوى مميز" })} icon="Newspaper" />
          <div className="grid gap-3 sm:grid-cols-2">
            {posts.map(function (c) {
              var doc = MCData.getDoctor(c.doctorId);
              return (
                <Card key={c.id} className="overflow-hidden">
                  <div className={cn("relative flex h-28 items-center justify-center bg-gradient-to-br text-white", c.mediaGradient)}>
                    <Icon name={c.mediaIcon} className="size-10 opacity-80" />
                    <Badge className="absolute end-2 top-2 bg-white/20 text-white">{c.type}</Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold leading-snug">{p(c.title)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{p(c.excerpt)}</p>
                    <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      {doc && <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-5 text-[9px]" />}
                      <span className="truncate font-medium">{doc ? p(doc.nameDisplay) : ""}</span>
                      {doc && doc.verified && <VerifiedBadge />}
                      <span className="ms-auto">▲ {c.upvotes}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
        {/* Q&A (1/3) */}
        <section>
          <SectionTitle title={p({ en: "Questions & Answers", ar: "أسئلة وأجوبة" })} icon="MessagesSquare" />
          <div className="flex flex-col gap-3">
            {MCData.qaItems.map(function (q) {
              var ans = q.answers && q.answers[0];
              var doc = ans ? MCData.getDoctor(ans.doctorId) : null;
              return (
                <Card key={q.id} className="p-4">
                  <p className="text-sm font-semibold">{p(q.question)}</p>
                  <div className="mt-1 text-[11px] text-muted-foreground">{p(q.askedBy)} · {p(q.time)}</div>
                  {ans && (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                      <p className="text-foreground/90">{p(ans.body)}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {doc && <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-4 text-[8px]" />}
                        <span className="font-medium">{doc ? p(doc.nameDisplay) : ""}</span>
                        {ans.peerVerified && <VerifiedBadge />}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/* PatientProfile — personal details, privacy controls, language picker.
   All fields are local state; "Save Changes" persists language via the
   store and shows a success toast. */
function PatientProfile() {
  var _a = useT(); var t = _a.t, p = _a.p, lang = _a.lang;
  var user = useStore(function (s) { return s.user; });
  var setLang = useStore(function (s) { return s.setLang; });
  var [name, setName] = useState((user && user.name) || "");
  var [email, setEmail] = useState((user && user.email) || "");
  var [shareRecords, setShareRecords] = useState(true);
  var [communityVisible, setCommunityVisible] = useState(false);
  var [savedPayment, setSavedPayment] = useState(function () { return ApiService.getUserPayment(); });
  var [paymentMethod, setPaymentMethod] = useState(function () {
    var method = ApiService.getUserPayment();
    return method ? method.type : "card";
  });
  var [paymentDetail, setPaymentDetail] = useState(function () {
    var method = ApiService.getUserPayment();
    return method ? method.detail : "";
  });

  function handleSavePayment() {
    var detail = paymentDetail.trim();
    if (!detail) {
      toast.error(p({ en: "Enter your payment detail", ar: "أدخل بيانات الدفع" }));
      return;
    }
    if (paymentMethod === "paypal" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detail)) {
      toast.error(p({ en: "Enter a valid PayPal email", ar: "أدخل بريد PayPal صالحًا" }));
      return;
    }
    var saved = ApiService.saveUserPayment({
      type: paymentMethod,
      detail: detail,
      verified: true,
    });
    if (!saved) {
      toast.error(p({ en: "Could not save payment method", ar: "تعذر حفظ طريقة الدفع" }));
      return;
    }
    setSavedPayment(saved);
    toast.success(p({ en: "Payment method verified and saved", ar: "تم التحقق من طريقة الدفع وحفظها" }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.profile")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.personal")}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <Card className="p-4">
            <SectionTitle title={t("profile.personal")} icon="User" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t("auth.name")}</Label>
                <Input value={name} onChange={function (e) { setName(e.target.value); }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("auth.email")}</Label>
                <Input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} />
              </div>
            </div>
          </Card>
        </section>
        <section>
          <Card className="p-4">
            <SectionTitle title={t("profile.privacy")} icon="Shield" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{p({ en: "Allow temporary record sharing", ar: "السماح بمشاركة السجل مؤقتًا" })}</span>
                <Switch checked={shareRecords} onCheckedChange={setShareRecords} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{p({ en: "Show me in community", ar: "إظهاري في المجتمع" })}</span>
                <Switch checked={communityVisible} onCheckedChange={setCommunityVisible} />
              </div>
            </div>
          </Card>
        </section>
      </div>
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle title={p({ en: "Saved Payment Method", ar: "طريقة الدفع المحفوظة" })} icon="CreditCard" />
          {savedPayment && savedPayment.verified && savedPayment.type === paymentMethod && savedPayment.detail === paymentDetail && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {p({ en: "Verified", ar: "موثّق" })}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{p({ en: "Payment Type", ar: "نوع الدفع" })}</Label>
            <Select value={paymentMethod} onValueChange={function (value) {
              setPaymentMethod(value);
              setPaymentDetail(savedPayment && value === savedPayment.type ? savedPayment.detail : "");
            }}>
              <SelectItem value="card">{p({ en: "Credit Card", ar: "بطاقة ائتمان" })}</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{paymentMethod === "paypal" ? p({ en: "PayPal Email", ar: "بريد PayPal" }) : p({ en: "Card Number", ar: "رقم البطاقة" })}</Label>
            <Input
              type={paymentMethod === "paypal" ? "email" : "text"}
              inputMode={paymentMethod === "card" ? "numeric" : undefined}
              autoComplete={paymentMethod === "card" ? "cc-number" : "email"}
              placeholder={paymentMethod === "paypal" ? "you@example.com" : p({ en: "Enter card number", ar: "أدخل رقم البطاقة" })}
              value={paymentDetail}
              onChange={function (e) { setPaymentDetail(e.target.value); }}
            />
          </div>
        </div>
        <Button onClick={handleSavePayment} className="mt-4 bg-teal-600 hover:bg-teal-700">
          <Icon name="ShieldCheck" className="size-4" />
          {p({ en: "Verify & Save", ar: "تحقق واحفظ" })}
        </Button>
      </Card>
      <Card className="p-4">
        <SectionTitle title={t("profile.language")} icon="Languages" />
        <div className="flex gap-2">
          <button onClick={function () { setLang("en"); }} className={cn("rounded-md border px-4 py-2 text-sm font-medium", lang === "en" ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border")}>English</button>
          <button onClick={function () { setLang("ar"); }} className={cn("rounded-md border px-4 py-2 text-sm font-medium", lang === "ar" ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border")}>العربية</button>
        </div>
      </Card>
      <div>
        <Button onClick={function () { toast.success(t("profile.saved")); }} className="bg-teal-600 hover:bg-teal-700">
          <Icon name="Save" className="size-4" />
          {t("profile.save")}
        </Button>
      </div>
    </div>
  );
}

/* PatientApp — router for the patient interface. Five nav tabs:
   home, healthRecord, search, community, profile.
   Owns the BookingModal state so any screen can open it via onBookDoctor. */
function PatientApp() {
  var [active, setActive] = useState("home");
  var [bookingDoctor, setBookingDoctor] = useState(null);
  var nav = [
    { key: "home", label: "nav.home", icon: "Home" },
    { key: "record", label: "nav.healthRecord", icon: "FileText" },
    { key: "search", label: "nav.search", icon: "Search" },
    { key: "community", label: "nav.community", icon: "Users" },
    { key: "profile", label: "nav.profile", icon: "UserCircle" },
  ];
  return (
    <AppShell active={active} onNavigate={setActive} nav={nav}>
      {active === "home" && <PatientHome onNavigate={setActive} onBookDoctor={setBookingDoctor} />}
      {active === "record" && <PatientHealthRecord />}
      {active === "search" && <PatientSearch onBookDoctor={setBookingDoctor} />}
      {active === "community" && <PatientCommunity />}
      {active === "profile" && <PatientProfile />}
      {bookingDoctor && <BookingModal open={true} onOpenChange={function () { setBookingDoctor(null); }} doctor={bookingDoctor} />}
    </AppShell>
  );
}

/* ===================================================================
   I. DOCTOR INTERFACE
   ------------------------------------------------------------------- */

/* DoctorHome — dashboard.
   - Engagement KPI grid (MCData.doctorMetrics).
   - Today's schedule (MCData.doctorSchedule).
   - Incoming patient access requests (Accept -> PatientSummaryModal).
   - Referral notifications (Open Case File -> ReferralModal). */
function DoctorHome(_a) {
  var onNavigate = _a.onNavigate;
  var _b = useT(); var t = _b.t, p = _b.p;
  var user = useStore(function (s) { return s.user; });
  var [summaryOpen, setSummaryOpen] = useState(false);
  var [referralCase, setReferralCase] = useState(null);

  function acceptRequest() {
    toast.success(p({ en: "Access granted", ar: "تم منح الوصول" }));
    setSummaryOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("doctor.greeting")} {user && user.name}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Your patients and updates for today.", ar: "مرضاك وتحديثاتك اليوم." })}</p>
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MCData.doctorMetrics.map(function (m) {
          return <StatCard key={m.id} label={t(m.labelKey)} value={m.value} sub={m.delta} tone="bg-teal-50 text-teal-600" />;
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <section>
          <SectionTitle title={t("doctor.schedule")} icon="CalendarClock" />
          <div className="flex flex-col gap-2">
            {MCData.doctorSchedule.map(function (s) {
              return (
                <Card key={s.id} className="flex items-center gap-3 p-3">
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-sm font-bold">{p(s.time)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p(s.patientName)}</div>
                    <div className="truncate text-xs text-muted-foreground">{p(s.reason)}</div>
                  </div>
                  <Badge variant="outline" className={cn(p(s.status) === p({ en: "Checked in", ar: "وصل" }) ? "border-teal-200 bg-teal-50 text-teal-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{p(s.status)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{s.type === "video" ? t("booking.video") : t("booking.inperson")}</Badge>
                </Card>
              );
            })}
          </div>
        </section>
        {/* Access requests */}
        <section>
          <SectionTitle title={t("doctor.accessRequests")} icon="KeyRound" />
          <div className="flex flex-col gap-3">
            {MCData.accessRequests.length === 0 && <Card className="p-4 text-sm text-muted-foreground">{t("doctor.noRequests")}</Card>}
            {MCData.accessRequests.map(function (r) {
              return (
                <Card key={r.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600">
                      <Icon name="FileText" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p(r.patientName)}</div>
                      <div className="truncate text-xs text-muted-foreground">{p(r.reason)}</div>
                      <div className="mt-0.5 text-[11px] text-amber-700">{p(r.expiresAt)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-[11px] text-muted-foreground">{r.sharedDocs} {p({ en: "docs shared", ar: "مستندات مشتركة" })} · {p(r.time)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={function () { setSummaryOpen(true); }}>
                        <Icon name="Sparkles" className="size-3.5" />
                        {t("doctor.viewSummary")}
                      </Button>
                      <Button size="sm" onClick={acceptRequest} className="bg-teal-600 hover:bg-teal-700">
                        <Icon name="Check" className="size-3.5" />
                        {t("doctor.accept")}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
      {/* Referrals */}
      <section>
        <SectionTitle title={t("doctor.referralNotifs")} icon="Forward" />
        <div className="grid gap-3 sm:grid-cols-2">
          {MCData.referralNotifs.length === 0 && <Card className="p-4 text-sm text-muted-foreground">{t("doctor.noReferrals")}</Card>}
          {MCData.referralNotifs.map(function (r) {
            var fromDoc = MCData.getDoctor(r.fromDoctorId);
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-center gap-3">
                  {fromDoc && <DoctorAvatar initials={fromDoc.initials} gradient={fromDoc.avatarGradient} className="size-10 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{p(r.patientName)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t("doctor.referralFrom")} {fromDoc ? p(fromDoc.nameDisplay) : ""}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{p(r.summary)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end border-t border-border/60 pt-2">
                  <Button size="sm" variant="outline" onClick={function () { setReferralCase({ title: r.summary, summary: r.summary }); }}>
                    <Icon name="FolderOpen" className="size-3.5" />
                    {t("doctor.openCase")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
      <PatientSummaryModal open={summaryOpen} onOpenChange={setSummaryOpen} />
      {referralCase && <ReferralModal open={true} onOpenChange={function () { setReferralCase(null); }} sourceCase={referralCase} />}
    </div>
  );
}

/* DoctorSearch — AI Clinical Assistant + Consultant Mentor Mode.
   Tab "clinical": guideline-filtered clinical references + a Patient
                   Summary trigger (when a patient has granted access).
   Tab "mentor":   upload a report -> ApiService.generateMentorAnalysis
                   returns a 6-card structured analysis + board self-quiz.
                   Falls back to MCData.mentorAnalysis when Gemini is offline. */
function DoctorSearch() {
  var _a = useT(); var t = _a.t, p = _a.p;
  /* Outer tab state */
  var [tab, setTab] = useState("clinical");
  /* Clinical Assistant state */
  var [guidelineFilter, setGuidelineFilter] = useState("all");
  var [summaryOpen, setSummaryOpen] = useState(false);
  /* Mentor Mode state */
  var [reportName, setReportName] = useState("");
  var [analyzing, setAnalyzing] = useState(false);
  var [analysis, setAnalysis] = useState(null);
  var [quizAnswers, setQuizAnswers] = useState({});
  var [showRationale, setShowRationale] = useState({});

  function runAnalysis() {
    setAnalyzing(true);
    setAnalysis(null);
    ApiService.generateMentorAnalysis({ fileName: reportName || "sample-ctg.pdf", type: "Cardiotocography (CTG)" }).then(function (result) {
      setAnalysis(result);
      setAnalyzing(false);
      setQuizAnswers({});
      setShowRationale({});
    });
  }

  /* Immutable-state update helper for the quiz answer map. */
  function answerQuiz(qIdx, optIdx) {
    setQuizAnswers(function (a) { var n = {}; Object.keys(a).forEach(function (k) { n[k] = a[k]; }); n[qIdx] = optIdx; return n; });
    setShowRationale(function (a) { var n = {}; Object.keys(a).forEach(function (k) { n[k] = a[k]; }); n[qIdx] = true; return n; });
  }

  /* Filtered clinical refs by guideline source code. */
  var refs = useMemo(function () {
    if (guidelineFilter === "all") return MCData.clinicalRefs;
    return MCData.clinicalRefs.filter(function (r) { return r.guidelines && r.guidelines.indexOf(guidelineFilter) > -1; });
  }, [guidelineFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.clinicalAssistant")}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "AI-augmented clinical references and consultant-level case analysis.", ar: "مراجع سريرية معزّزة بالذكاء الاصطناعي وتحليل استشاري للحالات." })}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="clinical"><Icon name="BookOpen" className="size-3.5" /> {p({ en: "Clinical Assistant", ar: "المساعد السريري" })}</TabsTrigger>
          <TabsTrigger value="mentor"><Icon name="GraduationCap" className="size-3.5" /> {t("mentor.title")}</TabsTrigger>
        </TabsList>

        {/* ---- Clinical Assistant ---- */}
        <TabsContent value="clinical" className="mt-4">
          <div className="flex flex-col gap-6">
            {/* Patient Summary trigger */}
            <Card className="flex flex-col items-start gap-3 bg-gradient-to-br from-teal-50 to-sky-50 p-4 sm:flex-row sm:items-center">
              <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-sm">
                <Icon name="Sparkles" className="size-6" />
              </span>
              <div className="flex-1">
                <h2 className="text-sm font-semibold">{t("search.instantSummary")}</h2>
                <p className="text-xs text-muted-foreground">{t("search.summaryDesc")}</p>
              </div>
              <Button onClick={function () { setSummaryOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
                <Icon name="Sparkles" className="size-4" />
                {t("search.generateSummary")}
              </Button>
            </Card>
            {/* Clinical references with guideline filter */}
            <div>
              <SectionTitle title={t("search.clinicalRef")} icon="BookMarked" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("gl.filterTitle")}:</span>
                <button onClick={function () { setGuidelineFilter("all"); }} className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", guidelineFilter === "all" ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border text-muted-foreground hover:bg-accent")}>{t("gl.allSources")}</button>
                {MCData.guidelines.map(function (g) {
                  return (
                    <button key={g.code} onClick={function () { setGuidelineFilter(g.code); }} className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", guidelineFilter === g.code ? g.color : "border-border text-muted-foreground hover:bg-accent")}>
                      {g.code}
                    </button>
                  );
                })}
              </div>
              {guidelineFilter !== "all" && <p className="mb-2 text-xs text-muted-foreground">{t("gl.filtered")} {guidelineFilter}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {refs.map(function (r) {
                  var spec = MCData.getSpecialty(r.specialtyId);
                  return (
                    <Card key={r.id} className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium text-white", spec.color)}>{p(spec.name)}</span>
                        <span className="text-[10px] text-muted-foreground">· {r.year}</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug">{p(r.title)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p(r.summary)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border/60 pt-2">
                        <span className="text-[11px] text-muted-foreground">{p(r.source)}</span>
                        <span className="ms-auto text-[11px] text-muted-foreground">{t("gl.aligned")}:</span>
                        {r.guidelines && r.guidelines.map(function (code) {
                          var g = MCData.getGuideline(code);
                          return <span key={code} className={cn("rounded-full border px-1.5 py-0 text-[9px] font-medium", g ? g.color : "")}>{code}</span>;
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ---- Consultant Mentor Mode ---- */}
        <TabsContent value="mentor" className="mt-4">
          <div className="flex flex-col gap-4">
            <Card className="bg-gradient-to-br from-violet-50 to-teal-50 p-4">
              <div className="flex items-start gap-3">
                <Icon name="GraduationCap" className="size-6 shrink-0 text-violet-600" />
                <div>
                  <h2 className="text-sm font-semibold">{t("mentor.title")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("mentor.subtitle")}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:border-teal-300">
                  <Icon name="Upload" className="size-4 text-teal-600" />
                  <span className="flex-1 truncate">{reportName || t("mentor.upload")}</span>
                  <input type="file" className="hidden" onChange={function (e) { setReportName(e.target.files && e.target.files[0] ? e.target.files[0].name : ""); }} />
                </label>
                <Button onClick={runAnalysis} disabled={analyzing} className="bg-teal-600 hover:bg-teal-700">
                  {analyzing ? <Icon name="Loader2" className="size-4 animate-spin" /> : <Icon name="Sparkles" className="size-4" />}
                  {analyzing ? t("mentor.analyzing") : t("mentor.analyzeSample")}
                </Button>
              </div>
            </Card>

            {analysis && (
              <div className="flex flex-col gap-4">
                {/* Report header */}
                <Card className="p-4">
                  <div className="text-[11px] font-medium text-muted-foreground">{t("mentor.reportLabel")}</div>
                  <div className="text-base font-bold">{p(analysis.reportTitle)}</div>
                  <div className="mt-1 text-xs text-teal-700">{p(analysis.reportType)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {analysis.guidelines && analysis.guidelines.map(function (code) {
                      var g = MCData.getGuideline(code);
                      return <span key={code} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", g ? g.color : "")}>{code}</span>;
                    })}
                  </div>
                </Card>

                {/* Card 1 — Pathophysiology */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card1")} icon="Activity" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-emerald-50 p-3">
                      <div className="mb-1 text-xs font-semibold text-emerald-700">{t("mentor.physiology")}</div>
                      <p className="text-xs text-muted-foreground">{p(analysis.pathophysiology.physiology)}</p>
                    </div>
                    <div className="rounded-md bg-rose-50 p-3">
                      <div className="mb-1 text-xs font-semibold text-rose-700">{t("mentor.pathology")}</div>
                      <p className="text-xs text-muted-foreground">{p(analysis.pathophysiology.pathology)}</p>
                    </div>
                  </div>
                </Card>

                {/* Card 2 — Differentials */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card2")} icon="ListTree" />
                  <div className="flex flex-col gap-2">
                    {analysis.differentials.map(function (d, i) {
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-md border border-border/70 p-2">
                          <div className="w-12 shrink-0 text-center">
                            <div className="text-sm font-bold text-teal-700">{d.probability}%</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p(d.dx)}</div>
                            <div className="text-[11px] text-muted-foreground">{t("mentor.severity")}: {p(d.severity)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Card 3 — Actionable Decision */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card3")} icon="Stethoscope" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-rose-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-rose-700"><Icon name="Siren" className="size-3.5" /> {t("mentor.intervene")}</div>
                      <p className="text-xs text-muted-foreground">{p(analysis.decision.intervene)}</p>
                    </div>
                    <div className="rounded-md bg-teal-50 p-3">
                      <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-teal-700"><Icon name="Eye" className="size-3.5" /> {t("mentor.observe")}</div>
                      <p className="text-xs text-muted-foreground">{p(analysis.decision.observe)}</p>
                    </div>
                  </div>
                </Card>

                {/* Card 4 — Guidelines + Pitfalls */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card4")} icon="BookMarked" />
                  <div className="mb-2 rounded-md bg-muted/40 p-3">
                    <div className="mb-1 text-xs font-semibold">{t("mentor.references")}</div>
                    <p className="text-xs text-muted-foreground">{p(analysis.pitfalls.refs)}</p>
                  </div>
                  <div className="text-xs font-semibold">{t("mentor.pitfalls")}</div>
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {analysis.pitfalls.pitfalls.map(function (pf, i) {
                      return (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Icon name="AlertTriangle" className="mt-0.5 size-3 shrink-0 text-amber-600" />
                          <span>{p(pf)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>

                {/* Card 5 — Pearls + Patient script */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card5")} icon="Lightbulb" />
                  <div className="mb-3">
                    <div className="mb-1 text-xs font-semibold">{t("mentor.pearls")}</div>
                    <ul className="flex flex-col gap-1.5">
                      {analysis.pearls.pearls.map(function (pe, i) {
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Icon name="Sparkle" className="mt-0.5 size-3 shrink-0 text-amber-500" />
                            <span>{p(pe)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-md bg-teal-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-teal-700">{t("mentor.patientScript")}</div>
                    <p className="text-xs text-muted-foreground">{p(analysis.pearls.patientScript)}</p>
                  </div>
                </Card>

                {/* Card 6 — Board self-quiz */}
                <Card className="p-4">
                  <SectionTitle title={t("mentor.card6")} icon="HelpCircle" />
                  <p className="mb-3 text-xs text-muted-foreground">{t("mentor.quizHint")}</p>
                  <div className="flex flex-col gap-3">
                    {analysis.quiz.map(function (qz, qi) {
                      var ans = quizAnswers[qi];
                      var reveal = showRationale[qi];
                      var correct = qz.correct;
                      return (
                        <div key={qi} className="rounded-md border border-border/70 p-3">
                          <p className="text-sm font-medium">{p(qz.q)}</p>
                          <div className="mt-2 flex flex-col gap-1.5">
                            {qz.options.map(function (opt, oi) {
                              var selected = ans === oi;
                              var isCorrect = oi === correct;
                              var tone = !selected ? "border-border hover:bg-accent" : (isCorrect ? "border-teal-300 bg-teal-50 text-teal-700" : "border-rose-300 bg-rose-50 text-rose-700");
                              return (
                                <button key={oi} onClick={function () { answerQuiz(qi, oi); }} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs transition-colors", tone)}>
                                  <span className="grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold">{String.fromCharCode(65 + oi)}</span>
                                  <span className="flex-1">{p(opt)}</span>
                                  {selected && isCorrect && <Icon name="Check" className="size-3.5" />}
                                  {selected && !isCorrect && <Icon name="X" className="size-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                          {reveal && (
                            <div className={cn("mt-2 rounded-md p-2 text-xs", ans === correct ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700")}>
                              <span className="font-semibold">{ans === correct ? t("mentor.correct") + " — " : t("mentor.incorrect") + " — "}</span>
                              {t("mentor.rationale")}: {p(qz.rationale)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={function () { setQuizAnswers({}); setShowRationale({}); }} className="mt-3">
                    <Icon name="RotateCcw" className="size-3.5" />
                    {t("mentor.retry")}
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <PatientSummaryModal open={summaryOpen} onOpenChange={setSummaryOpen} />
    </div>
  );
}

/* DoctorCommunity — public feed (same content as PatientCommunity but
   doctors can also publish). For the demo, shows MCData.communityPosts
   filtered by channel + a "New Post" demo button. */
function DoctorCommunity() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var [channel, setChannel] = useState("all");
  var channels = [{ id: "all", name: { en: "All", ar: "الكل" } }].concat(
    MCData.specialties.map(function (s) { return { id: s.id, name: s.name }; })
  );
  var posts = MCData.communityPosts.filter(function (c) { return channel === "all" || c.channelId === channel; });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.communityPublic")}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Publish verified content and answer patient questions.", ar: "انشر محتوى موثّق وأجب عن أسئلة المرضى." })}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {channels.map(function (c) {
          return (
            <button key={c.id} onClick={function () { setChannel(c.id); }} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", channel === c.id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border text-muted-foreground hover:bg-accent")}>
              {p(c.name)}
            </button>
          );
        })}
        <Button size="sm" variant="outline" onClick={function () { toast.success(p({ en: "New post (demo)", ar: "منشور جديد (تجريبي)" })); }} className="ms-auto">
          <Icon name="Plus" className="size-3.5" />
          {p({ en: "New Post", ar: "منشور جديد" })}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(function (c) {
          var doc = MCData.getDoctor(c.doctorId);
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className={cn("relative flex h-28 items-center justify-center bg-gradient-to-br text-white", c.mediaGradient)}>
                <Icon name={c.mediaIcon} className="size-10 opacity-80" />
                <Badge className="absolute end-2 top-2 bg-white/20 text-white">{c.type}</Badge>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold leading-snug">{p(c.title)}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p(c.excerpt)}</p>
                <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  {doc && <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-5 text-[9px]" />}
                  <span className="truncate font-medium">{doc ? p(doc.nameDisplay) : ""}</span>
                  {doc && doc.verified && <VerifiedBadge />}
                  <span className="ms-auto">▲ {c.upvotes} · {p({ en: "comments", ar: "تعليقات" })} {c.comments}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* DoctorForum — peer-reviewed anonymized case repository + surgical tips.
   Sub-tabs:
     cases    -> MCData.forumCases with collaborator suggestions + a
                 "Refer to Specialist" action (opens ReferralModal).
     surgical -> MCData.surgicalTips filtered by surgicalSpecialty, with
                 step-by-step accordions and per-tip upvotes. */
function DoctorForum() {
  var _a = useT(); var t = _a.t, p = _a.p;
  var [tab, setTab] = useState("cases");
  /* Surgical sub-state */
  var [surgicalFilter, setSurgicalFilter] = useState("all");
  var [upvoted, setUpvoted] = useState({});
  /* Forum case referral state */
  var [referralCase, setReferralCase] = useState(null);

  function toggleUpvote(tipId) {
    setUpvoted(function (u) { var n = {}; Object.keys(u).forEach(function (k) { n[k] = u[k]; }); n[tipId] = !n[tipId]; return n; });
  }

  var surgicalSp = [{ id: "all", name: { en: t("surgical.all"), ar: t("surgical.all") }, color: "from-slate-500 to-slate-700" }].concat(MCData.surgicalSpecialties);
  var filteredTips = MCData.surgicalTips.filter(function (tip) { return surgicalFilter === "all" || tip.specialtyId === surgicalFilter; });

  function typeLabel(type) {
    if (type === "video") return t("surgical.video");
    if (type === "trick") return t("surgical.trick");
    return t("surgical.protocol");
  }
  function typeTone(type) {
    if (type === "video") return "border-rose-200 bg-rose-50 text-rose-700";
    if (type === "trick") return "border-teal-200 bg-teal-50 text-teal-700";
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.forumPrivate")}</h1>
        <p className="text-sm text-muted-foreground">{p({ en: "Anonymized case collaboration and surgical tips — verified doctors only.", ar: "تعاون في حالات مجهولة الهوية ونصائح جراحية — للأطباء الموثّقين فقط." })}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="cases"><Icon name="FolderOpen" className="size-3.5" /> {p({ en: "Cases", ar: "الحالات" })}</TabsTrigger>
          <TabsTrigger value="surgical"><Icon name="Scissors" className="size-3.5" /> {t("surgical.tab")}</TabsTrigger>
        </TabsList>

        {/* ---- Cases ---- */}
        <TabsContent value="cases" className="mt-4">
          <div className="flex flex-col gap-3">
            {MCData.forumCases.map(function (fc) {
              return (
                <Card key={fc.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{p(fc.status)}</Badge>
                        {fc.tags && fc.tags.map(function (tag, i) {
                          return <span key={i} className="rounded-full bg-muted px-2 py-0 text-[10px] text-muted-foreground">#{p(tag)}</span>;
                        })}
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug">{p(fc.title)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p(fc.presentation)}</p>
                      <p className="mt-1 text-xs italic text-muted-foreground">{p(fc.protocol)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Icon name="Users" className="size-3.5" />
                      <span>{fc.collaborators} {p({ en: "collaborators", ar: "متشاركون" })}</span>
                      <span>· ▲ {fc.upvotes}</span>
                      <span>· {p(fc.time)}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={function () { setReferralCase({ title: fc.title, summary: fc.presentation }); }}>
                      <Icon name="Forward" className="size-3.5" />
                      {t("doctor.referTo")}
                    </Button>
                  </div>
                  {/* Collaborator suggestions preview */}
                  {fc.suggestions && fc.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
                      {fc.suggestions.map(function (sg) {
                        var sDoc = MCData.getDoctor(sg.doctorId);
                        return (
                          <div key={sg.id} className="rounded-md bg-muted/30 p-2">
                            <div className="mb-1 flex items-center gap-1.5">
                              {sDoc && <DoctorAvatar initials={sDoc.initials} gradient={sDoc.avatarGradient} className="size-5 text-[9px]" />}
                              <span className="text-[11px] font-medium">{sDoc ? p(sDoc.nameDisplay) : ""}</span>
                              {sDoc && sDoc.verified && <VerifiedBadge />}
                              {sg.bestApproach && <Badge className="bg-teal-100 text-[9px] text-teal-700">{p({ en: "Best approach", ar: "أفضل نهج" })}</Badge>}
                              <span className="ms-auto text-[10px] text-muted-foreground">▲ {sg.upvotes} · {p(sg.time)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{p(sg.body)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ---- Surgical Tips ---- */}
        <TabsContent value="surgical" className="mt-4">
          <div className="flex flex-col gap-4">
            <Card className="bg-gradient-to-br from-violet-50 to-teal-50 p-4">
              <div className="flex items-start gap-3">
                <Icon name="Scissors" className="size-6 shrink-0 text-violet-600" />
                <div>
                  <h2 className="text-sm font-semibold">{t("surgical.title")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("surgical.subtitle")}</p>
                </div>
              </div>
            </Card>
            {/* Specialty filter chips */}
            <div className="flex flex-wrap gap-2">
              {surgicalSp.map(function (sp) {
                return (
                  <button key={sp.id} onClick={function () { setSurgicalFilter(sp.id); }} className={cn("rounded-full border px-3 py-1 text-[11px] font-medium transition-colors", surgicalFilter === sp.id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border text-muted-foreground hover:bg-accent")}>
                    {p(sp.name)}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTips.map(function (tip) {
                var doc = MCData.getDoctor(tip.doctorId);
                var sp = MCData.surgicalSpecialties.filter(function (s) { return s.id === tip.specialtyId; })[0] || MCData.surgicalSpecialties[0];
                var upv = !!upvoted[tip.id];
                return (
                  <Card key={tip.id} className="overflow-hidden">
                    <div className={cn("relative flex h-24 items-center justify-center bg-gradient-to-br text-white", tip.mediaGradient)}>
                      <Icon name={tip.type === "video" ? "PlayCircle" : (tip.type === "trick" ? "Lightbulb" : "ClipboardList")} className="size-8 opacity-80" />
                      {tip.duration && <Badge className="absolute end-2 top-2 bg-black/40 text-white">{p(tip.duration)}</Badge>}
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className={cn("text-[10px]", typeTone(tip.type))}>{typeLabel(tip.type)}</Badge>
                        <span className={cn("inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-medium text-white", sp.color)}>{p(sp.name)}</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug">{p(tip.title)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p(tip.excerpt)}</p>
                      {tip.steps && tip.steps.length > 0 && (
                        <Accordion type="single" collapsible={true} className="mt-3">
                          <AccordionItem value="steps">
                            <AccordionTrigger className="py-2 text-xs font-semibold text-teal-700">
                              <span className="flex items-center gap-1.5">
                                <Icon name="ListOrdered" className="size-3.5" />
                                {t("surgical.steps") + " (" + tip.steps.length + ")"}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ol className="flex flex-col gap-1.5">
                                {tip.steps.map(function (step, i) {
                                  return (
                                    <li key={i} className="flex items-start gap-2 text-xs">
                                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">{i + 1}</span>
                                      <span className="text-foreground/90">{p(step)}</span>
                                    </li>
                                  );
                                })}
                              </ol>
                              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
                                <Icon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                                <span>{p({ en: "Complication-avoidance notes are embedded in each step.", ar: "ملاحظات تجنّب المضاعفات مدمجة في كل خطوة." })}</span>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                      <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5">
                        <DoctorAvatar initials={doc.initials} gradient={doc.avatarGradient} className="size-5 text-[9px]" />
                        <span className="truncate text-[11px] font-medium">{p(doc.nameDisplay)}</span>
                        <VerifiedBadge />
                        <span className="ms-auto text-[10px] text-muted-foreground">{p(tip.time)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button onClick={function () { toggleUpvote(tip.id); }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-teal-700">
                          <Icon name="ArrowBigUp" className={cn("size-4", upv && "fill-teal-500 text-teal-500")} />
                          {tip.upvotes + (upv ? 1 : 0)}
                        </button>
                        {tip.type === "video" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-teal-700">
                            <Icon name="PlayCircle" className="size-3.5" />
                            {t("surgical.watch")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      {referralCase && <ReferralModal open={true} onOpenChange={function () { setReferralCase(null); }} sourceCase={referralCase} />}
    </div>
  );
}

/* DoctorProfile — credentials banner, personal details, clinic hours,
 * referral prefs, AND an editable consultationFee field. Saving the fee
 * calls ApiService.saveDoctorFee(doctorId, {en,ar}) so the new value
 * propagates to every DoctorCard everywhere (via getDoctorFee merge).
 * The doctorId is matched by name against MCData.doctors; falls back to
 * "d1" (the demo doctor) when no match is found. */
function DoctorProfile() {
  var _a = useT(); var t = _a.t, p = _a.p, lang = _a.lang;
  var user = useStore(function (s) { return s.user; });
  var creds = useStore(function (s) { return s.doctorCreds; });
  var setLang = useStore(function (s) { return s.setLang; });
  /* Form state — each useState is ONE call (array destructuring). */
  var [name, setName] = useState((user && user.name) || "Dr. Layla");
  var [email, setEmail] = useState((user && user.email) || "");
  /* Editable consultation fee (bilingual). Initial value = stored fee or
   * the doctor's default from MCData. */
  var doctorId = "d1";
  MCData.doctors.forEach(function (d) { if (user && d.nameDisplay.en === user.name) doctorId = d.id; });
  var [feeEn, setFeeEn] = useState(ApiService.getDoctorFee(doctorId).en);
  var [feeAr, setFeeAr] = useState(ApiService.getDoctorFee(doctorId).ar);
  var [acceptReferrals, setAcceptReferrals] = useState(true);
  var [clinicHours, setClinicHours] = useState("9:00 AM – 5:00 PM");

  function saveFee() {
    ApiService.saveDoctorFee(doctorId, { en: feeEn, ar: feeAr });
    toast.success(t("profile.feeSaved"));
  }

  var spec = creds ? MCData.getSpecialty(creds.specialty) : MCData.getSpecialty("cardio");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">{t("nav.profile")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile.personal")}</p>
      </div>
      {/* Verified credentials banner */}
      <Card className="flex items-center gap-3 bg-gradient-to-br from-teal-50 to-sky-50 p-4">
        <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-sm">
          <Icon name="ShieldCheck" className="size-6" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold">{user && user.name}</h2>
            <VerifiedBadge withLabel={true} size="md" />
          </div>
          <p className="text-xs text-muted-foreground">{t("profile.credentials")}</p>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal */}
        <Card className="p-4">
          <SectionTitle title={t("profile.personal")} icon="User" />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("auth.name")}</Label>
              <Input value={name} onChange={function (e) { setName(e.target.value); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("auth.email")}</Label>
              <Input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t("verify.specialty")}</Label>
                <Input value={p(spec.name)} disabled={true} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("verify.yearsExp")}</Label>
                <Input value={(creds && creds.yearsExp) || ""} disabled={true} />
              </div>
            </div>
          </div>
        </Card>
        {/* Clinic + referral prefs */}
        <Card className="p-4">
          <SectionTitle title={t("profile.clinicHours")} icon="Clock" />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("profile.clinicHours")}</Label>
              <Input value={clinicHours} onChange={function (e) { setClinicHours(e.target.value); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("verify.clinic")}</Label>
              <Input value={(creds && creds.clinic) || ""} disabled={true} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <Icon name="Forward" className="size-4 text-teal-600" />
                <span className="text-sm">{t("profile.acceptReferrals")}</span>
              </div>
              <Switch checked={acceptReferrals} onCheckedChange={setAcceptReferrals} />
            </div>
          </div>
        </Card>
      </div>
      {/* Editable consultation fee — saves to ApiService.saveDoctorFee. */}
      <Card className="p-4">
        <SectionTitle title={t("profile.consultationFee")} icon="CircleDollarSign" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>English</Label>
            <Input value={feeEn} onChange={function (e) { setFeeEn(e.target.value); }} placeholder="150 SAR" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>العربية</Label>
            <Input value={feeAr} onChange={function (e) { setFeeAr(e.target.value); }} placeholder="150 ريال" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={saveFee} className="bg-teal-600 hover:bg-teal-700">
            <Icon name="Save" className="size-4" />
            {t("profile.save")}
          </Button>
          <span className="text-[11px] text-muted-foreground">{t("profile.feeSaved")}</span>
        </div>
      </Card>
      {/* Language */}
      <Card className="p-4">
        <SectionTitle title={t("profile.language")} icon="Languages" />
        <div className="flex gap-2">
          <button onClick={function () { setLang("en"); }} className={cn("rounded-md border px-4 py-2 text-sm font-medium", lang === "en" ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border")}>English</button>
          <button onClick={function () { setLang("ar"); }} className={cn("rounded-md border px-4 py-2 text-sm font-medium", lang === "ar" ? "border-teal-300 bg-teal-50 text-teal-700" : "border-border")}>العربية</button>
        </div>
      </Card>
    </div>
  );
}

/* DoctorApp — router for the doctor interface. Five nav tabs:
   home, clinicalAssistant, communityPublic, forumPrivate, profile. */
function DoctorApp() {
  var [active, setActive] = useState("home");
  var nav = [
    { key: "home", label: "nav.home", icon: "Home" },
    { key: "clinicalAssistant", label: "nav.clinicalAssistant", icon: "Sparkles" },
    { key: "communityPublic", label: "nav.communityPublic", icon: "Newspaper" },
    { key: "forumPrivate", label: "nav.forumPrivate", icon: "MessagesSquare" },
    { key: "profile", label: "nav.profile", icon: "UserCircle" },
  ];
  return (
    <AppShell active={active} onNavigate={setActive} nav={nav}>
      {active === "home" && <DoctorHome onNavigate={setActive} />}
      {active === "clinicalAssistant" && <DoctorSearch />}
      {active === "communityPublic" && <DoctorCommunity />}
      {active === "forumPrivate" && <DoctorForum />}
      {active === "profile" && <DoctorProfile />}
    </AppShell>
  );
}

/* ===================================================================
   J. APP ROUTER + MOUNT
   ------------------------------------------------------------------- */

/* Router — picks the top-level screen from authState:
     unauthenticated -> AuthScreen
     pending         -> DoctorVerification (doctor awaiting approval)
     authenticated   -> PatientApp or DoctorApp (by role) */
function Router() {
  var authState = useStore(function (s) { return s.authState; });
  var role = useStore(function (s) { return s.role; });
  if (authState === "pending") return <DoctorVerification />;
  if (authState === "authenticated") return role === "doctor" ? <DoctorApp /> : <PatientApp />;
  return <AuthScreen />;
}

/* App — top-level wrapper. Renders ToastHost + Router, and syncs the
   document's dir/lang attributes with the store's language so the whole
   page flips RTL/LTR on toggle (Cairo font kicks in via font-arabic). */
function App() {
  var lang = useStore(function (s) { return s.lang; });
  useEffect(function () {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return (
    <div className={cn("min-h-screen bg-background text-foreground", lang === "ar" && "font-arabic")}>
      <ToastHost />
      <Router />
    </div>
  );
}

/* Mount — React 18 createRoot on #root. The boot-loader div inside #root
 * is replaced by this render. */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
