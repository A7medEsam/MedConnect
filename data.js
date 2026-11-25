/* =====================================================================
   data.js  —  MedConnect demo data layer (offline-ready, no dependencies)
   ---------------------------------------------------------------------
   Exposes one global: window.MCData

   IMPORTANT:
   - This file is DEMO / seed data, not a live patient database.
   - Doctor identities, clinics, patient records, activity counts and
     clinical examples are illustrative and must not be represented as
     verified real-world records.
   - Clinical teaching examples include named source links where available.
     Qualified clinicians must verify source currency and local applicability.
   - Keep the public keys and field types in sync with app.js and api.js.

   Shared bilingual value shape: { en: "...", ar: "..." }.
   Use MCData.pick(value, lang) to render bilingual values safely.
   ===================================================================== */
window.MCData = (function () {
  "use strict";

  /* ---- Bilingual helper ---------------------------------------------
   * pick(b, lang) -> returns b[lang]. Use everywhere a {en,ar} value is
   * rendered so the UI flips with the language toggle. */
  function pick(value, lang) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    var preferred = lang === "ar" ? "ar" : "en";
    if (value[preferred] != null) return value[preferred];
    if (value.en != null) return value.en;
    if (value.ar != null) return value.ar;
    return "";
  }

  /* Runtime metadata: the interface can display this notice in a demo banner. */
  var META = {
    app: "MedConnect",
    schemaVersion: "1.3.1",
    dataMode: "demo",
    isProductionData: false,
    bilingualShape: "{ en, ar }",
    mentorAnalysisContract: {
      guidelines: "string[] (guideline codes, e.g. NICE)",
      probability: "null for seed fallbacks; numeric values only when independently calibrated and validated",
      probabilityStatus: "not-calculated for all bundled fallback differentials",
      probabilityNote: "bilingual explanation; render when probability is null",
      analysisSource: "ai | bundled-demo | unavailable",
      sampleData: "synthetic structured measurements; render with demo warning",
      correct: "zero-based integer option index",
      fallbackSamples: ["ctg", "ecg", "bloodTest"],
      clinicalReferenceFilter: "getClinicalRefsBySpecialty(specialtyId, guidelineFilters)",
    },
    notice: {
      en: "DEMO ENVIRONMENT ONLY. Every patient, doctor, credential, clinic listing, rating, review, appointment, activity count, uploaded-document label and seed measurement in this file is fictional or simulated. Medical thresholds and guideline summaries are linked to named sources where provided, but sample records are not real clinical observations, are not medical advice, and must not be used to make care decisions. Display this notice visibly throughout the demo.",
      ar: "بيئة تجريبية فقط. جميع بيانات المرضى والأطباء والاعتمادات والعيادات والتقييمات والمراجعات والمواعيد والإحصاءات وتسميات الملفات والقياسات الأولية في هذا الملف افتراضية أو محاكاة. أُرفقت مصادر مسماة بالحدود الطبية وملخصات الإرشادات حيثما توفرت، لكن السجلات النموذجية ليست قياسات سريرية حقيقية ولا تشكل نصيحة طبية، ولا يجوز استخدامها لاتخاذ قرارات علاجية. اعرض هذا التنبيه بوضوح في جميع أجزاء النسخة التجريبية.",
    },
  };

  /* Dates are generated at runtime so demo appointments do not appear expired. */
  function dateLabel(daysAhead) {
    var date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + daysAhead);
    return {
      en: new Intl.DateTimeFormat("en-US", {
        weekday: "short", month: "short", day: "numeric",
      }).format(date),
      ar: new Intl.DateTimeFormat("ar-u-ca-gregory", {
        weekday: "short", month: "short", day: "numeric",
      }).format(date),
    };
  }

  /* ===================================================================
   * 1. DEMO ACCOUNTS  (pre-configured for one-click offline testing)
   * -------------------------------------------------------------------
   * Used by AuthScreen "Fill Demo Account" buttons. The password is shared
   * (123456) so testers don't type. ApiService.saveSession persists these.
   * =================================================================== */
  var DEMO_ACCOUNTS = {
    patient: {
      name: "Reem Al-Qahtani",
      email: "patient@medconnect.app",
      password: "123456",
      role: "patient",
      // patients authenticate immediately (no verification step)
    },
    doctor: {
      name: "Dr. Layla Al-Harbi",
      email: "doctor@medconnect.app",
      password: "123456",
      role: "doctor",
      doctorVerified: true, // local demo-login shortcut only; NOT real credential verification
      doctorCreds: {
        license: "MED-LIC-48213",
        specialty: "cardio",
        yearsExp: "14",
        clinic: "MedConnect Cardiology Demo Clinic",
        fileName: "license-certificate.pdf",
      },
    },
  };

  /* ===================================================================
   * 2. SPECIALTIES  — channels + filter buckets + icon keys
   * -------------------------------------------------------------------
   * Schema: { id, name:{en,ar}, icon (lucide name), color (tailwind grad) }
   * `icon` is resolved by the Icon component (app.js). `color` is applied
   * to gradient chips/avatars. `obgyn` added for guideline-aligned content.
   * =================================================================== */
  var specialties = [
    { id: "cardio", name: { en: "Cardiology", ar: "أمراض القلب" }, icon: "HeartPulse", color: "from-rose-500 to-red-600" },
    { id: "pediatrics", name: { en: "Pediatrics", ar: "طب الأطفال" }, icon: "Baby", color: "from-amber-400 to-orange-500" },
    { id: "derma", name: { en: "Dermatology", ar: "الأمراض الجلدية" }, icon: "Sparkles", color: "from-fuchsia-500 to-pink-600" },
    { id: "neuro", name: { en: "Neurology", ar: "الأعصاب" }, icon: "Brain", color: "from-violet-500 to-purple-600" },
    { id: "neurosurgery", name: { en: "Neurosurgery", ar: "جراحة الأعصاب" }, icon: "Brain", color: "from-purple-500 to-indigo-700" },
    { id: "ortho", name: { en: "Orthopedics", ar: "العظام" }, icon: "Bone", color: "from-cyan-500 to-blue-600" },
    { id: "endo", name: { en: "Endocrinology", ar: "الغدد الصماء" }, icon: "Activity", color: "from-teal-500 to-emerald-600" },
    { id: "ophthal", name: { en: "Ophthalmology", ar: "طب العيون" }, icon: "Eye", color: "from-sky-500 to-indigo-600" },
    { id: "ent", name: { en: "ENT", ar: "أنف وأذن وحنجرة" }, icon: "Ear", color: "from-lime-500 to-green-600" },
    { id: "psych", name: { en: "Psychiatry", ar: "الطب النفسي" }, icon: "BrainCircuit", color: "from-indigo-500 to-blue-700" },
    { id: "obgyn", name: { en: "Obstetrics & Gynecology", ar: "النساء والولادة" }, icon: "Baby", color: "from-pink-500 to-rose-600" },
    { id: "gp", name: { en: "General Practice", ar: "الممارسة العامة" }, icon: "Stethoscope", color: "from-slate-500 to-slate-700" },
    { id: "infectious", name: { en: "Infectious Diseases", ar: "الأمراض المعدية" }, icon: "Microscope", color: "from-emerald-500 to-teal-700" },
  ];

  /* Cities used by the manual-search location filter. */
  var locations = [
    { en: "Riyadh", ar: "الرياض" },
    { en: "Jeddah", ar: "جدة" },
    { en: "Mecca", ar: "مكة" },
    { en: "Medina", ar: "المدينة" },
    { en: "Dammam", ar: "الدمام" },
    { en: "Khobar", ar: "الخبر" },
  ];

  /* ===================================================================
   * 3. DOCTORS — fictional demo profiles; verified=false until real credential checks
   * -------------------------------------------------------------------
   * Schema:
   *   id, nameDisplay:{en,ar}, specialtyId, location:{en,ar},
   *   rating, reviews, yearsExp, clinic:{en,ar}, bio:{en,ar},
   *   verified (bool), avatarGradient (tailwind), initials,
   *   languages:[{en,ar}],
   *   consultationFee:{en,ar}   <-- NEW: editable in DoctorProfile,
   *                                 shown as a badge on every DoctorCard
   *                                 and inside the Booking Modal.
   * =================================================================== */
  var doctors = [
    { id: "d1", nameDisplay: { en: "Dr. Layla Al-Harbi", ar: "د. ليلى الحربي" }, specialtyId: "cardio", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.9, reviews: 312, yearsExp: 14, clinic: { en: "MedConnect Cardiology Demo Clinic", ar: "عيادة ميدكونكت الافتراضية للقلب" }, bio: { en: "Interventional cardiologist specializing in arrhythmia management and preventive cardiology.", ar: "استشارية أمراض قلب تداخلية متخصصة في إدارة اضطرابات النظم والوقاية القلبية." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-rose-400 to-red-500", initials: "لا", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "150 SAR", ar: "150 ريال" } },
    { id: "d2", nameDisplay: { en: "Dr. Omar Al-Saud", ar: "د. عمر آل سعود" }, specialtyId: "pediatrics", location: { en: "Jeddah", ar: "جدة" }, rating: 4.8, reviews: 428, yearsExp: 11, clinic: { en: "Al-Salam Children's Hospital", ar: "مستشفى السلام للأطفال" }, bio: { en: "Pediatrician focused on neonatal care, vaccination schedules and childhood nutrition.", ar: "طبيب أطفال متخصص في حديثي الولادة وجداول التطعيم وتغذية الطفل." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-amber-400 to-orange-500", initials: "عس", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "Free", ar: "مجاني" } },
    { id: "d3", nameDisplay: { en: "Dr. Sara Al-Qahtani", ar: "د. سارة القحطاني" }, specialtyId: "derma", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.9, reviews: 506, yearsExp: 9, clinic: { en: "DermaCare Clinic", ar: "عيادة ديرماكير" }, bio: { en: "Dermatologist treating acne, eczema, and skin cancer screening with laser therapy.", ar: "أخصائية جلدية تعالج حب الشباب والإكزيما وفحص سرطان الجلد والعلاج بالليزر." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-fuchsia-400 to-pink-500", initials: "سق", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "200 SAR", ar: "200 ريال" } },
    { id: "d4", nameDisplay: { en: "Dr. Khalid Al-Dossari", ar: "د. خالد الدوسري" }, specialtyId: "neuro", location: { en: "Dammam", ar: "الدمام" }, rating: 4.7, reviews: 189, yearsExp: 17, clinic: { en: "Eastern Neuro Center", ar: "مركز الشرق للأعصاب" }, bio: { en: "Neurologist specializing in epilepsy, stroke recovery and migraine management.", ar: "استشاري أعصاب متخصص في الصرع وتأهيل مرضى السكتة الدماغية والصداع النصفي." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-violet-400 to-purple-500", initials: "خد", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "180 SAR", ar: "180 ريال" } },
    { id: "d5", nameDisplay: { en: "Dr. Noura Al-Otaibi", ar: "د. نورة العتيبي" }, specialtyId: "endo", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.8, reviews: 237, yearsExp: 12, clinic: { en: "MedConnect Endocrine Demo Clinic", ar: "عيادة ميدكونكت الافتراضية للغدد" }, bio: { en: "Endocrinologist managing diabetes, thyroid disorders and metabolic syndrome.", ar: "استشارية غدد صماء لإدارة السكري واضطرابات الغدة الدرقية ومتلازمة الأيض." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-teal-400 to-emerald-500", initials: "نع", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "160 SAR", ar: "160 ريال" } },
    { id: "d6", nameDisplay: { en: "Dr. Faisal Al-Ghamdi", ar: "د. فيصل الغامدي" }, specialtyId: "ortho", location: { en: "Mecca", ar: "مكة" }, rating: 4.6, reviews: 154, yearsExp: 15, clinic: { en: "Mecca Orthopedic Hospital", ar: "مستشفى مكة للعظام" }, bio: { en: "Orthopedic surgeon treating sports injuries, joint replacement and spinal conditions.", ar: "جراح عظام يعالج إصابات الرياضة واستبدال المفاصل وحالات العمود الفقري." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-cyan-400 to-blue-500", initials: "فغ", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "Not specified", ar: "غير محدد" } },
    { id: "d7", nameDisplay: { en: "Dr. Mona Al-Zahrani", ar: "د. منى الزهراني" }, specialtyId: "ophthal", location: { en: "Khobar", ar: "الخبر" }, rating: 4.9, reviews: 273, yearsExp: 10, clinic: { en: "Vision Care Center", ar: "مركز الرؤية للعناية بالعين" }, bio: { en: "Ophthalmologist providing cataract surgery, glaucoma care and refractive correction.", ar: "استشارية عيون تقدم جراحة المياه البيضاء ورعاية المياه الزرقاء وتصحيح الإبصار." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-sky-400 to-indigo-500", initials: "مز", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "250 SAR", ar: "250 ريال" } },
    { id: "d8", nameDisplay: { en: "Dr. Yousef Al-Mutairi", ar: "د. يوسف المطيري" }, specialtyId: "psych", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.7, reviews: 198, yearsExp: 13, clinic: { en: "MindWell Clinic", ar: "عيادة مايندويل" }, bio: { en: "Psychiatrist treating anxiety, depression and sleep disorders with CBT.", ar: "استشاري نفسي يعالج القلق والاكتئاب واضطرابات النوم بالعلاج المعرفي السلوكي." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-indigo-400 to-blue-600", initials: "يم", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "220 SAR", ar: "220 ريال" } },
    { id: "d9", nameDisplay: { en: "Dr. Rana Al-Harbi", ar: "د. رنا الحربي" }, specialtyId: "obgyn", location: { en: "Riyadh", ar: "الرياض" }, rating: 0, reviews: 0, yearsExp: 12, clinic: { en: "MedConnect Women's Health Demo Clinic", ar: "عيادة ميدكونكت الافتراضية لصحة المرأة" }, bio: { en: "Fictional obstetrics and gynaecology profile for demonstration content only.", ar: "ملف افتراضي لطبيبة نساء وولادة مخصص للمحتوى التجريبي فقط." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-pink-400 to-rose-600", initials: "رح", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "Not specified", ar: "غير محدد" } },
    { id: "d10", nameDisplay: { en: "Dr. Sami Al-Nasser", ar: "د. سامي الناصر" }, specialtyId: "neurosurgery", location: { en: "Riyadh", ar: "الرياض" }, rating: 0, reviews: 0, yearsExp: 14, clinic: { en: "MedConnect Neurosurgery Demo Unit", ar: "وحدة ميدكونكت الافتراضية لجراحة الأعصاب" }, bio: { en: "Fictional neurosurgery profile for demonstration content only.", ar: "ملف افتراضي لجراح أعصاب مخصص للمحتوى التجريبي فقط." }, verified: false, demoRecord: true, verificationStatus: "demo", avatarGradient: "from-violet-500 to-indigo-700", initials: "سن", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "Not specified", ar: "غير محدد" } },
  ];

  /* Lookup helpers used widely by components. */
  function getSpecialty(id) {
    var match = specialties.filter(function (item) { return item.id === id; })[0];
    if (match) return match;
    // Keep callers that read .name safe without falsely labelling unknown IDs as Cardiology.
    return {
      id: null,
      name: { en: "Unknown specialty", ar: "تخصص غير معروف" },
      icon: "CircleHelp",
      color: "from-slate-400 to-slate-600",
      isFallback: true,
    };
  }
  function getDoctor(id) {
    return doctors.filter(function (item) { return item.id === id; })[0] || null;
  }

  /* ===================================================================
   * 4. PATIENT HOME DATA
   * -------------------------------------------------------------------
   * patientAppointments — rendered in PatientHome "Upcoming Appointments"
   *   Schema: { id, doctorId, time:{en,ar}, date:{en,ar}, type:{en,ar}, status:{en,ar} }
   * healthUpdates — PatientHome right-column alert cards
   *   Schema: { id, title, body, icon, tone(teal|blue|amber|rose), time }
   * vitals — PatientHome stat grid (Heart Rate, BP, Steps, Sleep)
   * =================================================================== */
  var patientAppointments = [
    { id: "a1", doctorId: "d1", time: { en: "10:30 AM", ar: "10:30 ص" }, date: dateLabel(1), type: { en: "Cardiology follow-up", ar: "متابعة القلب" }, status: { en: "Confirmed", ar: "مؤكد" } },
    { id: "a2", doctorId: "d5", time: { en: "2:00 PM", ar: "2:00 م" }, date: dateLabel(4), type: { en: "Diabetes review", ar: "مراجعة السكري" }, status: { en: "Confirmed", ar: "مؤكد" } },
    { id: "a3", doctorId: "d3", time: { en: "11:15 AM", ar: "11:15 ص" }, date: dateLabel(8), type: { en: "Skin check-up", ar: "فحص الجلد" }, status: { en: "Pending", ar: "قيد التأكيد" } },
  ];
  var healthUpdates = [
    { id: "u1", title: { en: "Lab results ready", ar: "نتائج المختبر جاهزة" }, body: { en: "Your cholesterol panel is available. LDL-C result available; the appropriate target depends on the patient’s cardiovascular risk and clinical history — review recommended.", ar: "نتيجة LDL-C متاحة؛ يعتمد الهدف المناسب على مستوى الخطورة القلبية والتاريخ السريري — يُنصح بالمراجعة." }, icon: "FlaskConical", tone: "teal", time: { en: "2h ago", ar: "قبل ساعتين" } },
    { id: "u2", title: { en: "Vaccination reminder", ar: "تذكير بالتطعيم" }, body: { en: "Seasonal flu vaccine is due. Arrange vaccination with an appropriately qualified healthcare professional.", ar: "لقاح الإنفلونزا الموسمي مستحق. رتّب أخذ اللقاح مع أحد الممارسين الصحيين المؤهلين." }, icon: "Syringe", tone: "blue", time: { en: "1d ago", ar: "قبل يوم" } },
    { id: "u3", title: { en: "Medication refill", ar: "تجديد الدواء" }, body: { en: "Your metformin prescription expires in 3 days. Request a renewal.", ar: "وصفة الميتفورمين تنتهي خلال 3 أيام. اطلب التجديد." }, icon: "Pill", tone: "amber", time: { en: "2d ago", ar: "قبل يومين" } },
  ];
  var vitals = [
    { id: "v1", label: { en: "Heart Rate", ar: "ضربات القلب" }, value: { en: "72", ar: "72" }, unit: { en: "bpm", ar: "نبضة/د" }, icon: "HeartPulse", trend: "Normal", trendDir: "flat", tone: "text-rose-500" },
    { id: "v2", label: { en: "Blood Pressure", ar: "ضغط الدم" }, value: { en: "118/76", ar: "118/76" }, unit: { en: "mmHg", ar: "مم زئبق" }, icon: "Gauge", trend: "Normal", trendDir: "flat", tone: "text-teal-600" },
    { id: "v3", label: { en: "Steps Today", ar: "الخطوات اليوم" }, value: { en: "8,420", ar: "8,420" }, unit: { en: "steps", ar: "خطوة" }, icon: "Footprints", trend: "+12%", trendDir: "up", tone: "text-blue-600" },
    { id: "v4", label: { en: "Sleep", ar: "النوم" }, value: { en: "7.5", ar: "7.5" }, unit: { en: "hours", ar: "ساعات" }, icon: "Moon", trend: "Good", trendDir: "flat", tone: "text-violet-500" },
  ];

  /* ===================================================================
   * 5. HEALTH RECORD DATA  (Patient Health Record page)
   * -------------------------------------------------------------------
   * healthDocs — stored documents list. Schema:
   *   { id, name, type, date, doctorId, size, icon, tone (bg/text classes) }
   * accessSessions — active/expired temporary QR access sessions.
   * =================================================================== */
  var healthDocs = [
    { id: "doc1", name: { en: "Lipid Panel — Full", ar: "فحص الدهون الكامل" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Nov 8, 2026", ar: "8 نوفمبر 2026" }, doctorId: "d5", size: "248 KB", icon: "FlaskConical", tone: "bg-teal-50 text-teal-600" },
    { id: "doc2", name: { en: "ECG Stress Test Report", ar: "تقرير تخطيط القلب بالجهد" }, type: { en: "Cardiology Report", ar: "تقرير قلب" }, date: { en: "Oct 22, 2026", ar: "22 أكتوبر 2026" }, doctorId: "d1", size: "1.2 MB", icon: "HeartPulse", tone: "bg-rose-50 text-rose-600" },
    { id: "doc3", name: { en: "HbA1c Result", ar: "نتيجة السكر التراكمي" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Oct 15, 2026", ar: "15 أكتوبر 2026" }, doctorId: "d5", size: "196 KB", icon: "FlaskConical", tone: "bg-teal-50 text-teal-600" },
    { id: "doc4", name: { en: "Chest X-Ray", ar: "أشعة صدر" }, type: { en: "Imaging", ar: "أشعة" }, date: { en: "Sep 30, 2026", ar: "30 سبتمبر 2026" }, doctorId: "d2", size: "3.4 MB", icon: "ScanLine", tone: "bg-slate-100 text-slate-600" },
    { id: "doc5", name: { en: "Allergy Panel", ar: "فحص الحساسية" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Aug 12, 2026", ar: "12 أغسطس 2026" }, doctorId: "d3", size: "312 KB", icon: "FlaskConical", tone: "bg-fuchsia-50 text-fuchsia-600" },
  ];
  var accessSessions = [
    { id: "s1", doctorId: "d1", createdAt: { en: "Today, 9:10 AM", ar: "اليوم، 9:10 ص" }, expiresAt: { en: "in 38 min", ar: "خلال 38 دقيقة" }, status: "active" },
    { id: "s2", doctorId: "d5", createdAt: { en: "Yesterday", ar: "أمس" }, expiresAt: { en: "expired", ar: "منتهٍ" }, status: "expired" },
  ];

  /* ===================================================================
   * 6. KNOWLEDGE BASE — illustrative patient education examples (demo only)
   * -------------------------------------------------------------------
   * Used by Patient AI Smart Search. Schema:
   *   { id, question, answer, doctorId, specialtyId, upvotes, tags:[{en,ar}] }
   * =================================================================== */
  var preAnswered = [
    { id: "p1", question: { en: "I have chest tightness and shortness of breath — what should I do?", ar: "أعاني من ضيق في الصدر وضيق في التنفس — ماذا أفعل؟" }, answer: { en: "Chest tightness together with shortness of breath can be a medical emergency. Call your local emergency number now or go to the nearest emergency department. Do not drive yourself and do not wait for additional symptoms to appear.", ar: "قد يكون ضيق الصدر المصحوب بضيق التنفس حالة طبية طارئة. اتصل برقم الطوارئ المحلي فورًا أو توجّه إلى أقرب قسم طوارئ. لا تقد السيارة بنفسك، ولا تنتظر ظهور أعراض إضافية." }, doctorId: "d1", specialtyId: "cardio", upvotes: 482, tags: [{ en: "Chest pain", ar: "ألم الصدر" }, { en: "Emergency", ar: "طوارئ" }] },
    { id: "p2", question: { en: "My child has a fever of 39°C and a rash — is it serious?", ar: "طفلي حرارته 39 مع طفح جلدي — هل خطير؟" }, answer: { en: "A child with fever and a rash should be assessed by a qualified clinician promptly. Seek emergency care now if the child is hard to wake, has breathing difficulty, a seizure, signs of dehydration, or a rash that does not fade when pressed. Do not rely on this demo answer to judge urgency.", ar: "ينبغي تقييم الطفل المصاب بالحمى والطفح من مختص في وقت مناسب. اطلب الطوارئ فورًا إذا كان من الصعب إيقاظ الطفل، أو لديه صعوبة في التنفس أو تشنج أو علامات جفاف أو طفح لا يختفي عند الضغط عليه. لا تعتمد على هذه الإجابة التجريبية لتحديد درجة الخطورة." }, doctorId: "d2", specialtyId: "pediatrics", upvotes: 367, tags: [{ en: "Fever", ar: "حمى" }, { en: "Rash", ar: "طفح" }] },
    { id: "p3", question: { en: "Persistent acne despite washing — what actually works?", ar: "حب شباب مستمر رغم الغسل — ما الذي ينجح فعلًا؟" }, answer: { en: "Acne isn't caused by poor hygiene. Evidence-based treatments include topical retinoids, benzoyl peroxide, and if moderate–severe, oral therapy. Over-washing can irritate skin. See a dermatologist for a tailored plan.", ar: "حب الشباب لا ينتج عن ضعف النظافة. تشمل العلاجات المثبتة الريتينويد الموضعي وبيروكسيد البنزويل، وفي الحالات المتوسطة–الشديدة علاج فموي. الغسل المفرط يهيّج الجلد. راجع طبيب جلدية لخطة مخصصة." }, doctorId: "d3", specialtyId: "derma", upvotes: 529, tags: [{ en: "Acne", ar: "حب الشباب" }, { en: "Skincare", ar: "العناية بالبشرة" }] },
    { id: "p4", question: { en: "Frequent migraines — when should I worry?", ar: "صداع نصفي متكرر — متى أقلق؟" }, answer: { en: "Worry if migraines increase in frequency, change character, or come with neurological symptoms (vision loss, weakness). Maintain a trigger diary and consult a neurologist for preventive options.", ar: "اطلب التقييم الطبي إذا زادت وتيرة الصداع النصفي أو تغيّرت طبيعته أو رافقه أعراض عصبية (فقدان رؤية، ضعف). احتفظ بدفتر المثيرات واستشر طبيب أعصاب لخيارات الوقاية." }, doctorId: "d4", specialtyId: "neuro", upvotes: 241, tags: [{ en: "Headache", ar: "صداع" }, { en: "Migraine", ar: "صداع نصفي" }] },
    { id: "p5", question: { en: "My fasting blood sugar is 130 — is that diabetes?", ar: "سكر الدم الصائم 130 — هل هذا سكري؟" }, answer: { en: "If this is a laboratory fasting plasma glucose after at least 8 hours with no caloric intake, 130 mg/dL is at or above the ADA 2026 diabetes diagnostic threshold of 126 mg/dL. In the absence of unequivocal hyperglycaemia, diagnosis generally requires two abnormal results (the same test repeated or two different tests). A clinician must interpret the result with symptoms, test quality and medical context. Do not diagnose yourself or change medication based on this demo answer.", ar: "إذا كانت هذه قراءة مخبرية لسكر البلازما الصائم بعد انقطاع عن السعرات لمدة 8 ساعات على الأقل، فإن 130 ملغم/دل تتجاوز عتبة تشخيص السكري المعتمدة في معايير ADA لعام 2026، وهي 126 ملغم/دل. عند غياب ارتفاع واضح مصحوب بأعراض لا لبس فيها، يتطلب التشخيص عادة نتيجتين غير طبيعيتين، إما تكرار الفحص نفسه أو استخدام فحصين مختلفين. يجب أن يفسر الطبيب النتيجة مع الأعراض وجودة الفحص والسياق الصحي. لا تشخّص نفسك ولا تغيّر الدواء اعتمادًا على هذه الإجابة التجريبية." }, doctorId: "d5", specialtyId: "endo", upvotes: 318, tags: [{ en: "Diabetes", ar: "السكري" }, { en: "Blood sugar", ar: "سكر الدم" }] },
  ];

  /* ===================================================================
   * 7. COMMUNITY CONTENT  (Patient + Doctor public feed)
   * -------------------------------------------------------------------
   * communityPosts — illustrative articles/videos/images by specialty channel (not verified publications).
   *   Schema: { id, type(article|video|image), channelId, title, excerpt,
   *             doctorId, time, upvotes, comments, mediaGradient, mediaIcon }
   * qaItems — illustrative Q&A examples; not real consultations or verified advice.
   * =================================================================== */
  var communityPosts = [
    { id: "c1", type: "article", channelId: "cardio", title: { en: "Understanding Hypertension: A Patient Guide", ar: "فهم ارتفاع ضغط الدم: دليل للمريض" }, excerpt: { en: "What the numbers mean, when to treat, and lifestyle changes that genuinely lower readings.", ar: "ماذا تعني الأرقام ومتى يُعالج وتغييرات صحية تخفض القراءات فعليًا." }, doctorId: "d1", time: { en: "3d ago", ar: "قبل 3 أيام" }, upvotes: 1240, comments: 88, mediaGradient: "from-rose-500 to-red-700", mediaIcon: "HeartPulse" },
    { id: "c2", type: "video", channelId: "cardio", title: { en: "How to Measure Your Blood Pressure at Home", ar: "كيف تقيس ضغط الدم في المنزل" }, excerpt: { en: "A 4-minute walkthrough of correct cuff placement and common mistakes.", ar: "شرح مدته 4 دقائق لوضع الكفة الصحيح والأخطاء الشائعة." }, doctorId: "d1", time: { en: "1w ago", ar: "قبل أسبوع" }, upvotes: 890, comments: 54, mediaGradient: "from-red-400 to-rose-600", mediaIcon: "PlayCircle" },
    { id: "c3", type: "article", channelId: "pediatrics", title: { en: "Vaccination Schedule: Birth to 18 Years", ar: "جدول التطعيمات: من الولادة إلى 18 سنة" }, excerpt: { en: "The complete recommended immunization timeline with side-effect guidance.", ar: "الجدول الزمني الكامل للتطعيمات الموصى بها مع إرشادات الآثار الجانبية." }, doctorId: "d2", time: { en: "5d ago", ar: "قبل 5 أيام" }, upvotes: 2103, comments: 142, mediaGradient: "from-amber-400 to-orange-600", mediaIcon: "Baby" },
    { id: "c4", type: "image", channelId: "derma", title: { en: "Recognizing Melanoma: ABCDE Rule Visual", ar: "التعرف على الميلانوما: قاعدة ABCDE البصرية" }, excerpt: { en: "A visual guide to spot warning signs of skin cancer early.", ar: "دليل بصري لرصد علامات سرطان الجلد مبكرًا." }, doctorId: "d3", time: { en: "2d ago", ar: "قبل يومين" }, upvotes: 1670, comments: 96, mediaGradient: "from-fuchsia-500 to-pink-700", mediaIcon: "Sparkles" },
    { id: "c5", type: "article", channelId: "neuro", title: { en: "Migraine Triggers and Preventive Therapy", ar: "مثيرات الصداع النصفي والعلاج الوقائي" }, excerpt: { en: "Evidence-based trigger management and when preventive medication is indicated.", ar: "إدارة المثيرات المثبتة ومتى يُلجأ للعلاج الوقائي." }, doctorId: "d4", time: { en: "4d ago", ar: "قبل 4 أيام" }, upvotes: 732, comments: 41, mediaGradient: "from-violet-500 to-purple-700", mediaIcon: "Brain" },
    { id: "c6", type: "video", channelId: "endo", title: { en: "Living Well with Type 2 Diabetes", ar: "العيش بشكل جيد مع السكري النوع الثاني" }, excerpt: { en: "Diet, monitoring, and medication adherence explained simply.", ar: "الغذاء والمراقبة والالتزام بالدواء بشرح مبسّط." }, doctorId: "d5", time: { en: "6d ago", ar: "قبل 6 أيام" }, upvotes: 1450, comments: 73, mediaGradient: "from-teal-500 to-emerald-700", mediaIcon: "Activity" },
  ];
  var qaItems = [
    { id: "q1", channelId: "cardio", question: { en: "Is it safe to exercise with controlled hypertension?", ar: "هل ممارسة الرياضة آمنة مع ضغط دم مضبوط؟" }, askedBy: { en: "Ahmed R.", ar: "أحمد ر." }, time: { en: "5h ago", ar: "قبل 5 ساعات" }, answers: [{ id: "a1", doctorId: "d1", body: { en: "For many people with controlled hypertension, regular moderate aerobic activity is beneficial. The appropriate intensity and any restrictions depend on blood-pressure control, symptoms, other conditions and clinician advice. A common public-health target is at least 150 minutes of moderate-intensity activity per week, accumulated in a way the person can safely manage.", ar: "تفيد الأنشطة الهوائية المعتدلة المنتظمة كثيرًا من المصابين بارتفاع ضغط مضبوط. وتعتمد الشدة المناسبة وأي قيود على ضبط الضغط والأعراض والأمراض الأخرى وتوجيه الطبيب. ومن الأهداف العامة للصحة العامة ممارسة 150 دقيقة على الأقل من النشاط المعتدل أسبوعيًا، موزعة بطريقة يستطيع الشخص اتباعها بأمان." }, upvotes: 142, peerVerified: false, demoRecord: true, time: { en: "3h ago", ar: "قبل 3 ساعات" } }] },
    { id: "q2", channelId: "derma", question: { en: "Best sunscreen for sensitive acne-prone skin?", ar: "أفضل واقي شمس للبشرة الحساسة المعرضة لحب الشباب؟" }, askedBy: { en: "Huda K.", ar: "هدى ك." }, time: { en: "1d ago", ar: "قبل يوم" }, answers: [{ id: "a2", doctorId: "d3", body: { en: "Look for non-comedogenic, mineral sunscreens (zinc oxide) SPF 30+. They don't clog pores and suit sensitive skin. Reapply every 2 hours outdoors.", ar: "ابحث عن واقيات معدنية غير مسدّدة للمسام (أكسيد الزنك) SPF 30+. لا تسد المسام وتناسب البشرة الحساسة. أعد وضعها كل ساعتين بالخارج." }, upvotes: 98, peerVerified: false, demoRecord: true, time: { en: "20h ago", ar: "قبل 20 ساعة" } }] },
    { id: "q3", channelId: "endo", question: { en: "Can type 2 diabetes be reversed with diet alone?", ar: "هل يمكن عكس السكري النوع الثاني بالغذاء وحده؟" }, askedBy: { en: "Salem A.", ar: "سالم ع." }, time: { en: "2d ago", ar: "قبل يومين" }, answers: [{ id: "a3", doctorId: "d5", body: { en: "Some people with type 2 diabetes can achieve remission after substantial, sustained weight loss or structured interventions, but this is not guaranteed and does not mean the condition is permanently cured. Ongoing follow-up and monitoring remain important; any programme should be clinician-supervised and individualized.", ar: "قد يحقق بعض المصابين بالسكري من النوع الثاني هدأة بعد فقدان وزن كبير ومستمر أو تدخلات منظمة، لكن ذلك غير مضمون ولا يعني الشفاء النهائي الدائم. تظل المتابعة والمراقبة المستمرتان مهمتين، وينبغي أن يكون أي برنامج تحت إشراف مختص ومخصصًا للشخص." }, upvotes: 211, peerVerified: false, demoRecord: true, time: { en: "1d ago", ar: "قبل يوم" } }] },
  ];

  /* ===================================================================
   * 8. DOCTORS-ONLY FORUM  — fictional training cases (demo only)
   * -------------------------------------------------------------------
   * forumCases — illustrative discussion cases; NOT peer-reviewed. Schema:
   *   { id, title, presentation, protocol, tags, authorSpecialtyId,
   *     upvotes, collaborators, time, status, suggestions:[
   *       { id, doctorId, body, upvotes, time, bestApproach } ] }
   * NOTE: Arabic typo fixed — "المُognito" replaced with "مجهولة الهوية".
   * =================================================================== */
  var forumCases = [
    {
      id: "f1",
      title: { en: "Discussion case: recurrent ventricular tachycardia after myocardial infarction", ar: "حالة للنقاش: تكرر تسرع القلب البطيني بعد احتشاء عضلة القلب" },
      presentation: { en: "Fictional case: a 58-year-old patient, several months after myocardial infarction, with reduced ejection fraction and recurrent documented monomorphic ventricular tachycardia. Full records and investigations are not provided.", ar: "حالة افتراضية: مريض عمره 58 عامًا بعد احتشاء عضلة القلب بعدة أشهر، مع انخفاض الكسر القذفي ونوبات موثقة متكررة من تسرع القلب البطيني أحادي الشكل. لا تتوفر السجلات والفحوصات كاملة." },
      protocol: { en: "Discussion prompt: identify the missing clinical information, review current arrhythmia guidance, and discuss how a multidisciplinary team would assess device therapy and ablation options.", ar: "محور النقاش: تحديد المعلومات السريرية الناقصة، ومراجعة أحدث إرشادات اضطرابات النظم، ومناقشة كيفية تقييم الفريق متعدد التخصصات لخيارات الأجهزة والاستئصال." },
      tags: [{ en: "Cardiology", ar: "القلب" }, { en: "Electrophysiology", ar: "فيزيولوجيا كهربائية" }, { en: "Clinical reasoning", ar: "الاستدلال السريري" }],
      authorSpecialtyId: "cardio", upvotes: 87, collaborators: 6,
      time: { en: "2d ago", ar: "قبل يومين" },
      status: { en: "Demo case — discussion only", ar: "حالة تجريبية — للنقاش فقط" },
      suggestions: [
        { id: "fs1", doctorId: "d4", body: { en: "Discussion point: compare primary- and secondary-prevention indications using the full rhythm history, ventricular function, reversible causes and current specialist guidance.", ar: "نقطة نقاش: قارن دواعي الوقاية الأولية والثانوية بالاستناد إلى سجل اضطراب النظم ووظيفة البطين والأسباب القابلة للعكس وأحدث إرشادات الاختصاص." }, upvotes: 34, time: { en: "1d ago", ar: "قبل يوم" }, bestApproach: false },
        { id: "fs2", doctorId: "d6", body: { en: "Discussion point: review medication history, ECG/QT data, comorbidities and sleep-related triggers with the electrophysiology team. This is not an individual treatment recommendation.", ar: "نقطة نقاش: راجع التاريخ الدوائي وبيانات التخطيط وفترة QT والأمراض المصاحبة والعوامل المرتبطة بالنوم مع فريق الفيزيولوجيا الكهربائية. هذا ليس توصية علاجية لمريض بعينه." }, upvotes: 19, time: { en: "1d ago", ar: "قبل يوم" }, bestApproach: false },
      ],
    },
    {
      id: "f2",
      title: { en: "Discussion case: suspected autoimmune encephalitis in a child", ar: "حالة للنقاش: اشتباه التهاب دماغ مناعي لدى طفل" },
      presentation: { en: "Fictional case: a 9-year-old child with subacute behavioural changes, seizures and a reported neuronal antibody result. The diagnosis, test quality and alternative causes require independent review.", ar: "حالة افتراضية: طفل عمره 9 سنوات لديه تغيرات سلوكية تحت حادة وتشنجات ونتيجة مُبلغ عنها لأجسام مضادة عصبية. يتطلب التشخيص وجودة الفحص والأسباب البديلة مراجعة مستقلة." },
      protocol: { en: "Discussion prompt: review diagnostic criteria, infectious and metabolic alternatives, the need for repeat or confirmatory testing, and the role of a multidisciplinary paediatric neurology team.", ar: "محور النقاش: مراجعة معايير التشخيص والاحتمالات المعدية والاستقلابية البديلة والحاجة إلى فحوصات تأكيدية أو معادة ودور فريق أعصاب الأطفال متعدد التخصصات." },
      tags: [{ en: "Pediatrics", ar: "الأطفال" }, { en: "Neurology", ar: "الأعصاب" }, { en: "Immunology", ar: "المناعة" }],
      authorSpecialtyId: "neuro", upvotes: 64, collaborators: 4,
      time: { en: "4d ago", ar: "قبل 4 أيام" },
      status: { en: "Demo case — discussion only", ar: "حالة تجريبية — للنقاش فقط" },
      suggestions: [
        { id: "fs3", doctorId: "d4", body: { en: "Discussion point: confirm the phenotype and antibody assay, exclude important mimics, and consult current paediatric consensus guidance before considering immunotherapy.", ar: "نقطة نقاش: أكّد الصورة السريرية ونوع فحص الأجسام المضادة، واستبعد الحالات المشابهة المهمة، وراجع توافقات اختصاص أعصاب الأطفال الحالية قبل بحث العلاج المناعي." }, upvotes: 28, time: { en: "3d ago", ar: "قبل 3 أيام" }, bestApproach: false },
      ],
    },
    {
      id: "f3",
      title: { en: "Discussion case: new pustular lesions during biologic treatment for psoriasis", ar: "حالة للنقاش: ظهور آفات بثرية جديدة أثناء العلاج البيولوجي للصدفية" },
      presentation: { en: "Fictional case: an adult with plaque psoriasis develops new pustular lesions after starting a biologic agent. The relationship, differential diagnosis and severity have not been independently confirmed.", ar: "حالة افتراضية: شخص بالغ مصاب بالصدفية اللويحية تظهر لديه آفات بثرية جديدة بعد بدء دواء بيولوجي. لم يتم التحقق بصورة مستقلة من العلاقة أو التشخيص التفريقي أو الشدة." },
      protocol: { en: "Discussion prompt: assess infection and other mimics, review the treatment timeline and severity, and compare management options with a dermatologist using current guidance.", ar: "محور النقاش: تقييم العدوى والحالات المشابهة، ومراجعة التسلسل الزمني للعلاج وشدة الحالة، ومقارنة الخيارات مع طبيب جلدية وفق الإرشادات الحالية." },
      tags: [{ en: "Dermatology", ar: "الجلدية" }, { en: "Immunology", ar: "المناعة" }],
      authorSpecialtyId: "derma", upvotes: 52, collaborators: 3,
      time: { en: "6d ago", ar: "قبل 6 أيام" },
      status: { en: "Demo case — discussion only", ar: "حالة تجريبية — للنقاش فقط" },
      suggestions: [
        { id: "fs4", doctorId: "d3", body: { en: "Discussion point: verify the suspected drug reaction, assess infection and relevant comorbidities, and make any treatment change only after specialist review.", ar: "نقطة نقاش: تحقّق من التفاعل الدوائي المشتبه به، وقيّم العدوى والأمراض المصاحبة ذات الصلة، ولا تُجرِ أي تغيير علاجي إلا بعد مراجعة الاختصاصي." }, upvotes: 22, time: { en: "5d ago", ar: "قبل 5 أيام" }, bestApproach: false },
      ],
    },
  ];

  /* ===================================================================
   * 9. DOCTOR HOME DATA
   * -------------------------------------------------------------------
   * doctorSchedule — today's appointment slots. accessRequests — incoming
   *   patient QR-access requests. referralNotifs — transferred cases.
   *   doctorMetrics — engagement KPI cards.
   * =================================================================== */
  var doctorSchedule = [
    { id: "sch1", time: { en: "09:00", ar: "09:00" }, patientName: { en: "Salman R.", ar: "سلمان ر." }, reason: { en: "Post-MI follow-up", ar: "متابعة بعد احتشاء" }, type: "in-person", status: { en: "Checked in", ar: "وصل" } },
    { id: "sch2", time: { en: "10:30", ar: "10:30" }, patientName: { en: "Reem S.", ar: "ريم س." }, reason: { en: "Palpitation assessment", ar: "تقييم خفقان" }, type: "video", status: { en: "Upcoming", ar: "قادم" } },
    { id: "sch3", time: { en: "12:00", ar: "12:00" }, patientName: { en: "Tariq A.", ar: "طارق ع." }, reason: { en: "Stress test results", ar: "نتائج اختبار الجهد" }, type: "in-person", status: { en: "Upcoming", ar: "قادم" } },
    { id: "sch4", time: { en: "14:30", ar: "14:30" }, patientName: { en: "Lina H.", ar: "لينا ه." }, reason: { en: "Medication titration", ar: "ضبط الدواء" }, type: "video", status: { en: "Upcoming", ar: "قادم" } },
  ];
  var accessRequests = [
    { id: "ar1", patientName: { en: "Reem S.", ar: "ريم س." }, reason: { en: "Pre-consultation record share", ar: "مشاركة قبل الاستشارة" }, sharedDocs: 5, expiresAt: { en: "expires in 42 min", ar: "ينتهي خلال 42 دقيقة" }, time: { en: "8 min ago", ar: "قبل 8 دقائق" } },
    { id: "ar2", patientName: { en: "Tariq A.", ar: "طارق ع." }, reason: { en: "Second opinion referral", ar: "رأي ثانٍ محال" }, sharedDocs: 3, expiresAt: { en: "expires in 1h 10m", ar: "ينتهي خلال ساعة و10 د" }, time: { en: "25 min ago", ar: "قبل 25 دقيقة" } },
  ];
  var referralNotifs = [
    { id: "rn1", fromDoctorId: "d5", patientName: { en: "Salem A.", ar: "سالم ع." }, summary: { en: "Uncontrolled hypertension with new arrhythmia — referred for cardiac workup.", ar: "ارتفاع ضغط غير مضبوط مع اضطراب نظم جديد — أحال للتقييم القلبي." }, time: { en: "1h ago", ar: "قبل ساعة" } },
    { id: "rn2", fromDoctorId: "d2", patientName: { en: "Child, 9", ar: "طفل، 9" }, summary: { en: "Suspected congenital cardiac anomaly — needs echo and pediatric cardiology review.", ar: "اشتباه شذوذ قلبي خلقي — يحتاج إيكو ومراجعة قلب أطفال." }, time: { en: "3h ago", ar: "قبل 3 ساعات" } },
  ];
  var doctorMetrics = [
    { id: "m1", labelKey: "doctor.metricArticles", value: "24", delta: "+3", trendDir: "up" },
    { id: "m2", labelKey: "doctor.metricUpvotes", value: "4.8k", delta: "+312", trendDir: "up" },
    { id: "m3", labelKey: "doctor.metricReferrals", value: "18", delta: "+2", trendDir: "up" },
    { id: "m4", labelKey: "doctor.metricPatients", value: "47", delta: "+5", trendDir: "up" },
  ];

  /* ===================================================================
   * 10. CLINICAL REFERENCES + GUIDELINES  (AI Clinical Assistant)
   * -------------------------------------------------------------------
   * guidelines — selectable source filters (NICE/RCOG/ACOG/FIGO/ESHRE).
   *   Schema: { code, name:{en,ar}, color (badge classes) }
   * clinicalRefs — linked official guideline pages / professional sources.
   *   Schema: { id, title, source, specialtyId, summary, url,
   *             guidelines:[code], year?, lastUpdated?, verificationStatus }
   * =================================================================== */
  var guidelines = [
    { code: "NICE", name: { en: "NICE — National Institute for Health and Care Excellence", ar: "NICE — المعهد الوطني للتميز في الصحة والرعاية" }, color: "border-sky-300 bg-sky-50 text-sky-700" },
    { code: "RCOG", name: { en: "RCOG — Royal College of Obstetricians and Gynaecologists", ar: "RCOG — الكلية الملكية لأطباء النساء والتوليد" }, color: "border-violet-300 bg-violet-50 text-violet-700" },
    { code: "ACOG", name: { en: "ACOG — American College of Obstetricians and Gynecologists", ar: "ACOG — الكلية الأمريكية لأطباء النساء والتوليد" }, color: "border-teal-300 bg-teal-50 text-teal-700" },
    { code: "FIGO", name: { en: "FIGO — International Federation of Gynecology and Obstetrics", ar: "FIGO — الاتحاد الدولي لأمراض النساء والتوليد" }, color: "border-amber-300 bg-amber-50 text-amber-700" },
    { code: "ESHRE", name: { en: "ESHRE — European Society of Human Reproduction and Embryology", ar: "ESHRE — الجمعية الأوروبية للتكاثر البشري وعلم الأجنة" }, color: "border-rose-300 bg-rose-50 text-rose-700" },
    { code: "ESC", name: { en: "ESC — European Society of Cardiology", ar: "ESC — الجمعية الأوروبية للقلب" }, color: "border-cyan-300 bg-cyan-50 text-cyan-700" },
    { code: "AHA", name: { en: "AHA — American Heart Association", ar: "AHA — جمعية القلب الأمريكية" }, color: "border-red-300 bg-red-50 text-red-700" },
    { code: "ADA", name: { en: "ADA — American Diabetes Association", ar: "ADA — الجمعية الأمريكية للسكري" }, color: "border-orange-300 bg-orange-50 text-orange-700" },
    { code: "IDSA", name: { en: "IDSA — Infectious Diseases Society of America", ar: "IDSA — جمعية الأمراض المعدية الأمريكية" }, color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
    { code: "AAN", name: { en: "AAN — American Academy of Neurology", ar: "AAN — الأكاديمية الأمريكية لطب الأعصاب" }, color: "border-indigo-300 bg-indigo-50 text-indigo-700" },
    { code: "AAP", name: { en: "AAP — American Academy of Pediatrics", ar: "AAP — الأكاديمية الأمريكية لطب الأطفال" }, color: "border-amber-300 bg-amber-50 text-amber-700" },
    { code: "AAD", name: { en: "AAD — American Academy of Dermatology", ar: "AAD — الأكاديمية الأمريكية للأمراض الجلدية" }, color: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700" },
    { code: "ASRM", name: { en: "ASRM — American Society for Reproductive Medicine", ar: "ASRM — الجمعية الأمريكية للطب التناسلي" }, color: "border-orange-300 bg-orange-50 text-orange-700" },
    { code: "WHO", name: { en: "WHO — World Health Organization", ar: "WHO — منظمة الصحة العالمية" }, color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  ];
  function getGuideline(code) {
    return guidelines.filter(function (item) { return item.code === code; })[0] || null;
  }
  var clinicalRefs = [
    {
      id: "r1", year: 2023, lastUpdated: 2023,
      title: { en: "2023 ESC Guidelines for the Management of Acute Coronary Syndromes", ar: "إرشادات الجمعية الأوروبية لأمراض القلب لعام 2023 لتدبير المتلازمات التاجية الحادة" },
      source: { en: "European Society of Cardiology (ESC)", ar: "الجمعية الأوروبية لأمراض القلب" },
      specialtyId: "cardio", guidelines: ["ESC"],
      summary: { en: "Official ESC clinical practice guideline for acute coronary syndromes. The app should link to the source rather than convert this index entry into patient-specific treatment advice.", ar: "إرشاد سريري رسمي من ESC للمتلازمات التاجية الحادة. ينبغي أن يربط التطبيق بالمصدر، لا أن يحوّل هذا الفهرس إلى نصيحة علاجية خاصة بمريض." },
      url: "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r2", year: 2026, lastUpdated: 2026,
      title: { en: "Diagnosis and Classification of Diabetes: Standards of Care in Diabetes—2026 (Section 2)", ar: "تشخيص السكري وتصنيفه: معايير الرعاية في السكري لعام 2026، القسم الثاني" },
      source: { en: "American Diabetes Association (ADA)", ar: "الجمعية الأمريكية للسكري" },
      specialtyId: "endo", guidelines: ["ADA"],
      summary: { en: "Official ADA 2026 diagnostic criteria. For nonpregnant adults, laboratory A1C ≥6.5% or fasting plasma glucose ≥126 mg/dL after at least 8 hours without caloric intake meets a diagnostic threshold; absent unequivocal hyperglycaemia, two abnormal results are required.", ar: "معايير تشخيصية رسمية من ADA لعام 2026. لدى البالغين غير الحوامل، يُعد HbA1c بمقدار 6.5% أو أكثر أو سكر البلازما الصائم بمقدار 126 ملغم/دل أو أكثر بعد 8 ساعات على الأقل دون سعرات حدًا تشخيصيًا؛ وعند غياب فرط سكر واضح لا لبس فيه، يلزم وجود نتيجتين غير طبيعيتين." },
      url: "https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r3", year: 2019, lastUpdated: 2019,
      title: { en: "Psoriasis Clinical Guidelines", ar: "الإرشادات السريرية لمرض الصدفية" },
      source: { en: "American Academy of Dermatology (AAD)", ar: "الأكاديمية الأمريكية للأمراض الجلدية" },
      specialtyId: "derma", guidelines: ["AAD"],
      summary: { en: "Official AAD psoriasis guideline collection. Individual recommendations vary by treatment modality; check the linked guideline and its evidence tables before making clinical decisions.", ar: "مجموعة الإرشادات الرسمية من AAD بشأن الصدفية. تختلف التوصيات بحسب طريقة العلاج؛ لذا راجع الإرشاد المرتبط وجداول الأدلة قبل اتخاذ القرارات السريرية." },
      url: "https://www.aad.org/member/clinical-quality/guidelines/psoriasis",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r4", year: 2019, lastUpdated: 2019,
      title: { en: "Hypertension in Pregnancy: Diagnosis and Management (NICE NG133)", ar: "ارتفاع ضغط الدم أثناء الحمل: التشخيص والتدبير، إرشاد NICE NG133" },
      source: { en: "National Institute for Health and Care Excellence (NICE)", ar: "المعهد الوطني للتميز في الصحة والرعاية" },
      specialtyId: "obgyn", guidelines: ["NICE"],
      summary: { en: "Official NICE guideline on assessment and management of hypertensive disorders in pregnancy. Always check the recommendation text, update history and local maternity pathway.", ar: "إرشاد NICE الرسمي لتقييم اضطرابات ارتفاع ضغط الدم أثناء الحمل وتدبيرها. راجع نص التوصية وسجل التحديثات ومسار رعاية الأمومة المحلي دائمًا." },
      url: "https://www.nice.org.uk/guidance/ng133/chapter/recommendations",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r5", year: 2023, lastUpdated: 2023,
      title: { en: "2023 International Evidence-based Guideline for the Assessment and Management of PCOS", ar: "الإرشاد الدولي المبني على الأدلة لعام 2023 لتقييم متلازمة تكيس المبايض وتدبيرها" },
      source: { en: "ESHRE / ASRM and international partners", ar: "الجمعية الأوروبية للتكاثر البشري وعلم الأجنة والجمعية الأمريكية للطب التناسلي وشركاء دوليون" },
      specialtyId: "obgyn", guidelines: ["ESHRE", "ASRM"],
      summary: { en: "Official guideline hub for the 2023 international PCOS guideline. Use the linked full guideline and evidence-based recommendations; individual care depends on diagnostic context and patient priorities.", ar: "الصفحة الرسمية للإرشاد الدولي لعام 2023 بشأن متلازمة تكيس المبايض. استخدم الإرشاد الكامل والتوصيات المبنية على الأدلة؛ إذ تعتمد الرعاية الفردية على سياق التشخيص وأولويات المريضة." },
      url: "https://www.eshre.eu/Guidelines-and-Legal/Guidelines/Polycystic-ovary-syndrome",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r6", year: 2025, lastUpdated: 2025,
      title: { en: "2025 AHA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults", ar: "إرشاد AHA لعام 2025 للوقاية من ارتفاع ضغط الدم لدى البالغين واكتشافه وتقييمه وتدبيره" },
      source: { en: "American Heart Association (AHA)", ar: "جمعية القلب الأمريكية" },
      specialtyId: "cardio", guidelines: ["AHA"],
      summary: { en: "Official AHA summary of adult blood-pressure categories and management recommendations. The normal category is systolic <120 mmHg and diastolic <80 mmHg; diagnosis depends on appropriate repeated measurement and clinical assessment.", ar: "ملخص رسمي من AHA لفئات ضغط الدم لدى البالغين وتوصيات تدبيره. تُعرّف الفئة الطبيعية بانقباضي أقل من 120 مم زئبق وانبساطي أقل من 80 مم زئبق؛ ويعتمد التشخيص على القياس المتكرر بالطريقة الصحيحة والتقييم السريري." },
      url: "https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r7", year: 2026, lastUpdated: 2026,
      title: { en: "Glycemic Goals, Hypoglycemia, and Hyperglycemic Crises: Standards of Care in Diabetes—2026 (Section 6)", ar: "أهداف سكر الدم ونقص السكر وفرط السكر: معايير الرعاية في السكري لعام 2026، القسم السادس" },
      source: { en: "American Diabetes Association (ADA)", ar: "الجمعية الأمريكية للسكري" },
      specialtyId: "endo", guidelines: ["ADA"],
      summary: { en: "ADA 2026 states that A1C <7% is appropriate for many nonpregnant adults, but goals should be individualized. It also lists a preprandial capillary glucose target of 80–130 mg/dL for many nonpregnant adults.", ar: "تذكر ADA لعام 2026 أن هدف HbA1c الأقل من 7% مناسب لكثير من البالغين غير الحوامل، لكن الأهداف يجب أن تكون فردية. كما تذكر هدفًا عامًا لسكر الدم الشعيري قبل الوجبات قدره 80–130 ملغم/دل لكثير من البالغين غير الحوامل." },
      url: "https://doi.org/10.2337/dc26-s006",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r8", year: 2026, lastUpdated: 2026,
      title: { en: "Knowledge and Skills Required for Antimicrobial Stewardship Leaders", ar: "المعارف والمهارات المطلوبة لقادة ترشيد استخدام مضادات الميكروبات" },
      source: { en: "Infectious Diseases Society of America (IDSA)", ar: "جمعية الأمراض المعدية الأمريكية" },
      specialtyId: "infectious", guidelines: ["IDSA"],
      summary: { en: "Official IDSA professional resource describing knowledge and skills for antimicrobial stewardship leadership. It is not an organism-specific treatment guideline and must not be used as a substitute for local antimicrobial protocols.", ar: "مرجع مهني رسمي من IDSA يصف المعارف والمهارات اللازمة لقيادة برامج ترشيد المضادات الميكروبية. ليس إرشادًا علاجيًا خاصًا بمسبب مرضي، ولا يحل محل بروتوكولات المضادات المحلية." },
      url: "https://www.idsociety.org/practice-guideline/knowledge-and-skills/",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r9", year: 2026, lastUpdated: 2026,
      title: { en: "Adult Migraine Prevention: AAN Guideline Subcommittee Clinical Practice Guideline", ar: "الوقاية من الشقيقة لدى البالغين: إرشاد الممارسة السريرية للجنة الإرشادات في الأكاديمية الأمريكية لطب الأعصاب" },
      source: { en: "American Academy of Neurology (AAN)", ar: "الأكاديمية الأمريكية لطب الأعصاب" },
      specialtyId: "neuro", guidelines: ["AAN"],
      summary: { en: "Official 2026 clinical practice guideline publication for adult migraine prevention. Read the full recommendations and patient-specific cautions before applying any intervention.", ar: "منشور إرشادي سريري رسمي لعام 2026 بشأن الوقاية من الشقيقة لدى البالغين. اقرأ التوصيات الكاملة والتحذيرات الخاصة بالمريض قبل تطبيق أي تدخل." },
      url: "https://www.neurology.org/doi/10.1212/WNL.0000000000214881",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r10", year: 2025, lastUpdated: 2025,
      title: { en: "Bright Futures / AAP Periodicity Schedule", ar: "جدول الفحوص الدورية لبرنامج برايت فيوتشرز والأكاديمية الأمريكية لطب الأطفال" },
      source: { en: "American Academy of Pediatrics (AAP)", ar: "الأكاديمية الأمريكية لطب الأطفال" },
      specialtyId: "pediatrics", guidelines: ["AAP"],
      summary: { en: "Official AAP preventive-care schedule for children and adolescents. Verify the current edition and local immunization recommendations; schedules may be updated.", ar: "الجدول الرسمي للرعاية الوقائية لدى الأطفال والمراهقين من AAP. تحقّق من الإصدار الحالي وتوصيات التطعيم المحلية؛ فقد تُحدّث الجداول." },
      url: "https://publications.aap.org/pediatriccare/pages/periodicity-schedule",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r11", year: 2022, lastUpdated: 2026,
      title: { en: "Fetal Monitoring in Labour (NICE NG229)", ar: "مراقبة الجنين أثناء المخاض، إرشاد NICE NG229" },
      source: { en: "National Institute for Health and Care Excellence (NICE)", ar: "المعهد الوطني للتميز في الصحة والرعاية" },
      specialtyId: "obgyn", guidelines: ["NICE"],
      summary: { en: "Official NICE intrapartum CTG guideline, published in 2022 and updated in March 2026. It defines baseline, variability, contractions and deceleration features, and overall CTG categorisation. These intrapartum categories must not be applied to antenatal CTG traces.", ar: "إرشاد NICE الرسمي لتخطيط قلب الجنين أثناء المخاض، نُشر عام 2022 وحُدّث في مارس 2026. يحدد خصائص المعدل الأساسي والتذبذب والانقباضات والتباطؤات والتصنيف العام للتخطيط. لا يجوز تطبيق تصنيفات المخاض هذه على تخطيطات ما قبل المخاض." },
      url: "https://www.nice.org.uk/guidance/ng229/chapter/recommendations",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r12", year: 2026, lastUpdated: 2026,
      title: { en: "2026 ACC/AHA Guideline on the Management of Dyslipidemia", ar: "إرشاد ACC/AHA لعام 2026 لتدبير اضطرابات الدهون" },
      source: { en: "American College of Cardiology / American Heart Association", ar: "الكلية الأمريكية لأمراض القلب وجمعية القلب الأمريكية" },
      specialtyId: "cardio", guidelines: ["AHA"],
      summary: { en: "Official 2026 dyslipidemia guideline. LDL-C goals and lipid-lowering decisions are risk-based; a single LDL-C number such as 132 mg/dL cannot be labelled universally above target without the patient's risk profile and clinical context.", ar: "إرشاد رسمي لعام 2026 بشأن اضطرابات الدهون. تعتمد أهداف LDL-C وقرارات العلاج الخافض للدهون على مستوى الخطورة؛ ولا يمكن وصف قراءة منفردة مثل 132 ملغم/دل بأنها أعلى من الهدف لدى الجميع دون معرفة عوامل الخطورة والسياق السريري للمريض." },
      url: "https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia/top-things-to-know",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r13", year: 2024, lastUpdated: 2024,
      title: { en: "2024 ESC Guidelines for the Management of Atrial Fibrillation", ar: "إرشادات ESC لعام 2024 لتدبير الرجفان الأذيني" },
      source: { en: "European Society of Cardiology (ESC)", ar: "الجمعية الأوروبية لأمراض القلب" },
      specialtyId: "cardio", guidelines: ["ESC"],
      summary: { en: "Official ESC guideline covering AF diagnosis and clinical assessment, including ECG confirmation and evaluation of symptoms. It is not a guideline for diagnosing premature atrial complexes from this synthetic example.", ar: "إرشاد ESC الرسمي الذي يتناول تشخيص الرجفان الأذيني وتقييمه السريري، بما في ذلك توثيق نظم القلب بتخطيط ECG وتقييم الأعراض. لا يُعد إرشادًا لتشخيص الانقباضات الأذينية المبكرة اعتمادًا على هذا المثال الاصطناعي." },
      url: "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/atrial-fibrillation",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r14", year: "Current", lastUpdated: 2026,
      title: { en: "All About Heart Rate (Pulse)", ar: "كل ما يتعلق بمعدل ضربات القلب والنبض" },
      source: { en: "American Heart Association (AHA)", ar: "جمعية القلب الأمريكية" },
      specialtyId: "cardio", guidelines: ["AHA"],
      summary: { en: "AHA explains that a resting heart rate of 60–100 bpm is common for most adults when sitting or lying calmly and feeling well. Interpret a rate alongside the person's age, medicines, symptoms and clinical context.", ar: "توضح AHA أن معدل القلب أثناء الراحة بين 60 و100 نبضة/دقيقة شائع لدى معظم البالغين عند الجلوس أو الاستلقاء بهدوء والشعور بصحة جيدة. يجب تفسير المعدل وفق العمر والأدوية والأعراض والسياق السريري." },
      url: "https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r15", year: 2024, lastUpdated: 2024,
      title: { en: "Guideline on Haemoglobin Cutoffs to Define Anaemia in Individuals and Populations", ar: "إرشاد حدود الهيموغلوبين لتعريف فقر الدم لدى الأفراد والمجموعات" },
      source: { en: "World Health Organization (WHO)", ar: "منظمة الصحة العالمية" },
      specialtyId: "gp", guidelines: ["WHO"],
      summary: { en: "WHO 2024 defines anaemia in nonpregnant women aged 15–65 years as haemoglobin <120 g/L; 110–119 g/L is classified as mild anaemia. Pregnancy and other population-specific thresholds differ.", ar: "تعرف WHO لعام 2024 فقر الدم لدى النساء غير الحوامل بعمر 15–65 سنة عندما يكون الهيموغلوبين أقل من 120 غ/لتر؛ ويصنف المجال 110–119 غ/لتر فقر دم خفيفًا. تختلف الحدود أثناء الحمل ولدى الفئات السكانية الأخرى." },
      url: "https://www.who.int/publications/i/item/9789240088542",
      verificationStatus: "source-link-not-independently-verified"
    },
    {
      id: "r16", year: 2020, lastUpdated: 2020,
      title: { en: "WHO Guideline on Use of Ferritin Concentrations to Assess Iron Status", ar: "إرشاد WHO لاستخدام تركيزات الفيريتين لتقييم حالة الحديد" },
      source: { en: "World Health Organization (WHO)", ar: "منظمة الصحة العالمية" },
      specialtyId: "gp", guidelines: ["WHO"],
      summary: { en: "WHO guidance on interpreting ferritin. A concentration <15 µg/L indicates depleted iron stores in otherwise healthy adults; inflammation can raise ferritin, so inflammatory context must be considered.", ar: "إرشاد WHO لتفسير الفيريتين. يشير التركيز الأقل من 15 ميكروغرام/لتر إلى نفاد مخازن الحديد لدى البالغين الأصحاء عمومًا؛ وقد يرفع الالتهاب الفيريتين، لذلك يجب مراعاة سياق الالتهاب." },
      url: "https://www.who.int/publications/i/item/9789240000124",
      verificationStatus: "source-link-not-independently-verified"
    }
  ];

  /* Data-side specialty/source filtering helper for the app.js filter UI.
   * Pass specialtyId="all" (or null) to include every specialty.
   * Pass guidelineFilters as an optional array of source codes. */
  function getClinicalRefsBySpecialty(specialtyId, guidelineFilters) {
    var rows = clinicalRefs.slice();
    if (specialtyId && specialtyId !== "all") {
      rows = rows.filter(function (ref) { return ref.specialtyId === specialtyId; });
    }
    if (Array.isArray(guidelineFilters) && guidelineFilters.length) {
      rows = rows.filter(function (ref) {
        return Array.isArray(ref.guidelines) && ref.guidelines.some(function (code) {
          return guidelineFilters.indexOf(code) !== -1;
        });
      });
    }
    return rows;
  }


  /* ===================================================================
   * 11. PATIENT SUMMARY + CONSULTANT MENTOR MODE
   * -------------------------------------------------------------------
   * patientSummary — fictional demonstration summary used by the Patient Summary modal.
   * mentorAnalysis — 6-card structured analysis for an uploaded CTG/lab
   *   report, plus 3 board-style MCQs. Returned by
   *   ApiService.generateMentorAnalysis() when Gemini is offline.
   * =================================================================== */
  var patientSummary = {
    patientName: { en: "Reem S.", ar: "ريم س." },
    ageGender: { en: "34, Female", ar: "34 سنة، أنثى" },
    summary: {
      en: "SYNTHETIC DEMO RECORD — 34-year-old nonpregnant woman with a fictional history of type 2 diabetes. The sample record includes HbA1c 7.4%, fasting plasma glucose 130 mg/dL after an 8-hour fast, LDL-C 132 mg/dL, and a descriptive ECG sample mentioning occasional PACs. She reports intermittent palpitations for 2 weeks and notices them more after caffeine; this is a reported association, not proof of causation. All values and history are fictional.",
      ar: "سجل تجريبي اصطناعي — امرأة غير حامل تبلغ 34 عامًا ولديها تاريخ افتراضي من السكري من النوع الثاني. يتضمن السجل النموذجي HbA1c بقيمة 7.4% وسكر بلازما صائمًا قدره 130 ملغم/دل بعد صيام 8 ساعات وLDL-C بقيمة 132 ملغم/دل ووصفًا افتراضيًا لتخطيط يتضمن انقباضات أذينية مبكرة متفرقة. تذكر المريضة خفقانًا متقطعًا منذ أسبوعين وتلاحظ ظهوره أكثر بعد الكافيين؛ وهذه ملاحظة زمنية وليست إثباتًا للسببية. جميع القيم والتاريخ افتراضية."
    },
    clinicalProfile: {
      recordType: { en: "Synthetic demonstration profile — not a real patient", ar: "ملف تجريبي اصطناعي — ليس لمريض حقيقي" },
      recordDate: "2026-11-08",
      referenceIds: ["r6", "r7", "r12", "r14"],
      demographics: {
        ageYears: 34,
        sex: { en: "Female", ar: "أنثى" },
        pregnancyStatus: { en: "Not pregnant in this fictional scenario", ar: "غير حامل في هذا السيناريو الافتراضي" }
      },
      conditions: [
        { name: { en: "Type 2 diabetes mellitus", ar: "داء السكري من النوع الثاني" }, status: { en: "Documented in demo history since 2021", ar: "مسجل في التاريخ التجريبي منذ 2021" } }
      ],
      medications: [
        { name: { en: "Metformin", ar: "ميتفورمين" }, detail: { en: "Fictional seed entry: 500 mg orally twice daily with meals. This is sample history only, not a prescription or dosing recommendation.", ar: "إدخال تجريبي افتراضي: 500 ملغم عن طريق الفم مرتين يوميًا مع الطعام. هذا سجل توضيحي فقط وليس وصفة أو توصية بالجرعة." } }
      ],
      familyHistory: [
        { relation: { en: "Mother", ar: "الأم" }, detail: { en: "Type 2 diabetes (fictional family history)", ar: "السكري من النوع الثاني (تاريخ عائلي افتراضي)" } },
        { relation: { en: "Father", ar: "الأب" }, detail: { en: "Dyslipidaemia (fictional family history)", ar: "اضطراب دهون الدم (تاريخ عائلي افتراضي)" } }
      ],
      socialHistory: {
        smoking: { en: "Never smoker in this fictional scenario", ar: "لا تدخن في هذا السيناريو الافتراضي" },
        alcohol: { en: "No alcohol use reported in this fictional scenario", ar: "لا يوجد تعاطٍ للكحول بحسب هذا السيناريو الافتراضي" },
        activity: { en: "See the sample activity-tracker measurement below; it is not a verified habitual average.", ar: "راجع قراءة متتبع النشاط أدناه؛ فهي ليست متوسطًا معتادًا تم التحقق منه." }
      },
      allergies: { en: "No known drug allergies recorded in this synthetic profile; this is not independently verified.", ar: "لا توجد حساسية دوائية معروفة مسجلة في هذا الملف الاصطناعي؛ ولم يتم التحقق من ذلك بشكل مستقل." },
      symptoms: [
        { name: { en: "Intermittent palpitations", ar: "خفقان متقطع" }, duration: { en: "2 weeks", ar: "أسبوعان" }, context: { en: "Patient-reported increase after caffeine; temporal association only, not proof of cause.", ar: "تذكر المريضة زيادة الخفقان بعد الكافيين؛ ارتباط زمني فقط وليس إثباتًا للسبب." } }
      ],
      observations: [
        { id: "obs-hr", name: { en: "Resting heart rate", ar: "معدل ضربات القلب أثناء الراحة" }, value: 72, unit: "bpm", date: "2026-11-08", interpretation: { en: "Within the commonly cited adult resting range of 60–100 bpm when measured at rest in a calm, well person; not a standalone diagnosis.", ar: "ضمن المجال الشائع لمعدل القلب أثناء الراحة لدى البالغين، 60–100 نبضة/دقيقة، عند القياس في حالة راحة وهدوء وصحة عامة؛ ولا يشكل تشخيصًا بمفرده." } },
        { id: "obs-bp", name: { en: "Blood pressure", ar: "ضغط الدم" }, value: "118/76", unit: "mmHg", date: "2026-11-08", interpretation: { en: "Within the AHA adult normal category (<120 systolic and <80 diastolic) for a nonpregnant adult; a single reading does not establish a long-term diagnosis.", ar: "ضمن الفئة الطبيعية للبالغين وفق تصنيف AHA (انقباضي أقل من 120 وانبساطي أقل من 80) لدى غير الحامل؛ ولا تكفي قراءة واحدة لتحديد تشخيص طويل الأمد." } },
        { id: "obs-steps", name: { en: "Daily steps", ar: "الخطوات اليومية" }, value: 8420, unit: "steps", date: "2026-11-08", interpretation: { en: "Fictional activity-tracker reading; no universal clinical interpretation is assigned to this single count.", ar: "قراءة افتراضية من متتبع النشاط؛ ولا يُمنح هذا العدد المنفرد تفسيرًا سريريًا عامًا." } },
        { id: "obs-sleep", name: { en: "Sleep duration", ar: "مدة النوم" }, value: 7.5, unit: "hours", date: "2026-11-08", interpretation: { en: "Fictional tracker reading; this single value is not a clinical assessment of sleep health.", ar: "قراءة افتراضية من متتبع النوم؛ ولا تمثل هذه القيمة المنفردة تقييمًا سريريًا لصحة النوم." } }
      ],
      laboratoryResults: [
        { id: "lab-a1c", name: { en: "HbA1c", ar: "السكر التراكمي HbA1c" }, value: 7.4, unit: "%", date: "2026-10-15", interpretation: { en: "Above the <7% goal used for many nonpregnant adults with diabetes; the appropriate goal must be individualized.", ar: "أعلى من هدف أقل من 7% المستخدم لدى كثير من البالغين غير الحوامل المصابين بالسكري؛ ويجب تحديد الهدف المناسب لكل مريض على حدة." } },
        { id: "lab-fpg", name: { en: "Fasting plasma glucose", ar: "سكر البلازما الصائم" }, value: 130, unit: "mg/dL", date: "2026-10-15", fastingHours: 8, interpretation: { en: "A synthetic result after an 8-hour fast. In a person without known diabetes this is at the ADA diagnostic threshold (≥126 mg/dL), but this demo patient already has a fictional diabetes history; ongoing management interpretation is individualized.", ar: "نتيجة افتراضية بعد صيام 8 ساعات. لدى شخص لا يُعرف عنه السكري، تبلغ هذه القراءة عتبة التشخيص المعتمدة من ADA (126 ملغم/دل أو أكثر)، لكن هذه المريضة التجريبية لديها أصلًا تاريخ افتراضي للسكري؛ ويجب تفسيرها ضمن خطة المتابعة الفردية." } },
        { id: "lab-total", name: { en: "Total cholesterol", ar: "الكوليسترول الكلي" }, value: 212, unit: "mg/dL", date: "2026-11-08", interpretation: { en: "Above the traditional desirable level of <200 mg/dL, but total cholesterol alone does not determine treatment; assess the complete lipid profile and overall cardiovascular risk.", ar: "أعلى من المستوى المرغوب التقليدي الأقل من 200 ملغم/دل، لكن الكوليسترول الكلي وحده لا يحدد العلاج؛ يجب تقييم ملف الدهون الكامل والخطورة القلبية الوعائية الإجمالية." } },
        { id: "lab-ldl", name: { en: "LDL-C (synthetic calculated value)", ar: "كوليسترول LDL (قيمة محسوبة افتراضية)" }, value: 132, unit: "mg/dL", date: "2026-11-08", method: { en: "Friedewald calculation from total cholesterol 212, HDL-C 52 and triglycerides 140 mg/dL; the sample values are internally consistent.", ar: "محسوب بمعادلة فريدفالد من الكوليسترول الكلي 212 وHDL-C بقيمة 52 والدهون الثلاثية 140 ملغم/دل؛ القيم التجريبية متسقة حسابيًا." }, interpretation: { en: "Do not label this value universally above target. The LDL-C goal and treatment decision depend on cardiovascular risk, prior ASCVD, comorbidities and clinician assessment.", ar: "لا تصف هذه القيمة بأنها أعلى من الهدف لدى الجميع. يعتمد هدف LDL-C وقرار العلاج على الخطورة القلبية الوعائية ووجود مرض تصلبي سابق والأمراض المصاحبة وتقييم الطبيب." } },
        { id: "lab-hdl", name: { en: "HDL-C", ar: "كوليسترول HDL" }, value: 52, unit: "mg/dL", date: "2026-11-08", interpretation: { en: "Not below the commonly used low-HDL threshold of 50 mg/dL for women; HDL-C is interpreted as part of overall risk and is not a stand-alone treatment target.", ar: "ليست أقل من الحد الشائع لانخفاض HDL لدى النساء وهو 50 ملغم/دل؛ ويُفسر HDL ضمن الخطورة الإجمالية ولا يُعد هدفًا علاجيًا مستقلًا." } },
        { id: "lab-tg", name: { en: "Triglycerides", ar: "الدهون الثلاثية" }, value: 140, unit: "mg/dL", date: "2026-11-08", fastingStatus: { en: "Not specified in this synthetic record", ar: "حالة الصيام غير محددة في هذا السجل الافتراضي" }, interpretation: { en: "Below the common fasting threshold of 150 mg/dL; fasting status and the laboratory reference interval should be checked before categorisation.", ar: "أقل من الحد الشائع للدهون الثلاثية أثناء الصيام وهو 150 ملغم/دل؛ يجب التحقق من حالة الصيام والمجال المرجعي للمختبر قبل التصنيف." } },
        { id: "lab-nonhdl", name: { en: "Non-HDL-C (calculated: total cholesterol − HDL-C)", ar: "كوليسترول non-HDL (محسوب: الكلي ناقص HDL)" }, value: 160, unit: "mg/dL", date: "2026-11-08", interpretation: { en: "Calculated as 212 − 52 mg/dL. The appropriate non-HDL-C goal depends on cardiovascular-risk category and the current treatment guideline.", ar: "محسوب بطرح 52 من 212 ملغم/دل. يعتمد هدف non-HDL-C المناسب على فئة الخطورة القلبية والإرشادات العلاجية الحالية." } }
      ],
      ecg: {
        summary: { en: "Fictional text description: sinus rhythm with occasional premature atrial complexes (PACs); no definite acute ST-segment elevation described in the sample.", ar: "وصف نصي افتراضي: نظم جيبي مع انقباضات أذينية مبكرة متفرقة (PACs)، ولا يصف المثال ارتفاعًا حادًا مؤكدًا في مقطع ST." },
        limitation: { en: "No original ECG waveform is attached. This description is synthetic and cannot exclude acute coronary syndrome, intermittent arrhythmia or other disease.", ar: "لا يوجد تسجيل موجي أصلي لتخطيط القلب مرفق. هذا الوصف اصطناعي ولا يستبعد المتلازمة التاجية الحادة أو اضطراب النظم المتقطع أو أمراضًا أخرى." }
      },
      dataQuality: { en: "All patient details and measurements in this profile are fabricated seed data for interface testing. They must never be merged with actual patient records.", ar: "جميع بيانات المريضة والقياسات في هذا الملف بيانات تجريبية مصطنعة لاختبار الواجهة. ويجب عدم دمجها مطلقًا مع سجلات مرضى حقيقيين." }
    },
    keyFindings: [
      { en: "HbA1c 7.4% — above the common <7% goal for many nonpregnant adults; individualize the goal.", ar: "HbA1c بقيمة 7.4% — أعلى من الهدف الشائع الأقل من 7% لدى كثير من البالغين غير الحوامل؛ ويجب تخصيص الهدف لكل مريض." },
      { en: "LDL-C 132 mg/dL — cardiovascular-risk assessment is needed before deciding the appropriate target.", ar: "LDL-C بقيمة 132 ملغم/دل — يلزم تقييم الخطورة القلبية قبل تحديد الهدف المناسب." },
      { en: "Fasting plasma glucose 130 mg/dL after 8 hours — interpret in the context of known diabetes and the treatment plan.", ar: "سكر البلازما الصائم 130 ملغم/دل بعد 8 ساعات — يُفسر ضمن سياق السكري المعروف وخطة العلاج." },
      { en: "Synthetic ECG description mentions occasional PACs; no source tracing is attached.", ar: "الوصف الافتراضي للتخطيط يذكر انقباضات أذينية مبكرة متفرقة؛ ولا يوجد تسجيل أصلي مرفق." },
      { en: "Palpitations for 2 weeks; caffeine is a reported temporal association, not an established cause.", ar: "خفقان منذ أسبوعين؛ والكافيين ارتباط زمني بحسب وصف المريضة وليس سببًا مثبتًا." }
    ],
    recommendations: [
      { en: "A clinician may consider ambulatory rhythm monitoring if indicated by the history, examination and symptom frequency.", ar: "قد يدرس الطبيب مراقبة نظم القلب المتنقلة إذا استدعى ذلك التاريخ المرضي والفحص وتواتر الأعراض." },
      { en: "Review the individualized HbA1c goal and diabetes management plan with the treating clinician.", ar: "راجع هدف HbA1c الفردي وخطة متابعة السكري مع الطبيب المعالج." },
      { en: "Review overall cardiovascular risk and the appropriate LDL-C target with the treating clinician. Do not start or stop medication based on this demo summary.", ar: "راجع مستوى الخطورة القلبية والهدف المناسب لـ LDL-C مع الطبيب المعالج. لا تبدأ دواءً أو توقفه اعتمادًا على هذا الملخص التجريبي." }
    ]
  };
  var mentorAnalysis = {
    reportTitle: {
      en: "DEMO CASE — Intrapartum CTG teaching example (not an uploaded patient report)",
      ar: "حالة تجريبية — مثال تعليمي لتخطيط قلب الجنين أثناء المخاض (ليس تقرير مريض مرفوعًا)",
    },
    reportType: {
      en: "Illustrative CTG training data — demo only",
      ar: "بيانات تدريبية توضيحية لتخطيط قلب الجنين أثناء المخاض — للعرض فقط",
    },
    probabilityNote: {
      en: "No validated or calibrated diagnostic probabilities are available in this demo. Differentials are qualitative teaching considerations only; no percentages are calculated.",
      ar: "لا تتوفر في هذه النسخة التجريبية احتمالات تشخيصية معتمدة أو معايرة. التشخيصات التفريقية اعتبارات تعليمية وصفية فقط، ولا تُحسب لها نسب مئوية."
    },
    sampleData: {
      context: { en: "Fictional intrapartum CTG trace for training only. NICE NG229 categories apply to monitoring during labour, not antenatal CTG.", ar: "تخطيط افتراضي أثناء المخاض لأغراض التدريب فقط. تنطبق تصنيفات NICE NG229 على مراقبة الجنين أثناء المخاض، لا على تخطيط ما قبل المخاض." },
      measures: [
        { name: { en: "Baseline fetal heart rate", ar: "المعدل الأساسي لقلب الجنين" }, value: "150", unit: "bpm", category: { en: "White feature: 110–160 bpm", ar: "سمة بيضاء: 110–160 نبضة/دقيقة" } },
        { name: { en: "Baseline variability", ar: "التذبذب الأساسي" }, value: "3 for 35 minutes", unit: "bpm", category: { en: "Amber feature: <5 bpm for 30–50 minutes", ar: "سمة كهرمانية: أقل من 5 نبضات/دقيقة لمدة 30–50 دقيقة" } },
        { name: { en: "Contractions", ar: "انقباضات الرحم" }, value: "4", unit: "per 10 minutes", category: { en: "White feature: fewer than 5 per 10 minutes", ar: "سمة بيضاء: أقل من 5 انقباضات خلال 10 دقائق" } },
        { name: { en: "Late decelerations", ar: "التباطؤات المتأخرة" }, value: { en: "Present", ar: "موجودة" }, category: { en: "Red feature under current NICE NG229", ar: "سمة حمراء وفق NICE NG229 الحالي" } }
      ],
      overallCategory: { en: "Pathological in this constructed example because a red feature is present. This is not a real trace or a management instruction.", ar: "التصنيف مرضي في هذا المثال المصطنع لوجود سمة حمراء. هذا ليس تخطيطًا حقيقيًا ولا تعليمات علاجية." },
      sourceUrl: "https://www.nice.org.uk/guidance/ng229/chapter/recommendations",
      referenceIds: ["r11"]
    },
    /* app.js expects guideline CODES (strings), not {en,ar} objects. */
    guidelines: ["NICE"],
    pathophysiology: {
      physiology: {
        en: "A CTG records the fetal heart-rate pattern and uterine activity. Interpretation considers baseline rate, variability, accelerations, decelerations, contractions, and the full maternal and fetal clinical context. CTG is an assessment tool, not a diagnosis by itself.",
        ar: "يسجل تخطيط قلب الجنين نمط معدل ضربات قلب الجنين ونشاط الرحم. ويشمل التفسير المعدل الأساسي والتذبذب والتسارعات والتباطؤات والانقباضات والسياق السريري الكامل للأم والجنين. التخطيط أداة للتقييم وليس تشخيصًا مستقلًا.",
      },
      pathology: {
        en: "In this fictional intrapartum trace, baseline fetal heart rate is 150 bpm, variability is 3 bpm for 35 minutes, contractions are 4 per 10 minutes, and late decelerations are present. Under current NICE NG229, variability below 5 bpm for 30–50 minutes is an amber feature and any late deceleration is a red feature; one red feature makes the overall trace pathological. This is a constructed teaching example, not a real tracing or a delivery decision.",
        ar: "في هذا التخطيط الافتراضي أثناء المخاض، يبلغ المعدل الأساسي لقلب الجنين 150 نبضة/دقيقة، والتذبذب 3 نبضات/دقيقة لمدة 35 دقيقة، والانقباضات 4 خلال 10 دقائق، مع وجود تباطؤات متأخرة. وفق NICE NG229 الحالي، يعد التذبذب الأقل من 5 نبضات/دقيقة لمدة 30–50 دقيقة سمة كهرمانية، ويعد وجود أي تباطؤ متأخر سمة حمراء؛ ووجود سمة حمراء واحدة يجعل التصنيف العام للتخطيط مرضيًا. هذا مثال تعليمي مُنشأ وليس تخطيطًا حقيقيًا أو قرارًا بشأن الولادة.",
      },
    },
    differentials: [
      { dx: { en: "Possible uteroplacental compromise / fetal hypoxia", ar: "احتمال تأثر وظيفة المشيمة أو نقص أكسجة الجنين" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Potentially serious — clinical review required", ar: "قد يكون خطيرًا — يلزم تقييم سريري" } },
      { dx: { en: "Medication or maternal-factor effect", ar: "تأثير دوائي أو عامل متعلق بالأم" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Context-dependent", ar: "يعتمد على السياق" } },
      { dx: { en: "Fetal behavioural state / transient change", ar: "حالة نشاط الجنين أو تغير عابر" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Requires assessment in context", ar: "يتطلب التقييم ضمن السياق" } },
      { dx: { en: "Infection or another obstetric complication", ar: "عدوى أو مضاعفة توليدية أخرى" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Potentially serious", ar: "قد تكون خطيرة" } },
    ],
    decision: {
      intervene: {
        en: "For a real concerning trace or any maternal/fetal deterioration, obtain immediate senior obstetric review, assess the mother and fetus, check reversible contributors, and follow the current local intrapartum fetal-monitoring and emergency pathway. The treating obstetric team must determine the urgency and mode of delivery from the full clinical picture.",
        ar: "عند وجود تخطيط مقلق فعلي أو تدهور في حالة الأم أو الجنين، يجب طلب مراجعة فورية من اختصاصي التوليد المسؤول، وتقييم الأم والجنين، والتحقق من العوامل القابلة للتصحيح، واتباع مسار مراقبة الجنين والطوارئ المعتمد محليًا. ويحدد فريق التوليد المعالج مدى الاستعجال وطريقة الولادة بناءً على الحالة السريرية الكاملة.",
      },
      observe: {
        en: "Observation is appropriate only when the responsible clinician judges it safe after reviewing the complete trace and clinical context. Continue monitoring at the frequency required by the current local protocol and escalate promptly if the pattern or clinical condition worsens.",
        ar: "لا تكون المراقبة وحدها مناسبة إلا إذا قرر الطبيب المسؤول أنها آمنة بعد مراجعة التخطيط كاملًا والسياق السريري. تستمر المراقبة بالتواتر الذي يحدده البروتوكول المحلي الحالي، مع التصعيد سريعًا إذا ازداد اضطراب التخطيط أو ساءت الحالة السريرية.",
      },
    },
    pitfalls: {
      refs: {
        en: "Source: NICE NG229, Fetal Monitoring in Labour, recommendations 1.4.3–1.4.32 (including the current red classification for late decelerations). These criteria apply to intrapartum CTG. Verify the full trace and local maternity protocol; this example is not a treatment directive.",
        ar: "المصدر: NICE NG229، مراقبة الجنين أثناء المخاض، التوصيات 1.4.3–1.4.32، بما فيها التصنيف الأحمر الحالي للتباطؤات المتأخرة. تنطبق هذه المعايير على تخطيط المخاض. تحقق من التخطيط كاملًا وبروتوكول الأمومة المحلي؛ فهذا المثال ليس توجيهًا علاجيًا.",
      },
      pitfalls: [
        { en: "Interpreting a CTG without considering maternal observations, labour progress, medicines, and the wider clinical context.", ar: "تفسير التخطيط دون مراعاة العلامات الحيوية للأم وتقدم المخاض والأدوية والسياق السريري الأوسع." },
        { en: "Focusing on one feature instead of assessing the whole trace and its evolution over time.", ar: "التركيز على سمة واحدة بدل تقييم التخطيط كاملًا وتغيره بمرور الوقت." },
        { en: "Treating a generated probability or automated interpretation as a confirmed diagnosis.", ar: "التعامل مع احتمال رقمي أو تفسير آلي على أنه تشخيص مؤكد." },
        { en: "Allowing a second opinion or documentation step to delay urgent escalation when the clinical situation is deteriorating.", ar: "السماح للرأي الثاني أو التوثيق بتأخير التصعيد العاجل عند تدهور الحالة السريرية." },
      ],
    },
    pearls: {
      pearls: [
        { en: "Interpret the entire trace alongside maternal observations and labour progress.", ar: "فسّر التخطيط كاملًا بالاقتران مع مؤشرات الأم وتقدم المخاض." },
        { en: "Check signal quality and reversible clinical contributors before drawing conclusions.", ar: "تحقق من جودة الإشارة والعوامل السريرية القابلة للتصحيح قبل استخلاص النتائج." },
        { en: "Record who reviewed the trace, what was found, and the escalation plan.", ar: "وثّق الشخص الذي راجع التخطيط والنتائج وخطة التصعيد." },
      ],
      patientScript: {
        en: "The monitor has shown a pattern that needs a closer review. We are checking the tracing and your condition together, and a senior member of the maternity team will explain what it may mean and what options are appropriate. We will discuss any urgent next step with you as clearly as the situation allows.",
        ar: "أظهر جهاز المراقبة نمطًا يحتاج إلى مراجعة أدق. نراجع التخطيط وحالتك معًا، وسيشرح لك أحد كبار أعضاء فريق الولادة ما قد يعنيه ذلك والخيارات المناسبة. وسنوضح لك أي خطوة عاجلة وما تستلزمه الحالة بأكبر قدر ممكن من الوضوح.",
      },
    },
    quiz: [
      {
        q: { en: "What is the safest way to interpret a concerning CTG feature?", ar: "ما الطريقة الأكثر أمانًا لتفسير سمة مقلقة في تخطيط قلب الجنين؟" },
        options: [
          { en: "Review the whole trace with maternal/fetal context and obtain appropriate clinical review", ar: "مراجعة التخطيط كاملًا مع سياق الأم والجنين وطلب التقييم السريري المناسب" },
          { en: "Treat one feature as a definitive diagnosis", ar: "اعتبار سمة واحدة تشخيصًا نهائيًا" },
          { en: "Ignore the pattern if the baseline rate is normal", ar: "تجاهل النمط إذا كان المعدل الأساسي طبيعيًا" },
          { en: "Use an AI probability as the sole basis for delivery", ar: "استخدام احتمال الذكاء الاصطناعي وحده لاتخاذ قرار الولادة" },
        ],
        correct: 0,
        rationale: { en: "CTG interpretation requires the full trace, maternal/fetal context, and appropriate clinician review; an isolated feature or model score is not a diagnosis.", ar: "يتطلب تفسير التخطيط مراجعة التسجيل كاملًا وسياق الأم والجنين وتقييم المختص؛ ولا تُعد السمة المنفردة أو درجة النموذج تشخيصًا." },
      },
      {
        q: { en: "When a trace is concerning, what should guide the next step?", ar: "عندما يكون التخطيط مقلقًا، ما الذي ينبغي أن يوجه الخطوة التالية؟" },
        options: [
          { en: "A fixed waiting period for every patient", ar: "مدة انتظار ثابتة لكل مريضة" },
          { en: "The AI-generated probability alone", ar: "الاحتمال الناتج عن الذكاء الاصطناعي وحده" },
          { en: "Prompt clinical assessment, reversible factors, and the current local pathway", ar: "التقييم السريري السريع والعوامل القابلة للتصحيح والمسار المحلي المعتمد حاليًا" },
          { en: "The number of comments on the case", ar: "عدد التعليقات على الحالة" },
        ],
        correct: 2,
        rationale: { en: "The responsible clinical team must assess the full situation and follow the current local protocol; no universal timer replaces clinical judgment.", ar: "على الفريق الطبي المسؤول تقييم الحالة كاملة واتباع البروتوكول المحلي الحالي؛ فلا يوجد توقيت موحد يحل محل الحكم السريري." },
      },
      {
        q: { en: "What is the correct role of this demo analysis?", ar: "ما الدور الصحيح لهذا التحليل التجريبي؟" },
        options: [
          { en: "It replaces a senior obstetrician", ar: "يحل محل اختصاصي التوليد المسؤول" },
          { en: "It confirms fetal acidosis", ar: "يؤكد الحماض الجنيني" },
          { en: "It is a teaching example that requires clinician verification", ar: "هو مثال تعليمي يتطلب تحقق المختص" },
          { en: "It guarantees a delivery outcome", ar: "يضمن نتيجة الولادة" },
        ],
        correct: 2,
        rationale: { en: "This bundled object is seed/demo content, not analysis of an uploaded report and not a clinical decision tool.", ar: "هذا الكائن بيانات أولية للعرض، وليس تحليلًا لتقرير مرفوع أو أداة لاتخاذ قرار سريري." },
      },
    ],
  };

  /* Additional offline examples use the EXACT same output contract as
   * mentorAnalysis so the mentor UI can render them without a new schema.
   * All values below are fictional teaching examples, not patient results.
   * `mentorAnalysis` remains the default CTG fallback for backward compatibility. */
  var mentorAnalysisECG = {
    reportTitle: {
      en: "DEMO CASE — ECG teaching example (not an uploaded patient report)",
      ar: "حالة تجريبية — مثال تعليمي لتخطيط القلب (ليس تقرير مريض مرفوعًا)",
    },
    reportType: {
      en: "Illustrative 12-lead ECG training data — demo only",
      ar: "بيانات تدريبية توضيحية لتخطيط القلب ذي 12 اشتقاقًا — للعرض فقط",
    },
    probabilityNote: {
      en: "No validated or calibrated diagnostic probabilities are available in this demo. Differentials are qualitative teaching considerations only; no percentages are calculated.",
      ar: "لا تتوفر في هذه النسخة التجريبية احتمالات تشخيصية معتمدة أو معايرة. التشخيصات التفريقية اعتبارات تعليمية وصفية فقط، ولا تُحسب لها نسب مئوية."
    },
    sampleData: {
      context: { en: "Fictional 12-lead ECG measurements for a training screen only; there is no waveform file attached.", ar: "قياسات افتراضية لتخطيط قلب ذي 12 اشتقاقًا لاستخدامها في شاشة تدريبية فقط؛ ولا يوجد ملف موجي مرفق." },
      measures: [
        { name: { en: "Ventricular rate", ar: "معدل البطين" }, value: "78", unit: "bpm" },
        { name: { en: "PR interval", ar: "فترة PR" }, value: "160", unit: "ms", category: { en: "Within the usual adult range of 120–200 ms", ar: "ضمن المجال المعتاد للبالغين 120–200 مللي ثانية" } },
        { name: { en: "QRS duration", ar: "مدة QRS" }, value: "90", unit: "ms", category: { en: "Narrow QRS (<120 ms)", ar: "مركب QRS ضيق (أقل من 120 مللي ثانية)" } },
        { name: { en: "QTc", ar: "فترة QT المصححة" }, value: "420", unit: "ms", category: { en: "Illustrative value; correction formula and tracing quality must be checked", ar: "قيمة توضيحية؛ يجب التحقق من معادلة التصحيح وجودة التخطيط" } },
        { name: { en: "Rhythm description", ar: "وصف النظم" }, value: { en: "Sinus rhythm with occasional PACs", ar: "نظم جيبي مع انقباضات أذينية مبكرة متفرقة" } }
      ],
      sourceUrl: "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/atrial-fibrillation",
      referenceIds: ["r13"]
    },
    guidelines: ["ESC"],
    pathophysiology: {
      physiology: {
        en: "A 12-lead ECG records cardiac electrical activity from different directions. A structured reading reviews patient details, calibration, rate, rhythm, axis, intervals, waveform morphology and ST-T changes, then relates the tracing to symptoms and clinical context.",
        ar: "يسجل تخطيط القلب ذو 12 اشتقاقًا النشاط الكهربائي للقلب من اتجاهات مختلفة. وتشمل القراءة المنظمة بيانات المريض ومعايرة الجهاز ومعدل القلب والنظم والمحور والفترات وشكل الموجات وتغيرات ST-T، ثم ربط التخطيط بالأعراض والسياق السريري.",
      },
      pathology: {
        en: "This fictional teaching trace is described as sinus rhythm with occasional premature atrial complexes and no definite acute ST-segment elevation. An ECG description alone cannot exclude acute coronary syndrome or other serious disease; symptoms, serial ECGs, biomarkers and clinician assessment may be required.",
        ar: "يوصف هذا التخطيط التعليمي الافتراضي بأنه نظم جيبي مع انقباضات أذينية مبكرة متفرقة ودون ارتفاع حاد مؤكد في مقطع ST. ولا يكفي وصف التخطيط وحده لاستبعاد المتلازمة التاجية الحادة أو غيرها من الأمراض الخطيرة؛ فقد يلزم تقييم الأعراض وتخطيطات متتابعة ومؤشرات حيوية وتقييم الطبيب.",
      },
    },
    differentials: [
      { dx: { en: "Sinus rhythm with occasional premature atrial complexes", ar: "نظم جيبي مع انقباضات أذينية مبكرة متفرقة" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Illustrative finding; interpret in context", ar: "نتيجة توضيحية؛ تفسّر ضمن السياق" } },
      { dx: { en: "Intermittent arrhythmia not captured on this sample trace", ar: "اضطراب نظم متقطع لم يظهر في عينة التخطيط" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Context-dependent; further assessment may be needed", ar: "يعتمد على السياق؛ قد يلزم تقييم إضافي" } },
      { dx: { en: "Electrolyte, medication or other systemic contributor", ar: "عامل متعلق بالأملاح أو الأدوية أو حالة عامة أخرى" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Depends on clinical findings", ar: "تعتمد على النتائج السريرية" } },
      { dx: { en: "Ischaemia or another cardiac condition requiring clinical exclusion", ar: "نقص تروية أو حالة قلبية أخرى تستلزم الاستبعاد السريري" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Potentially serious if clinically suspected", ar: "قد تكون خطيرة عند الاشتباه السريري" } },
    ],
    decision: {
      intervene: {
        en: "For real chest pain, breathlessness, syncope, haemodynamic instability or a concerning ECG, arrange urgent/emergency clinical assessment according to local pathways. Do not use this sample to decide treatment. The treating clinician should review the actual tracing, symptoms, examination, medications and relevant investigations.",
        ar: "عند وجود ألم صدري فعلي أو ضيق نفس أو إغماء أو عدم استقرار الدورة الدموية أو تخطيط مقلق، اطلب تقييمًا سريريًا عاجلًا أو طارئًا وفق المسارات المحلية. لا تستخدم هذا المثال لاتخاذ قرار علاجي. يجب على الطبيب المعالج مراجعة التخطيط الفعلي والأعراض والفحص والأدوية والفحوصات المناسبة.",
      },
      observe: {
        en: "Observation or outpatient follow-up may be considered only after a qualified clinician has assessed the patient and determined that no urgent condition is suspected. Follow-up testing should be selected according to the history, examination and local guidance.",
        ar: "قد تُبحث المراقبة أو المتابعة الخارجية فقط بعد تقييم المريض من مختص والتأكد من عدم الاشتباه بحالة عاجلة. ويُختار أي فحص متابعة وفق التاريخ المرضي والفحص والإرشادات المحلية.",
      },
    },
    pitfalls: {
      refs: {
        en: "Related official source: 2024 ESC Guidelines for atrial fibrillation, including ECG confirmation and clinical evaluation. This source does not diagnose PACs in this synthetic example; interpret the original trace and patient context.",
        ar: "المصدر الرسمي ذو الصلة: إرشادات ESC لعام 2024 للرجفان الأذيني، بما فيها توثيق نظم القلب بتخطيط ECG والتقييم السريري. لا يشخّص هذا المصدر الانقباضات الأذينية المبكرة في المثال الاصطناعي؛ بل يجب تفسير التسجيل الأصلي وسياق المريض.",
      },
      pitfalls: [
        { en: "Calling an ECG normal without checking calibration, lead placement, intervals and the complete tracing.", ar: "وصف التخطيط بأنه طبيعي دون التحقق من المعايرة ومواضع الاشتقاقات والفترات والتسجيل كاملًا." },
        { en: "Assuming a single ECG rules out acute coronary syndrome or an intermittent arrhythmia.", ar: "افتراض أن تخطيطًا واحدًا يستبعد المتلازمة التاجية الحادة أو اضطراب النظم المتقطع." },
        { en: "Treating an automated interpretation or generated probability as a confirmed diagnosis.", ar: "التعامل مع التفسير الآلي أو الاحتمال الناتج عن النموذج على أنه تشخيص مؤكد." },
        { en: "Ignoring symptoms, prior ECGs, medication history and relevant blood tests.", ar: "تجاهل الأعراض والتخطيطات السابقة والتاريخ الدوائي وفحوصات الدم ذات الصلة." },
      ],
    },
    pearls: {
      pearls: [
        { en: "Confirm patient identity, ECG date, paper speed, gain and lead quality before interpretation.", ar: "تحقق من هوية المريض وتاريخ التخطيط وسرعة الورق ومعايرة الجهاز وجودة الاشتقاقات قبل التفسير." },
        { en: "Use a consistent sequence: rate, rhythm, axis, intervals, morphology and ST-T segments.", ar: "استخدم تسلسلًا ثابتًا: المعدل، النظم، المحور، الفترات، شكل الموجات ومقاطع ST-T." },
        { en: "Compare with prior tracings and correlate with symptoms and appropriate investigations.", ar: "قارن بالتخطيطات السابقة واربط النتائج بالأعراض والفحوصات المناسبة." },
      ],
      patientScript: {
        en: "This ECG is one part of your assessment. We will interpret it together with your symptoms, examination and any other tests that are needed. The tracing alone may not answer every question, so the clinician will explain whether further assessment is appropriate.",
        ar: "هذا التخطيط جزء واحد من تقييم حالتك. سنفسره مع الأعراض والفحص وأي فحوصات أخرى لازمة. قد لا يجيب التخطيط وحده عن جميع الأسئلة، ولذلك سيشرح الطبيب ما إذا كان يلزم تقييم إضافي.",
      },
    },
    quiz: [
      {
        q: { en: "Which sequence is most appropriate for a structured ECG review?", ar: "ما التسلسل الأنسب للمراجعة المنظمة لتخطيط القلب؟" },
        options: [
          { en: "Rate, rhythm, axis, intervals, morphology and ST-T changes", ar: "المعدل والنظم والمحور والفترات وشكل الموجات وتغيرات ST-T" },
          { en: "ST segment only", ar: "مقطع ST فقط" },
          { en: "Automated machine statement only", ar: "العبارة الآلية للجهاز فقط" },
          { en: "Heart rate only", ar: "معدل ضربات القلب فقط" },
        ],
        correct: 0,
        rationale: { en: "A consistent systematic review reduces omissions; findings must still be correlated with the full clinical context.", ar: "تقلل المراجعة المنهجية الثابتة من إغفال العلامات، مع ضرورة ربط النتائج بالسياق السريري الكامل." },
      },
      {
        q: { en: "Can one non-diagnostic ECG exclude acute coronary syndrome?", ar: "هل يمكن لتخطيط واحد غير تشخيصي استبعاد المتلازمة التاجية الحادة؟" },
        options: [
          { en: "Yes, in every patient", ar: "نعم، لدى جميع المرضى" },
          { en: "No; clinical assessment and additional testing may be required", ar: "لا؛ قد يلزم تقييم سريري وفحوصات إضافية" },
          { en: "Only if the patient is young", ar: "فقط إذا كان المريض صغير السن" },
          { en: "Only if the automated interpretation is normal", ar: "فقط إذا كان التفسير الآلي طبيعيًا" },
        ],
        correct: 1,
        rationale: { en: "A single ECG does not rule out every acute cardiac condition; assessment depends on symptoms, timing, serial testing and clinician judgment.", ar: "لا يستبعد تخطيط واحد جميع الحالات القلبية الحادة؛ يعتمد التقييم على الأعراض والتوقيت والفحوصات المتتابعة وتقدير الطبيب." },
      },
      {
        q: { en: "What is the status of this bundled ECG analysis?", ar: "ما طبيعة تحليل تخطيط القلب المرفق؟" },
        options: [
          { en: "A verified interpretation of a real patient tracing", ar: "تفسير موثّق لتخطيط مريض حقيقي" },
          { en: "A treatment order", ar: "أمر علاجي" },
          { en: "A fictional teaching fallback requiring clinician verification", ar: "مثال تعليمي افتراضي احتياطي يتطلب مراجعة مختص" },
          { en: "A replacement for emergency assessment", ar: "بديل عن تقييم الطوارئ" },
        ],
        correct: 2,
        rationale: { en: "This object is bundled demonstration data and is not derived from an uploaded ECG file.", ar: "هذا الكائن بيانات عرض تجريبية مرفقة بالمشروع، ولم ينتج عن قراءة ملف تخطيط مرفوع." },
      },
    ],
  };

  var mentorAnalysisBloodTest = {
    reportTitle: {
      en: "DEMO CASE — Complete blood count teaching example (not an uploaded patient report)",
      ar: "حالة تجريبية — مثال تعليمي لتعداد الدم الكامل (ليس تقرير مريض مرفوعًا)",
    },
    reportType: {
      en: "Illustrative CBC / blood test training data — demo only",
      ar: "بيانات تدريبية توضيحية لتعداد الدم وفحوصات الدم — للعرض فقط",
    },
    probabilityNote: {
      en: "No validated or calibrated diagnostic probabilities are available in this demo. Differentials are qualitative teaching considerations only; no percentages are calculated.",
      ar: "لا تتوفر في هذه النسخة التجريبية احتمالات تشخيصية معتمدة أو معايرة. التشخيصات التفريقية اعتبارات تعليمية وصفية فقط، ولا تُحسب لها نسب مئوية."
    },
    sampleData: {
      context: { en: "Fictional laboratory example for a nonpregnant adult woman. Assume no known acute inflammation for the ferritin teaching point; real laboratory intervals and clinical context must be checked.", ar: "مثال مخبري افتراضي لامرأة بالغة غير حامل. يُفترض عدم وجود التهاب حاد معروف لغرض شرح الفيريتين؛ ويجب التحقق من المجالات المرجعية الفعلية للمختبر والسياق السريري." },
      measures: [
        { name: { en: "Haemoglobin", ar: "الهيموغلوبين" }, value: "11.2", unit: "g/dL", category: { en: "112 g/L; WHO 2024 classifies 110–119 g/L as mild anaemia in nonpregnant women aged 15–65", ar: "يعادل 112 غ/لتر؛ ويصنف WHO لعام 2024 المجال 110–119 غ/لتر فقر دم خفيفًا لدى النساء غير الحوامل بعمر 15–65 سنة" } },
        { name: { en: "Mean corpuscular volume (MCV)", ar: "متوسط حجم الكرية (MCV)" }, value: "74", unit: "fL", category: { en: "Below the illustrative adult laboratory interval of 80–100 fL; confirm the reporting laboratory's own range", ar: "أقل من المجال المخبري الافتراضي للبالغين 80–100 فيمتولتر؛ يجب التحقق من المجال الخاص بالمختبر الذي أصدر النتيجة" } },
        { name: { en: "Serum ferritin", ar: "فيريتين المصل" }, value: "10", unit: "µg/L", category: { en: "Low for an otherwise healthy adult without inflammation; WHO uses <15 µg/L as an iron-deficiency indicator in this context", ar: "منخفض لدى بالغ لا يعاني التهابًا؛ ويستخدم WHO أقل من 15 ميكروغرام/لتر مؤشرًا لنقص الحديد في هذا السياق" } }
      ],
      interpretation: { en: "The fictional combination of low haemoglobin, low MCV and low ferritin is consistent with an iron-deficiency anaemia pattern in the stated context, but it does not identify the cause of iron loss or replace clinician review.", ar: "يتوافق اجتماع انخفاض الهيموغلوبين وMCV والفيريتين في هذا المثال الافتراضي مع نمط فقر دم بنقص الحديد في السياق المذكور، لكنه لا يحدد سبب فقدان الحديد ولا يغني عن مراجعة الطبيب." },
      sourceUrls: ["https://www.who.int/publications/i/item/9789240088542", "https://www.who.int/publications/i/item/9789240000124"],
      referenceIds: ["r15", "r16"]
    },
    guidelines: ["WHO"],
    pathophysiology: {
      physiology: {
        en: "A complete blood count measures red-cell, white-cell and platelet parameters. Interpretation considers haemoglobin, haematocrit, red-cell indices, white-cell differential and platelets together with age, sex, pregnancy status, symptoms, medical history and the laboratory reference interval.",
        ar: "يقيس تعداد الدم الكامل مؤشرات كريات الدم الحمراء والبيضاء والصفائح الدموية. ويأخذ التفسير في الحسبان الهيموغلوبين والهيماتوكريت ومؤشرات الكريات الحمراء والتفريق بين كريات الدم البيضاء والصفائح، إلى جانب العمر والجنس والحمل والأعراض والتاريخ المرضي والمجالات المرجعية للمختبر.",
      },
      pathology: {
        en: "This fictional teaching example supplies haemoglobin 11.2 g/dL (112 g/L), MCV 74 fL and ferritin 10 µg/L for a nonpregnant adult woman with no known acute inflammation in the scenario. WHO 2024 places 110–119 g/L in the mild-anaemia range for nonpregnant women aged 15–65; low ferritin in an otherwise healthy adult supports iron deficiency. These synthetic values do not explain the cause of iron loss, and inflammation, pregnancy, laboratory-specific ranges and clinical history can change interpretation.",
        ar: "يعرض هذا المثال التعليمي الافتراضي هيموغلوبين 11.2 غ/دل (112 غ/لتر) وMCV بقيمة 74 فيمتولتر وفيريتين 10 ميكروغرام/لتر لامرأة بالغة غير حامل، مع افتراض عدم وجود التهاب حاد معروف في السيناريو. يصنف WHO لعام 2024 الهيموغلوبين 110–119 غ/لتر ضمن فقر الدم الخفيف لدى النساء غير الحوامل بعمر 15–65 سنة؛ ويدعم انخفاض الفيريتين لدى بالغ سليم وجود نقص الحديد. لا تحدد هذه القيم الاصطناعية سبب فقدان الحديد، وقد يغير الالتهاب والحمل والمجالات الخاصة بالمختبر والتاريخ الصحي طريقة التفسير.",
      },
    },
    differentials: [
      { dx: { en: "Iron deficiency — one possible cause of a microcytic pattern", ar: "نقص الحديد — أحد الأسباب المحتملة لنمط صغير الكريات" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Requires confirmation and cause assessment", ar: "يتطلب التأكيد وتقييم السبب" } },
      { dx: { en: "Thalassaemia trait or another haemoglobin variant", ar: "سمة الثلاسيميا أو أحد متغيرات الهيموغلوبين" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Context-dependent; avoid assumptions from CBC alone", ar: "تعتمد على السياق؛ لا تُستنتج من تعداد الدم وحده" } },
      { dx: { en: "Anaemia of inflammation or chronic disease", ar: "فقر دم الالتهاب أو المرض المزمن" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Depends on underlying condition", ar: "تعتمد على الحالة الأساسية" } },
      { dx: { en: "Other causes or laboratory variation", ar: "أسباب أخرى أو اختلافات مخبرية" }, probability: null, probabilityStatus: "not-calculated", severity: { en: "Requires clinical correlation", ar: "يتطلب الربط السريري" } },
    ],
    decision: {
      intervene: {
        en: "Urgent assessment is determined by the patient's condition, symptoms, degree of abnormality and local escalation criteria, not by this sample. For a real result, the treating clinician should verify the report, review bleeding and medical history, check relevant investigations and decide whether prompt specialist or emergency assessment is needed.",
        ar: "يتحدد التقييم العاجل وفق حالة المريض وأعراضه ودرجة اضطراب النتائج ومعايير التصعيد المحلية، وليس وفق هذا المثال. بالنسبة لنتيجة فعلية، يجب على الطبيب التحقق من التقرير ومراجعة النزيف والتاريخ المرضي والفحوصات ذات الصلة وتحديد الحاجة إلى تقييم اختصاصي أو طارئ سريع.",
      },
      observe: {
        en: "Repeat testing or routine follow-up may be appropriate only when the responsible clinician judges the patient clinically stable and has reviewed the full blood count, laboratory ranges and history. Further tests should be selected to investigate the suspected cause rather than inferred from the sample alone.",
        ar: "قد تكون إعادة الفحص أو المتابعة الاعتيادية مناسبة فقط إذا رأى الطبيب المسؤول أن المريض مستقر سريريًا وراجع تعداد الدم كاملًا والمجالات المرجعية والتاريخ المرضي. ينبغي اختيار الفحوصات الإضافية للتحقق من السبب المشتبه به بدل استنتاجه من المثال وحده.",
      },
    },
    pitfalls: {
      refs: {
        en: "Sources for the example: WHO 2024 haemoglobin cutoffs and WHO ferritin guidance. The values are synthetic; check the laboratory interval and assess inflammation, pregnancy status, blood loss and other causes before any clinical conclusion.",
        ar: "مصادر المثال: حدود الهيموغلوبين لمنظمة الصحة العالمية لعام 2024 وإرشاد المنظمة بشأن الفيريتين. القيم اصطناعية؛ تحقّق من المجال المرجعي للمختبر وقيّم الالتهاب والحمل وفقدان الدم والأسباب الأخرى قبل أي استنتاج سريري.",
      },
      pitfalls: [
        { en: "Diagnosing iron deficiency from a low MCV alone without reviewing ferritin and the clinical context.", ar: "تشخيص نقص الحديد اعتمادًا على انخفاض MCV وحده دون مراجعة الفيريتين والسياق السريري." },
        { en: "Ignoring the laboratory's own reference intervals, age, pregnancy status or relevant history.", ar: "تجاهل المجالات المرجعية الخاصة بالمختبر أو العمر أو حالة الحمل أو التاريخ المرضي ذي الصلة." },
        { en: "Starting supplements or changing prescribed treatment based only on a demonstration result.", ar: "بدء المكملات أو تغيير العلاج الموصوف اعتمادًا على نتيجة توضيحية فقط." },
        { en: "Treating the AI differential or percentage as a measured clinical probability.", ar: "التعامل مع التشخيص التفريقي أو النسبة الناتجة عن الذكاء الاصطناعي كاحتمال سريري محسوب." },
      ],
    },
    pearls: {
      pearls: [
        { en: "Read the complete CBC, not an isolated flagged value.", ar: "اقرأ تعداد الدم الكامل، ولا تعتمد على قيمة منفردة مميزة بعلامة تنبيه." },
        { en: "Interpret red-cell indices with ferritin and other tests when clinically indicated.", ar: "فسّر مؤشرات كريات الدم الحمراء مع الفيريتين والفحوصات الأخرى عند وجود داعٍ سريري." },
        { en: "Correlate results with symptoms, examination, previous results and the laboratory reference interval.", ar: "اربط النتائج بالأعراض والفحص والنتائج السابقة والمجال المرجعي للمختبر." },
      ],
      patientScript: {
        en: "Some blood-count values are outside the example reference range. A blood test pattern does not identify the cause by itself. Your clinician will review the full report and your history, and may recommend additional tests or follow-up if needed.",
        ar: "بعض قيم تعداد الدم خارج المجال المرجعي المستخدم في المثال. ولا يحدد نمط تحليل الدم السبب بمفرده. سيراجع الطبيب التقرير كاملًا وتاريخك الصحي، وقد يوصي بفحوصات إضافية أو متابعة عند الحاجة.",
      },
    },
    quiz: [
      {
        q: { en: "What does a low MCV describe?", ar: "ماذا يعني انخفاض MCV؟" },
        options: [
          { en: "Smaller-than-average red blood cell volume", ar: "حجم كريات دم حمراء أصغر من المتوسط" },
          { en: "A confirmed diagnosis of iron deficiency", ar: "تشخيص مؤكد لنقص الحديد" },
          { en: "A platelet count", ar: "عدد الصفائح الدموية" },
          { en: "A white-cell differential", ar: "التفريق بين كريات الدم البيضاء" },
        ],
        correct: 0,
        rationale: { en: "MCV describes average red-cell volume; it does not identify the cause of a microcytic pattern by itself.", ar: "يصف MCV متوسط حجم كريات الدم الحمراء، ولا يحدد سبب نمط صغير الكريات بمفرده." },
      },
      {
        q: { en: "Which additional result may help assess suspected iron deficiency?", ar: "أي نتيجة إضافية قد تساعد في تقييم نقص الحديد المشتبه به؟" },
        options: [
          { en: "Ferritin interpreted in clinical context", ar: "الفيريتين مع تفسيره ضمن السياق السريري" },
          { en: "A skin photograph", ar: "صورة للجلد" },
          { en: "An isolated heart-rate reading", ar: "قراءة منفردة لمعدل القلب" },
          { en: "The AI percentage alone", ar: "نسبة الذكاء الاصطناعي وحدها" },
        ],
        correct: 0,
        rationale: { en: "Ferritin and other iron studies can help, but inflammation and clinical context affect interpretation.", ar: "قد يساعد الفيريتين ودراسات الحديد الأخرى، لكن الالتهاب والسياق السريري يؤثران في التفسير." },
      },
      {
        q: { en: "What is the role of this bundled blood-test analysis?", ar: "ما دور تحليل الدم الاحتياطي المرفق؟" },
        options: [
          { en: "It confirms a patient's diagnosis", ar: "يؤكد تشخيص المريض" },
          { en: "It prescribes treatment", ar: "يصف العلاج" },
          { en: "It is a fictional teaching fallback requiring clinician verification", ar: "مثال تعليمي افتراضي احتياطي يتطلب مراجعة مختص" },
          { en: "It replaces laboratory reference ranges", ar: "يحل محل المجالات المرجعية للمختبر" },
        ],
        correct: 2,
        rationale: { en: "This is synthetic seed data for UI testing and is not based on an uploaded blood report.", ar: "هذه بيانات اصطناعية لاختبار الواجهة، ولا تستند إلى تقرير دم مرفوع." },
      },
    ],
  };

  /* Stable, explicit keys for the API integration owner (Mustafa).
   * Keep `mentorAnalysis` as the legacy/default CTG key. */
  var mentorAnalysisSamples = {
    ctg: mentorAnalysis,
    ecg: mentorAnalysisECG,
    bloodTest: mentorAnalysisBloodTest,
  };

  function getMentorAnalysisFallback(reportType) {
    var type = String(reportType || "").toLowerCase().trim().replace(/[_-]+/g, " ");
    var key = null;

    if (/\bctg\b|cardiotocograph|cardiotocography|fetal monitor|foetal monitor/.test(type)) {
      key = "ctg";
    } else if (/\becg\b|\bekg\b|electrocardio/.test(type)) {
      key = "ecg";
    } else if (/\b(cbc|fbc)\b|complete blood count|full blood count|blood count|blood test|blood report|haemogram|hemogram|ferritin|haemoglobin|hemoglobin|hba1c/.test(type)) {
      key = "bloodTest";
    }

    // Unknown or missing types must never receive an unrelated clinical example.
    if (!key) return null;

    // Return a copy so downstream UI code cannot mutate the bundled source example.
    var sample = JSON.parse(JSON.stringify(mentorAnalysisSamples[key]));
    sample.analysisSource = "bundled-demo";
    sample.isDemo = true;
    sample.sampleKey = key;
    return sample;
  }

  /* ===================================================================
   * 12. SURGICAL TIPS & TRICKS  (Doctors-Only Forum tab)
   * -------------------------------------------------------------------
   * surgicalSpecialties — filter chips for the surgical tab.
   * surgicalTips — educational topic cards; not operative instructions or clinical protocols.
   *   Schema: { id, title, specialtyId, type(video|trick|protocol),
   *             doctorId, excerpt, steps:[{en,ar}], mediaGradient,
   *             duration:{en,ar}, upvotes, time }
   * =================================================================== */
  var surgicalSpecialties = [
    { id: "obgyn", name: { en: "Gynecology & Obstetrics", ar: "النساء والولادة" }, color: "from-pink-500 to-rose-600" },
    { id: "ortho", name: { en: "Orthopedic Surgery", ar: "جراحة العظام" }, color: "from-cyan-500 to-blue-600" },
    { id: "neuro", name: { en: "Neurosurgery", ar: "جراحة الأعصاب" }, color: "from-violet-500 to-purple-600" },
    { id: "cardio", name: { en: "Cardiothoracic", ar: "جراحة الصدر والقلب" }, color: "from-rose-500 to-red-600" },
    { id: "general", name: { en: "General Surgery", ar: "الجراحة العامة" }, color: "from-teal-500 to-emerald-600" },
  ];
  var surgicalTips = [
    { id: "st1", title: { en: "Laparoscopic Hysterectomy — Safe-Access Planning Discussion", ar: "استئصال الرحم بالمنظار — نقاش التخطيط للدخول الآمن" }, specialtyId: "obgyn", type: "trick", doctorId: "d9", excerpt: { en: "Supervised teaching topic: patient-specific access risks, relevant anatomy and the institution-approved entry approach.", ar: "موضوع تعليمي بإشراف مختص: مخاطر الدخول الخاصة بالمريضة والتشريح ذي الصلة وطريقة الدخول المعتمدة في المؤسسة." }, steps: [{ en: "Review prior operations, imaging and patient-specific risk factors with the supervising surgeon.", ar: "راجع العمليات السابقة والتصوير وعوامل الخطورة الخاصة بالمريضة مع الجرّاح المشرف." }, { en: "Discuss relevant anatomy and alternative access strategies in a supervised teaching setting.", ar: "ناقش التشريح ذي الصلة وبدائل الدخول في بيئة تعليمية خاضعة للإشراف." }, { en: "Use only the institution-approved technique and equipment after formal training.", ar: "استخدم التقنية والأدوات المعتمدة في المؤسسة فقط بعد التدريب الرسمي." }, { en: "Stop and escalate to the attending surgeon whenever anatomy or access is uncertain.", ar: "توقف واطلب تدخل الجرّاح المسؤول كلما كان التشريح أو مسار الدخول غير واضح." }], mediaGradient: "from-pink-500 to-rose-700", upvotes: 412, time: { en: "2d ago", ar: "قبل يومين" } },
    { id: "st2", title: { en: "Caesarean Delivery — Awareness of Bladder and Ureteric Injury", ar: "الولادة القيصرية — التوعية بإصابات المثانة والحالب" }, specialtyId: "obgyn", type: "video", doctorId: "d9", excerpt: { en: "Demo video topic: anatomy review, risk recognition and supervised complication-prevention teaching. Not a procedural guide.", ar: "موضوع فيديو تجريبي: مراجعة التشريح والتعرف على عوامل الخطورة والتعليم بإشراف مختص للوقاية من المضاعفات. ليس دليلًا إجرائيًا." }, mediaGradient: "from-rose-400 to-pink-600", duration: { en: "3:24", ar: "3:24" }, upvotes: 689, time: { en: "5d ago", ar: "قبل 5 أيام" } },
    { id: "st3", title: { en: "Postpartum Haemorrhage — Team Readiness and Escalation", ar: "نزف ما بعد الولادة — جاهزية الفريق والتصعيد" }, specialtyId: "obgyn", type: "protocol", doctorId: "d9", excerpt: { en: "Educational overview of team activation, assessment and use of the current local haemorrhage pathway.", ar: "عرض تعليمي لتفعيل الفريق والتقييم واستخدام مسار التعامل المحلي الحالي مع النزف." }, steps: [{ en: "Activate the local emergency response and allocate team roles promptly.", ar: "فعّل استجابة الطوارئ المحلية وحدد أدوار أعضاء الفريق دون تأخير." }, { en: "Assess maternal condition and blood loss while following the institution's current protocol.", ar: "قيّم حالة الأم وكمية الدم المفقود مع اتباع البروتوكول الحالي للمؤسسة." }, { en: "Medication choice and sequence must be determined by qualified clinicians, contraindications and local guidance.", ar: "يحدد المختصون اختيار الأدوية وتسلسلها وفق موانع الاستعمال والإرشادات المحلية." }, { en: "Escalate promptly to senior obstetric, anaesthetic and transfusion support as indicated by the clinical situation.", ar: "صعّد الحالة سريعًا إلى دعم التوليد والتخدير ونقل الدم من المستوى المختص بحسب الوضع السريري." }], mediaGradient: "from-red-500 to-rose-700", upvotes: 534, time: { en: "1w ago", ar: "قبل أسبوع" } },
    { id: "st4", title: { en: "Total Laparoscopic Hysterectomy — Ureteric Anatomy Review", ar: "استئصال الرحم الكامل بالمنظار — مراجعة تشريح الحالب" }, specialtyId: "obgyn", type: "trick", doctorId: "d9", excerpt: { en: "Supervised discussion of ureteric anatomy, risk factors and the selective use of adjuncts according to specialist judgement.", ar: "نقاش بإشراف مختص حول تشريح الحالب وعوامل الخطورة والاستخدام الانتقائي للوسائل المساعدة وفق تقدير الاختصاصي." }, steps: [{ en: "Review pelvic anatomy and prior operative findings before the procedure.", ar: "راجع تشريح الحوض ونتائج العمليات السابقة قبل الإجراء." }, { en: "Discuss the patient's specific risk profile with the supervising surgeon.", ar: "ناقش عوامل الخطورة الخاصة بالمريضة مع الجرّاح المشرف." }, { en: "Any adjunctive device or change in operative plan requires specialist decision and local protocol.", ar: "يتطلب استخدام أي وسيلة مساعدة أو تغيير الخطة الجراحية قرار الاختصاصي والبروتوكول المحلي." }], mediaGradient: "from-fuchsia-500 to-pink-700", upvotes: 287, time: { en: "3d ago", ar: "قبل 3 أيام" } },
    { id: "st5", title: { en: "Knee Arthroscopy — Portal Anatomy and Cartilage Protection", ar: "منظار الركبة — تشريح المنافذ وحماية الغضروف" }, specialtyId: "ortho", type: "video", doctorId: "d6", excerpt: { en: "Demo video topic: supervised anatomy teaching and review of complications. Not a guide to portal placement.", ar: "موضوع فيديو تجريبي: تعليم التشريح بإشراف مختص ومراجعة المضاعفات. ليس دليلًا لتحديد مواضع المنافذ." }, mediaGradient: "from-cyan-500 to-blue-700", duration: { en: "1:32", ar: "1:32" }, upvotes: 358, time: { en: "4d ago", ar: "قبل 4 أيام" } },
    { id: "st6", title: { en: "Craniotomy — Haemostasis Principles and Team Safety", ar: "فتح القحف — مبادئ إيقاف النزف وسلامة الفريق" }, specialtyId: "neuro", type: "protocol", doctorId: "d10", excerpt: { en: "High-level educational topic on preparation, haemostasis principles and supervised neurosurgical practice.", ar: "موضوع تعليمي عام حول التحضير ومبادئ إيقاف النزف والممارسة الجراحية العصبية بإشراف مختص." }, steps: [{ en: "Review imaging, anatomy, equipment readiness and the operative plan with the attending neurosurgeon.", ar: "راجع الصور والتشريح وجاهزية الأدوات والخطة الجراحية مع جرّاح الأعصاب المسؤول." }, { en: "Follow the neurosurgical unit's approved haemostasis and escalation procedures.", ar: "اتبع إجراءات إيقاف النزف والتصعيد المعتمدة في وحدة جراحة الأعصاب." }, { en: "Unexpected bleeding or uncertain anatomy requires immediate communication with the supervising team.", ar: "يتطلب النزف غير المتوقع أو عدم وضوح التشريح التواصل الفوري مع الفريق المشرف." }], mediaGradient: "from-violet-500 to-purple-700", upvotes: 246, time: { en: "6d ago", ar: "قبل 6 أيام" } },
  ];


  /* Shared schema check for CTG, ECG and blood-test fallback objects. */
  function validateMentorAnalysis(sample, label, guidelineCodes, warnings, errors) {
    var requiredObjects = ["pathophysiology", "decision", "pitfalls", "pearls"];
    if (!sample || typeof sample !== "object") {
      errors.push(label + " is missing");
      return;
    }
    requiredObjects.forEach(function (key) {
      if (!sample[key] || typeof sample[key] !== "object") errors.push(label + "." + key + " is missing");
    });
    if (!Array.isArray(sample.guidelines)) errors.push(label + ".guidelines must be an array of codes");
    else sample.guidelines.forEach(function (code) {
      if (guidelineCodes.indexOf(code) === -1) errors.push("Unknown guideline code " + code + " in " + label);
    });
    ["reportTitle", "reportType"].forEach(function (field) {
      if (!sample[field] || typeof sample[field].en !== "string" || typeof sample[field].ar !== "string") errors.push(label + "." + field + " must be bilingual {en,ar}");
    });
    ["physiology", "pathology"].forEach(function (field) {
      var value = sample.pathophysiology && sample.pathophysiology[field];
      if (!value || typeof value.en !== "string" || typeof value.ar !== "string") errors.push(label + ".pathophysiology." + field + " must be bilingual {en,ar}");
    });
    if (!Array.isArray(sample.differentials)) errors.push(label + ".differentials must be an array");
    else {
      sample.differentials.forEach(function (item, index) {
        ["dx", "severity"].forEach(function (field) {
          if (!item[field] || typeof item[field].en !== "string" || typeof item[field].ar !== "string") errors.push(label + ".differentials[" + index + "]." + field + " must be bilingual {en,ar}");
        });
        if (item.probability !== null || item.probabilityStatus !== "not-calculated") {
          errors.push(label + ".differentials[" + index + "] must use probability:null and probabilityStatus:'not-calculated' for bundled demo fallbacks");
        }
      });
      if (!sample.probabilityNote || typeof sample.probabilityNote.en !== "string" || typeof sample.probabilityNote.ar !== "string") errors.push(label + ".probabilityNote must be bilingual {en,ar}");
      if (!sample.sampleData || !sample.sampleData.context || typeof sample.sampleData.context.en !== "string" || typeof sample.sampleData.context.ar !== "string") errors.push(label + ".sampleData.context must be bilingual {en,ar}");
    }
    ["intervene", "observe"].forEach(function (field) {
      var value = sample.decision && sample.decision[field];
      if (!value || typeof value.en !== "string" || typeof value.ar !== "string") errors.push(label + ".decision." + field + " must be bilingual {en,ar}");
    });
    if (!sample.pitfalls || !sample.pitfalls.refs || typeof sample.pitfalls.refs.en !== "string" || typeof sample.pitfalls.refs.ar !== "string" || !Array.isArray(sample.pitfalls.pitfalls)) errors.push(label + ".pitfalls has an invalid shape");
    if (!sample.pearls || !Array.isArray(sample.pearls.pearls) || !sample.pearls.patientScript || typeof sample.pearls.patientScript.en !== "string" || typeof sample.pearls.patientScript.ar !== "string") errors.push(label + ".pearls has an invalid shape");
    if (!Array.isArray(sample.quiz)) errors.push(label + ".quiz must be an array");
    else sample.quiz.forEach(function (item, index) {
      if (!Array.isArray(item.options) || !Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) errors.push(label + ".quiz[" + index + "] has an invalid correct option index");
      if (!item.q || typeof item.q.en !== "string" || typeof item.q.ar !== "string") errors.push(label + ".quiz[" + index + "].q must be bilingual {en,ar}");
      if (!item.rationale || typeof item.rationale.en !== "string" || typeof item.rationale.ar !== "string") errors.push(label + ".quiz[" + index + "].rationale must be bilingual {en,ar}");
      (item.options || []).forEach(function (option, optionIndex) {
        if (!option || typeof option.en !== "string" || typeof option.ar !== "string") errors.push(label + ".quiz[" + index + "].options[" + optionIndex + "] must be bilingual {en,ar}");
      });
    });
  }

  /* Lightweight contract check. Safe to call from DevTools; app.js need not call it. */
  function validate() {
    var errors = [];
    var warnings = [];
    var collections = [
      ["specialties", specialties], ["doctors", doctors],
      ["patientAppointments", patientAppointments], ["healthUpdates", healthUpdates],
      ["vitals", vitals], ["healthDocs", healthDocs], ["accessSessions", accessSessions],
      ["preAnswered", preAnswered], ["communityPosts", communityPosts], ["qaItems", qaItems],
      ["forumCases", forumCases], ["doctorSchedule", doctorSchedule],
      ["accessRequests", accessRequests], ["referralNotifs", referralNotifs],
      ["doctorMetrics", doctorMetrics], ["guidelines", guidelines], ["clinicalRefs", clinicalRefs],
      ["surgicalSpecialties", surgicalSpecialties], ["surgicalTips", surgicalTips],
    ];

    collections.forEach(function (entry) {
      var label = entry[0];
      var rows = entry[1];
      var seen = Object.create(null);
      rows.forEach(function (row, index) {
        if (!row || typeof row !== "object") {
          errors.push(label + "[" + index + "] is not an object");
          return;
        }
        if (row.id != null) {
          if (seen[row.id]) errors.push(label + " has duplicate id: " + row.id);
          seen[row.id] = true;
        }
      });
    });

    var specialtyIds = specialties.map(function (item) { return item.id; });
    var doctorIds = doctors.map(function (item) { return item.id; });
    var guidelineCodes = guidelines.map(function (item) { return item.code; });

    doctors.forEach(function (doctor) {
      if (specialtyIds.indexOf(doctor.specialtyId) === -1) errors.push("Unknown specialty for doctor " + doctor.id);
    });
    [patientAppointments, healthDocs, accessSessions, communityPosts, preAnswered, surgicalTips].forEach(function (rows) {
      rows.forEach(function (row) {
        if (row.doctorId && doctorIds.indexOf(row.doctorId) === -1) errors.push("Unknown doctorId in record " + (row.id || "(no id)"));
      });
    });
    clinicalRefs.forEach(function (ref) {
      if (specialtyIds.indexOf(ref.specialtyId) === -1) errors.push("Unknown specialtyId in clinical reference " + ref.id);
      (ref.guidelines || []).forEach(function (code) {
        if (guidelineCodes.indexOf(code) === -1) errors.push("Unknown guideline code " + code + " in " + ref.id);
      });
      if (typeof ref.url !== "string" || !/^https:\/\//.test(ref.url)) errors.push("Clinical reference " + ref.id + " must have an HTTPS URL");
      if (!ref.title || typeof ref.title.en !== "string" || typeof ref.title.ar !== "string") errors.push("Clinical reference " + ref.id + " must have a bilingual title");
      if (!ref.verificationStatus) errors.push("Clinical reference " + ref.id + " must declare its verification status");
      if (ref.verificationStatus === "verified" && !ref.lastVerified) errors.push("Verified clinical reference " + ref.id + " must include lastVerified");
    });
    var unverifiedClinicalRefCount = clinicalRefs.filter(function (ref) {
      return ref.verificationStatus !== "verified";
    }).length;
    if (unverifiedClinicalRefCount > 0) warnings.push(unverifiedClinicalRefCount + " clinical reference links are listed but have not been independently verified in this file.");

    var surgicalSpecialtyIds = surgicalSpecialties.map(function (item) { return item.id; });
    var expectedDoctorSpecialty = { obgyn: "obgyn", ortho: "ortho", neuro: "neurosurgery" };
    surgicalTips.forEach(function (tip) {
      if (surgicalSpecialtyIds.indexOf(tip.specialtyId) === -1) errors.push("Unknown surgical specialty in tip " + tip.id);
      if (tip.doctorId) {
        var author = doctors.filter(function (doctor) { return doctor.id === tip.doctorId; })[0];
        var expected = expectedDoctorSpecialty[tip.specialtyId];
        if (author && expected && author.specialtyId !== expected) {
          errors.push("Doctor specialty does not match surgical tip " + tip.id);
        }
      }
    });
    if (!patientSummary.clinicalProfile || !Array.isArray(patientSummary.clinicalProfile.conditions) || !Array.isArray(patientSummary.clinicalProfile.medications) || !Array.isArray(patientSummary.clinicalProfile.laboratoryResults) || !Array.isArray(patientSummary.clinicalProfile.observations) || !Array.isArray(patientSummary.clinicalProfile.familyHistory) || !patientSummary.clinicalProfile.socialHistory) {
      errors.push("patientSummary.clinicalProfile is missing required demo sections");
    }
    if (patientSummary.clinicalProfile && patientSummary.clinicalProfile.recordType == null) errors.push("patientSummary.clinicalProfile.recordType is required");
    qaItems.forEach(function (question) {
      (question.answers || []).forEach(function (answer) {
        if (answer.doctorId && doctorIds.indexOf(answer.doctorId) === -1) errors.push("Unknown doctorId in answer " + answer.id);
      });
    });
    forumCases.forEach(function (caseItem) {
      if (specialtyIds.indexOf(caseItem.authorSpecialtyId) === -1) errors.push("Unknown authorSpecialtyId in " + caseItem.id);
      (caseItem.suggestions || []).forEach(function (suggestion) {
        if (suggestion.doctorId && doctorIds.indexOf(suggestion.doctorId) === -1) errors.push("Unknown doctorId in suggestion " + suggestion.id);
      });
    });
    referralNotifs.forEach(function (notice) {
      if (notice.fromDoctorId && doctorIds.indexOf(notice.fromDoctorId) === -1) errors.push("Unknown fromDoctorId in " + notice.id);
    });

    var clinicalRefIds = clinicalRefs.map(function (ref) { return ref.id; });
    [patientSummary.clinicalProfile.referenceIds || [], mentorAnalysis.sampleData.referenceIds || [], mentorAnalysisECG.sampleData.referenceIds || [], mentorAnalysisBloodTest.sampleData.referenceIds || []].forEach(function (ids) {
      ids.forEach(function (id) { if (clinicalRefIds.indexOf(id) === -1) errors.push("Unknown clinical reference id " + id); });
    });

    var samples = [
      ["mentorAnalysis (default CTG)", mentorAnalysis],
      ["mentorAnalysisECG", mentorAnalysisECG],
      ["mentorAnalysisBloodTest", mentorAnalysisBloodTest],
    ];
    samples.forEach(function (entry) {
      validateMentorAnalysis(entry[1], entry[0], guidelineCodes, warnings, errors);
      var sample = entry[1];
      var linkedIds = sample && sample.sampleData && sample.sampleData.referenceIds || [];
      var linkedCodes = [];
      linkedIds.forEach(function (id) {
        var linkedRef = clinicalRefs.filter(function (ref) { return ref.id === id; })[0];
        if (linkedRef) linkedCodes = linkedCodes.concat(linkedRef.guidelines || []);
      });
      (sample && sample.guidelines || []).forEach(function (code) {
        if (linkedIds.length && linkedCodes.indexOf(code) === -1) errors.push(entry[0] + " guideline " + code + " is not present in its linked clinical references");
      });
    });
    if (mentorAnalysisSamples.ctg !== mentorAnalysis || mentorAnalysisSamples.ecg !== mentorAnalysisECG || mentorAnalysisSamples.bloodTest !== mentorAnalysisBloodTest) {
      errors.push("mentorAnalysisSamples keys do not point to the expected fallback objects");
    }


    if (!META.isProductionData) warnings.push("This is synthetic demo/seed data; never present sample people or credentials as verified, or use seed measurements as actual patient observations.");
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  /* ---- Public surface ---------------------------------------------- */
  return {
    META: META,
    validate: validate,
    pick: pick,
    DEMO_ACCOUNTS: DEMO_ACCOUNTS,
    specialties: specialties,
    locations: locations,
    doctors: doctors,
    getSpecialty: getSpecialty,
    getDoctor: getDoctor,
    patientAppointments: patientAppointments,
    healthUpdates: healthUpdates,
    vitals: vitals,
    healthDocs: healthDocs,
    accessSessions: accessSessions,
    preAnswered: preAnswered,
    communityPosts: communityPosts,
    qaItems: qaItems,
    forumCases: forumCases,
    doctorSchedule: doctorSchedule,
    accessRequests: accessRequests,
    referralNotifs: referralNotifs,
    doctorMetrics: doctorMetrics,
    guidelines: guidelines,
    getGuideline: getGuideline,
    clinicalRefs: clinicalRefs,
    getClinicalRefsBySpecialty: getClinicalRefsBySpecialty,
    patientSummary: patientSummary,
    mentorAnalysis: mentorAnalysis,
    mentorAnalysisECG: mentorAnalysisECG,
    mentorAnalysisBloodTest: mentorAnalysisBloodTest,
    mentorAnalysisSamples: mentorAnalysisSamples,
    getMentorAnalysisFallback: getMentorAnalysisFallback,
    surgicalSpecialties: surgicalSpecialties,
    surgicalTips: surgicalTips,
  };
})();
