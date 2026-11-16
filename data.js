/* =====================================================================
   data.js  —  MedConnect mock data layer (offline-ready, no dependencies)
   ---------------------------------------------------------------------
   Exposes a single global:  window.MCData
   Contains EVERY bilingual dataset the app renders, plus demo accounts.

   Every array has a schema comment above it. Bilingual strings use the
   shape { en: "...", ar: "..." } and are read via MCData.pick(obj, lang).
   ===================================================================== */
window.MCData = (function () {
  "use strict";

  /* ---- Bilingual helper ---------------------------------------------
   * pick(b, lang) -> returns b[lang]. Use everywhere a {en,ar} value is
   * rendered so the UI flips with the language toggle. */
  function pick(b, lang) {
    return b && b[lang] != null ? b[lang] : "";
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
      doctorVerified: true, // demo doctor is already verified -> lands in DoctorApp
      doctorCreds: {
        license: "MED-LIC-48213",
        specialty: "cardio",
        yearsExp: "14",
        clinic: "King Fahad Medical City",
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
    { id: "ortho", name: { en: "Orthopedics", ar: "العظام" }, icon: "Bone", color: "from-cyan-500 to-blue-600" },
    { id: "endo", name: { en: "Endocrinology", ar: "الغدد الصماء" }, icon: "Activity", color: "from-teal-500 to-emerald-600" },
    { id: "ophthal", name: { en: "Ophthalmology", ar: "طب العيون" }, icon: "Eye", color: "from-sky-500 to-indigo-600" },
    { id: "ent", name: { en: "ENT", ar: "أنف وأذن وحنجرة" }, icon: "Ear", color: "from-lime-500 to-green-600" },
    { id: "psych", name: { en: "Psychiatry", ar: "الطب النفسي" }, icon: "BrainCircuit", color: "from-indigo-500 to-blue-700" },
    { id: "obgyn", name: { en: "Obstetrics & Gynecology", ar: "النساء والولادة" }, icon: "Baby", color: "from-pink-500 to-rose-600" },
    { id: "gp", name: { en: "General Practice", ar: "الممارسة العامة" }, icon: "Stethoscope", color: "from-slate-500 to-slate-700" },
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
   * 3. DOCTORS  — verified practitioners shown across the app
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
    { id: "d1", nameDisplay: { en: "Dr. Layla Al-Harbi", ar: "د. ليلى الحربي" }, specialtyId: "cardio", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.9, reviews: 312, yearsExp: 14, clinic: { en: "King Fahad Medical City", ar: "مدينة الملك فهد الطبية" }, bio: { en: "Interventional cardiologist specializing in arrhythmia management and preventive cardiology.", ar: "استشارية أمراض قلب تداخلية متخصصة في إدارة اضطرابات النظم والوقاية القلبية." }, verified: true, avatarGradient: "from-rose-400 to-red-500", initials: "لا", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "150 SAR", ar: "150 ريال" } },
    { id: "d2", nameDisplay: { en: "Dr. Omar Al-Saud", ar: "د. عمر آل سعود" }, specialtyId: "pediatrics", location: { en: "Jeddah", ar: "جدة" }, rating: 4.8, reviews: 428, yearsExp: 11, clinic: { en: "Al-Salam Children's Hospital", ar: "مستشفى السلام للأطفال" }, bio: { en: "Pediatrician focused on neonatal care, vaccination schedules and childhood nutrition.", ar: "طبيب أطفال متخصص في حديثي الولادة وجداول التطعيم وتغذية الطفل." }, verified: true, avatarGradient: "from-amber-400 to-orange-500", initials: "عس", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "Free", ar: "مجاني" } },
    { id: "d3", nameDisplay: { en: "Dr. Sara Al-Qahtani", ar: "د. سارة القحطاني" }, specialtyId: "derma", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.9, reviews: 506, yearsExp: 9, clinic: { en: "DermaCare Clinic", ar: "عيادة ديرماكير" }, bio: { en: "Dermatologist treating acne, eczema, and skin cancer screening with laser therapy.", ar: "أخصائية جلدية تعالج حب الشباب والإكزيما وفحص سرطان الجلد والعلاج بالليزر." }, verified: true, avatarGradient: "from-fuchsia-400 to-pink-500", initials: "سق", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "200 SAR", ar: "200 ريال" } },
    { id: "d4", nameDisplay: { en: "Dr. Khalid Al-Dossari", ar: "د. خالد الدوسري" }, specialtyId: "neuro", location: { en: "Dammam", ar: "الدمام" }, rating: 4.7, reviews: 189, yearsExp: 17, clinic: { en: "Eastern Neuro Center", ar: "مركز الشرق للأعصاب" }, bio: { en: "Neurologist specializing in epilepsy, stroke recovery and migraine management.", ar: "استشاري أعصاب متخصص في الصرعة وتأهيل السكتة الدماغية والصداع النصفي." }, verified: true, avatarGradient: "from-violet-400 to-purple-500", initials: "خد", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "180 SAR", ar: "180 ريال" } },
    { id: "d5", nameDisplay: { en: "Dr. Noura Al-Otaibi", ar: "د. نورة العتيبي" }, specialtyId: "endo", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.8, reviews: 237, yearsExp: 12, clinic: { en: "Saudi Diabetes Center", ar: "السعودي للسكري" }, bio: { en: "Endocrinologist managing diabetes, thyroid disorders and metabolic syndrome.", ar: "استشارية غدد صماء لإدارة السكري واضطرابات الغدة الدرقية ومتلازمة الأيض." }, verified: true, avatarGradient: "from-teal-400 to-emerald-500", initials: "نع", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "160 SAR", ar: "160 ريال" } },
    { id: "d6", nameDisplay: { en: "Dr. Faisal Al-Ghamdi", ar: "د. فيصل الغامدي" }, specialtyId: "ortho", location: { en: "Mecca", ar: "مكة" }, rating: 4.6, reviews: 154, yearsExp: 15, clinic: { en: "Mecca Orthopedic Hospital", ar: "مستشفى مكة للعظام" }, bio: { en: "Orthopedic surgeon treating sports injuries, joint replacement and spinal conditions.", ar: "جراح عظام يعالج إصابات الرياضة واستبدال المفاصل وحالات العمود الفقري." }, verified: true, avatarGradient: "from-cyan-400 to-blue-500", initials: "فغ", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "In-person", ar: "مقابلة" } },
    { id: "d7", nameDisplay: { en: "Dr. Mona Al-Zahrani", ar: "د. منى الزهراني" }, specialtyId: "ophthal", location: { en: "Khobar", ar: "الخبر" }, rating: 4.9, reviews: 273, yearsExp: 10, clinic: { en: "Vision Care Center", ar: "مركز الرؤية للعناية بالعين" }, bio: { en: "Ophthalmologist providing cataract surgery, glaucoma care and refractive correction.", ar: "استشارية عيون تقدم جراحة المياه البيضاء ورعاية المياه الزرقاء وتصحيح الإبصار." }, verified: true, avatarGradient: "from-sky-400 to-indigo-500", initials: "مز", languages: [{ en: "Arabic", ar: "العربية" }], consultationFee: { en: "250 SAR", ar: "250 ريال" } },
    { id: "d8", nameDisplay: { en: "Dr. Yousef Al-Mutairi", ar: "د. يوسف المطيري" }, specialtyId: "psych", location: { en: "Riyadh", ar: "الرياض" }, rating: 4.7, reviews: 198, yearsExp: 13, clinic: { en: "MindWell Clinic", ar: "عيادة مايندويل" }, bio: { en: "Psychiatrist treating anxiety, depression and sleep disorders with CBT.", ar: "استشاري نفسي يعالج القلق والاكتئاب واضطرابات النوم بالعلاج المعرفي السلوكي." }, verified: true, avatarGradient: "from-indigo-400 to-blue-600", initials: "يم", languages: [{ en: "Arabic", ar: "العربية" }, { en: "English", ar: "الإنجليزية" }], consultationFee: { en: "220 SAR", ar: "220 ريال" } },
  ];

  /* Lookup helpers used widely by components. */
  function getSpecialty(id) {
    return specialties.filter(function (s) { return s.id === id; })[0] || specialties[0];
  }
  function getDoctor(id) {
    return doctors.filter(function (d) { return d.id === id; })[0];
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
    { id: "a1", doctorId: "d1", time: { en: "10:30 AM", ar: "10:30 ص" }, date: { en: "Tomorrow, Nov 12", ar: "غدًا، 12 نوفمبر" }, type: { en: "Cardiology follow-up", ar: "متابعة القلب" }, status: { en: "Confirmed", ar: "مؤكد" } },
    { id: "a2", doctorId: "d5", time: { en: "2:00 PM", ar: "2:00 م" }, date: { en: "Mon, Nov 18", ar: "الإثنين، 18 نوفمبر" }, type: { en: "Diabetes review", ar: "مراجعة السكري" }, status: { en: "Confirmed", ar: "مؤكد" } },
    { id: "a3", doctorId: "d3", time: { en: "11:15 AM", ar: "11:15 ص" }, date: { en: "Wed, Nov 20", ar: "الأربعاء، 20 نوفمبر" }, type: { en: "Skin check-up", ar: "فحص الجلد" }, status: { en: "Pending", ar: "قيد التأكيد" } },
  ];
  var healthUpdates = [
    { id: "u1", title: { en: "Lab results ready", ar: "نتائج المختبر جاهزة" }, body: { en: "Your cholesterol panel is available. LDL slightly elevated — review recommended.", ar: "نتائج فحص الكوليسترول متاحة. ارتفاع طفيف في LDL — يُنصح بالمراجعة." }, icon: "FlaskConical", tone: "teal", time: { en: "2h ago", ar: "قبل ساعتين" } },
    { id: "u2", title: { en: "Vaccination reminder", ar: "تذكير بالتطعيم" }, body: { en: "Seasonal flu vaccine is due. Book with a verified general practitioner near you.", ar: "لقاح الإنفلونزا الموسمي مستحق. احجز مع ممارس عام موثّق قريب منك." }, icon: "Syringe", tone: "blue", time: { en: "1d ago", ar: "قبل يوم" } },
    { id: "u3", title: { en: "Medication refill", ar: "تجديد الدواء" }, body: { en: "Your metformin prescription expires in 3 days. Request a renewal.", ar: "وصفة الميتفورمين تنتهي خلال 3 أيام. اطلب التجديد." }, icon: "Pill", tone: "amber", time: { en: "2d ago", ar: "قبل يومين" } },
  ];
  var vitals = [
    { id: "v1", label: { en: "Heart Rate", ar: "ضربات القلب" }, value: { en: "72", ar: "72" }, unit: { en: "bpm", ar: "نبضة/د" }, icon: "HeartPulse", trend: "Normal", trendDir: "flat", tone: "text-rose-500" },
    { id: "v2", label: { en: "Blood Pressure", ar: "ضغط الدم" }, value: { en: "118/76", ar: "118/76" }, unit: { en: "mmHg", ar: "مم زئبق" }, icon: "Gauge", trend: "Optimal", trendDir: "down", tone: "text-teal-600" },
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
    { id: "doc1", name: { en: "Lipid Panel — Full", ar: "فحص الدهون الكامل" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Nov 8, 2024", ar: "8 نوفمبر 2024" }, doctorId: "d5", size: "248 KB", icon: "FlaskConical", tone: "bg-teal-50 text-teal-600" },
    { id: "doc2", name: { en: "ECG Stress Test Report", ar: "تقرير تخطيط القلب بالجهد" }, type: { en: "Cardiology Report", ar: "تقرير قلب" }, date: { en: "Oct 22, 2024", ar: "22 أكتوبر 2024" }, doctorId: "d1", size: "1.2 MB", icon: "HeartPulse", tone: "bg-rose-50 text-rose-600" },
    { id: "doc3", name: { en: "HbA1c Result", ar: "نتيجة السكر التراكمي" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Oct 15, 2024", ar: "15 أكتوبر 2024" }, doctorId: "d5", size: "196 KB", icon: "FlaskConical", tone: "bg-teal-50 text-teal-600" },
    { id: "doc4", name: { en: "Chest X-Ray", ar: "أشعة صدر" }, type: { en: "Imaging", ar: "أشعة" }, date: { en: "Sep 30, 2024", ar: "30 سبتمبر 2024" }, doctorId: "d2", size: "3.4 MB", icon: "ScanLine", tone: "bg-slate-100 text-slate-600" },
    { id: "doc5", name: { en: "Allergy Panel", ar: "فحص الحساسية" }, type: { en: "Lab Result", ar: "نتيجة مختبر" }, date: { en: "Aug 12, 2024", ar: "12 أغسطس 2024" }, doctorId: "d3", size: "312 KB", icon: "FlaskConical", tone: "bg-fuchsia-50 text-fuchsia-600" },
  ];
  var accessSessions = [
    { id: "s1", doctorId: "d1", createdAt: { en: "Today, 9:10 AM", ar: "اليوم، 9:10 ص" }, expiresAt: { en: "in 38 min", ar: "خلال 38 دقيقة" }, status: "active" },
    { id: "s2", doctorId: "d5", createdAt: { en: "Yesterday", ar: "أمس" }, expiresAt: { en: "expired", ar: "منتهٍ" }, status: "expired" },
  ];

  /* ===================================================================
   * 6. KNOWLEDGE BASE — Doctor-verified pre-answered solutions
   * -------------------------------------------------------------------
   * Used by Patient AI Smart Search. Schema:
   *   { id, question, answer, doctorId, specialtyId, upvotes, tags:[{en,ar}] }
   * =================================================================== */
  var preAnswered = [
    { id: "p1", question: { en: "I have chest tightness and shortness of breath — what should I do?", ar: "أعاني من ضيق في الصدر وضيق في التنفس — ماذا أفعل؟" }, answer: { en: "Chest tightness with breathlessness can signal a cardiac event. If symptoms are sudden, severe, or spread to the arm/jaw, seek emergency care immediately. Otherwise, book a same-day cardiology assessment and avoid exertion.", ar: "قد يشير ضيق الصدر مع ضيق التنفس إلى حدث قلبي. إذا كانت الأعراض مفاجئة أو شديدة أو تمتد للذراع/الفك، اطلب رعاية طارئة فورًا. وإلا فاحجز تقييمًا قلبيًا في نفس اليوم وتجنّب المجهود." }, doctorId: "d1", specialtyId: "cardio", upvotes: 482, tags: [{ en: "Chest pain", ar: "ألم الصدر" }, { en: "Emergency", ar: "طوارئ" }] },
    { id: "p2", question: { en: "My child has a fever of 39°C and a rash — is it serious?", ar: "طفلي حرارته 39 مع طفح جلدي — هل خطير؟" }, answer: { en: "Fever with rash in children warrants prompt pediatric evaluation to rule out viral exanthems or bacterial infection. Keep the child hydrated, use paracetamol for comfort, and visit a pediatrician within 12 hours.", ar: "الحمى مع الطفح عند الأطفال تستوجب تقييمًا طبيًا سريعًا لاستبعاد الأمراض الفيروسية أو البكتيرية. حافظ على ترطيب الطفل واستخدم الباراسيتامول للراحة وزر طبيب أطفال خلال 12 ساعة." }, doctorId: "d2", specialtyId: "pediatrics", upvotes: 367, tags: [{ en: "Fever", ar: "حمى" }, { en: "Rash", ar: "طفح" }] },
    { id: "p3", question: { en: "Persistent acne despite washing — what actually works?", ar: "حب شباب مستمر رغم الغسل — ما الذي ينجح فعلًا؟" }, answer: { en: "Acne isn't caused by poor hygiene. Evidence-based treatments include topical retinoids, benzoyl peroxide, and if moderate–severe, oral therapy. Over-washing can irritate skin. See a dermatologist for a tailored plan.", ar: "حب الشباب لا ينتج عن ضعف النظافة. تشمل العلاجات المثبتة الريتينويد الموضعي وبيروكسيد البنزويل، وفي الحالات المتوسطة–الشديدة علاج فموي. الغسل المفرط يهيّج الجلد. راجع طبيب جلدية لخطة مخصصة." }, doctorId: "d3", specialtyId: "derma", upvotes: 529, tags: [{ en: "Acne", ar: "حب الشباب" }, { en: "Skincare", ar: "العناية بالبشرة" }] },
    { id: "p4", question: { en: "Frequent migraines — when should I worry?", ar: "صداع نصفي متكرر — متى أقلق؟" }, answer: { en: "Worry if migraines increase in frequency, change character, or come with neurological symptoms (vision loss, weakness). Maintain a trigger diary and consult a neurologist for preventive options.", ar: "قلق استدامًا إذا زادت وتيرة الصداع النصفي أو تغيّرت طبيعته أو رافقه أعراض عصبية (فقدان رؤية، ضعف). احتفظ بدفتر المثيرات واستشر طبيب أعصاب لخيارات الوقاية." }, doctorId: "d4", specialtyId: "neuro", upvotes: 241, tags: [{ en: "Headache", ar: "صداع" }, { en: "Migraine", ar: "صداع نصفي" }] },
    { id: "p5", question: { en: "My fasting blood sugar is 130 — is that diabetes?", ar: "سكر الدم الصائم 130 — هل هذا سكري؟" }, answer: { en: "Fasting glucose of 130 mg/dL indicates impaired fasting glucose or early diabetes. Confirm with an HbA1c test and an endocrinologist consult. Lifestyle changes are effective at this stage.", ar: "سكر الصائم 130 مغ/دل يشير إلى اضطراب الصائم أو سكري مبكر. أكّد بفحص السكر التراكمي واستشارة غدد صماء. التغييرات الصحية فعّالة في هذه المرحلة." }, doctorId: "d5", specialtyId: "endo", upvotes: 318, tags: [{ en: "Diabetes", ar: "السكري" }, { en: "Blood sugar", ar: "سكر الدم" }] },
  ];

  /* ===================================================================
   * 7. COMMUNITY CONTENT  (Patient + Doctor public feed)
   * -------------------------------------------------------------------
   * communityPosts — verified articles/videos/images by specialty channel.
   *   Schema: { id, type(article|video|image), channelId, title, excerpt,
   *             doctorId, time, upvotes, comments, mediaGradient, mediaIcon }
   * qaItems — Q&A board: patient questions + doctor answers (upvoted).
   * =================================================================== */
  var communityPosts = [
    { id: "c1", type: "article", channelId: "cardio", title: { en: "Understanding Hypertension: A Patient Guide", ar: "فهم ارتفاع ضغط الدم: دليل للمريض" }, excerpt: { en: "What the numbers mean, when to treat, and lifestyle changes that genuinely lower readings.", ar: "ماذا تعني الأرقام ومتى يُعالج وتغييرات صحية تخفض القراءات فعليًا." }, doctorId: "d1", time: { en: "3d ago", ar: "قبل 3 أيام" }, upvotes: 1240, comments: 88, mediaGradient: "from-rose-500 to-red-700", mediaIcon: "HeartPulse" },
    { id: "c2", type: "video", channelId: "cardio", title: { en: "How to Measure Your Blood Pressure at Home", ar: "كيف تقيس ضغط الدم في المنزل" }, excerpt: { en: "A 4-minute walkthrough of correct cuff placement and common mistakes.", ar: "شرح مدته 4 دقائق لوضع الكفة الصحيح والأخطاء الشائعة." }, doctorId: "d1", time: { en: "1w ago", ar: "قبل أسبوع" }, upvotes: 890, comments: 54, mediaGradient: "from-red-400 to-rose-600", mediaIcon: "PlayCircle" },
    { id: "c3", type: "article", channelId: "pediatrics", title: { en: "Vaccination Schedule 2024: Birth to 18 Years", ar: "جدول التطعيمات 2024: من الولادة إلى 18 سنة" }, excerpt: { en: "The complete recommended immunization timeline with side-effect guidance.", ar: "الجدول الزمني الكامل للتطعيمات الموصى بها مع إرشادات الآثار الجانبية." }, doctorId: "d2", time: { en: "5d ago", ar: "قبل 5 أيام" }, upvotes: 2103, comments: 142, mediaGradient: "from-amber-400 to-orange-600", mediaIcon: "Baby" },
    { id: "c4", type: "image", channelId: "derma", title: { en: "Recognizing Melanoma: ABCDE Rule Visual", ar: "التعرف على الميلانوما: قاعدة ABCDE البصرية" }, excerpt: { en: "A visual guide to spot warning signs of skin cancer early.", ar: "دليل بصري لرصد علامات سرطان الجلد مبكرًا." }, doctorId: "d3", time: { en: "2d ago", ar: "قبل يومين" }, upvotes: 1670, comments: 96, mediaGradient: "from-fuchsia-500 to-pink-700", mediaIcon: "Sparkles" },
    { id: "c5", type: "article", channelId: "neuro", title: { en: "Migraine Triggers and Preventive Therapy", ar: "مثيرات الصداع النصفي والعلاج الوقائي" }, excerpt: { en: "Evidence-based trigger management and when preventive medication is indicated.", ar: "إدارة المثيرات المثبتة ومتى يُلجأ للعلاج الوقائي." }, doctorId: "d4", time: { en: "4d ago", ar: "قبل 4 أيام" }, upvotes: 732, comments: 41, mediaGradient: "from-violet-500 to-purple-700", mediaIcon: "Brain" },
    { id: "c6", type: "video", channelId: "endo", title: { en: "Living Well with Type 2 Diabetes", ar: "العيش بشكل جيد مع السكري النوع الثاني" }, excerpt: { en: "Diet, monitoring, and medication adherence explained simply.", ar: "الغذاء والمراقبة والالتزام بالدواء بشرح مبسّط." }, doctorId: "d5", time: { en: "6d ago", ar: "قبل 6 أيام" }, upvotes: 1450, comments: 73, mediaGradient: "from-teal-500 to-emerald-700", mediaIcon: "Activity" },
  ];
  var qaItems = [
    { id: "q1", channelId: "cardio", question: { en: "Is it safe to exercise with controlled hypertension?", ar: "هل ممارسة الرياضة آمنة مع ضغط دم مضبوط؟" }, askedBy: { en: "Ahmed R.", ar: "أحمد ر." }, time: { en: "5h ago", ar: "قبل 5 ساعات" }, answers: [{ id: "a1", doctorId: "d1", body: { en: "Yes — regular aerobic exercise actually lowers blood pressure. Start moderate (brisk walking 30 min, 5x/week) and avoid heavy isometric lifting until cleared.", ar: "نعم — التمارين الهوائية المنتظمة تخفض الضغط فعلًا. ابدأ معتدلًا (المشي السريع 30 دقيقة 5 مرات/أسبوع) وتجنّب رفع الأثقال الثقيل حتى يُسمح." }, upvotes: 142, peerVerified: true, time: { en: "3h ago", ar: "قبل 3 ساعات" } }] },
    { id: "q2", channelId: "derma", question: { en: "Best sunscreen for sensitive acne-prone skin?", ar: "أفضل واقي شمس للبشرة الحساسة المعرضة لحب الشباب؟" }, askedBy: { en: "Huda K.", ar: "هدى ك." }, time: { en: "1d ago", ar: "قبل يوم" }, answers: [{ id: "a2", doctorId: "d3", body: { en: "Look for non-comedogenic, mineral sunscreens (zinc oxide) SPF 30+. They don't clog pores and suit sensitive skin. Reapply every 2 hours outdoors.", ar: "ابحث عن واقيات معدنية غير مسدّدة للمسام (أكسيد الزنك) SPF 30+. لا تسد المسام وتناسب البشرة الحساسة. أعد وضعها كل ساعتين بالخارج." }, upvotes: 98, peerVerified: true, time: { en: "20h ago", ar: "قبل 20 ساعة" } }] },
    { id: "q3", channelId: "endo", question: { en: "Can type 2 diabetes be reversed with diet alone?", ar: "هل يمكن عكس السكري النوع الثاني بالغذاء وحده؟" }, askedBy: { en: "Salem A.", ar: "سالم ع." }, time: { en: "2d ago", ar: "قبل يومين" }, answers: [{ id: "a3", doctorId: "d5", body: { en: "Early type 2 can enter remission with significant weight loss (10–15%) and low-calorie programs, but reversal is not guaranteed. Ongoing monitoring is essential.", ar: "قد يدخل السكري النوع الثاني المبكر في هدأة مع فقدان وزن كبير (10–15%) وبرامج منخفضة السعرات، لكن العكس غير مضمون. المراقبة المستمرة ضرورية." }, upvotes: 211, peerVerified: true, time: { en: "1d ago", ar: "قبل يوم" } }] },
  ];

  /* ===================================================================
   * 8. DOCTORS-ONLY FORUM  — anonymized case repositories
   * -------------------------------------------------------------------
   * forumCases — peer-reviewed clinical cases. Schema:
   *   { id, title, presentation, protocol, tags, authorSpecialtyId,
   *     upvotes, collaborators, time, status, suggestions:[
   *       { id, doctorId, body, upvotes, time, bestApproach } ] }
   * NOTE: Arabic typo fixed — "المُognito" replaced with "مجهولة الهوية".
   * =================================================================== */
  var forumCases = [
    { id: "f1", title: { en: "Refractory VT in 58yo post-MI despite optimal medical therapy", ar: "تسرع بطيني مُقاوم في مريض 58 سنة بعد احتشاء رغم العلاج المثالي (حالة مجهولة الهوية)" }, presentation: { en: "Male, 58, 3 months post-inferior MI, EF 32%. Recurrent monomorphic VT episodes despite bisoprolol and amiodarone. No reversible ischemia on angiography.", ar: "ذكر، 58، بعد 3 أشهر من احتشاء سفلي، الكسر 32%. نوبات تسرع بطيني أحادي الشكل متكررة رغم البيسوبرولول والأميودارون. لا إقفار عكسي في تصوير الأوعية." }, protocol: { en: "Considering ICD implantation plus catheter ablation of the infarct scar substrate. Seeking peer input on ablation timing relative to ICD.", ar: "أفكر في زرع مقوم نظم ومزيل رجفان مع استئصال قثطاري للركيزة الندبية. أطلب رأي الزملاء حول توقيت الاستئصال نسبةً للجهاز." }, tags: [{ en: "Cardiology", ar: "القلب" }, { en: "Electrophysiology", ar: "فيزيولوجيا كهربية" }, { en: "ICD", ar: "مقوم نظم" }], authorSpecialtyId: "cardio", upvotes: 87, collaborators: 6, time: { en: "2d ago", ar: "قبل يومين" }, status: { en: "Open for review", ar: "مفتوح للمراجعة" }, suggestions: [{ id: "fs1", doctorId: "d4", body: { en: "Recommend ICD first (Class I, EF<=35%) then staged ablation within 6 weeks — reduces VT storm risk during healing.", ar: "أنصح بجهاز مقوم نظم أولًا (الطبقة الأولى، الكسر ≤35%) ثم استئصال مرحلي خلال 6 أسابيع — يقلل خطر عاصفة التسرع البطيني أثناء الشفاء." }, upvotes: 34, time: { en: "1d ago", ar: "قبل يوم" }, bestApproach: true }, { id: "fs2", doctorId: "d6", body: { en: "Agree with ICD. Also consider upgrading amiodarone to sotalol if QT permits, and rule out sleep apnea as a trigger.", ar: "موافق على الجهاز. فكّر أيضًا في استبدال الأميودارون بالسوتالول إذا سمحت فترة QT، واستبعد انقطاع النفس النومي كمثير." }, upvotes: 19, time: { en: "1d ago", ar: "قبل يوم" }, bestApproach: false }] },
    { id: "f2", title: { en: "Pediatric autoimmune encephalitis — refractory to first-line IVIG", ar: "التهاب دماغ مناعي عند طفل — مقاوم للغلوبولين الوريدي الأول (حالة مجهولة الهوية)" }, presentation: { en: "Female, 9, subacute psychiatric symptoms, seizures, anti-NMDA receptor antibodies. No teratoma found. No improvement after 5 days IVIG and methylprednisolone.", ar: "أنثى، 9، أعراض نفسية تحت حادة، تشنجات، أجسام مضادة لمستقبلات NMDA. لا ورم عصبي صخروي. لا تحسن بعد 5 أيام غلوبولين وريدي وميثيلبردنيزولون." }, protocol: { en: "Considering rituximab as second-line. Seeking experience on dosing and timing, and when to repeat tumor screening.", ar: "أفكر في الريتوكسيماب كخط ثانٍ. أطلب خبرة حول الجرعة والتوقيت، ومتى أعاد فحص الورم." }, tags: [{ en: "Pediatrics", ar: "الأطفال" }, { en: "Neurology", ar: "الأعصاب" }, { en: "Immunology", ar: "المناعة" }], authorSpecialtyId: "neuro", upvotes: 64, collaborators: 4, time: { en: "4d ago", ar: "قبل 4 أيام" }, status: { en: "Open for review", ar: "مفتوح للمراجعة" }, suggestions: [{ id: "fs3", doctorId: "d4", body: { en: "Rituximab 375 mg/m2 weekly x4 is standard second-line. Re-screen for ovarian teratoma with pelvic MRI at 3 and 6 months — occult tumors can emerge late.", ar: "الريتوكسيماب 375 مغ/م² أسبوعيًا ×4 هو الخط الثاني القياسي. أعد فحص الورم العصبي الصخروي برنين الحوض بعد 3 و6 أشهر — قد تظهر الأورام الكامنة متأخرة." }, upvotes: 28, time: { en: "3d ago", ar: "قبل 3 أيام" }, bestApproach: true }] },
    { id: "f3", title: { en: "Severe psoriasis with paradoxical reaction to anti-TNF", ar: "صدفية شديدة مع تفاعل متناقض لمضاد TNF (حالة مجهولة الهوية)" }, presentation: { en: "Male, 34, plaque psoriasis PASI 22. After 12 weeks adalimumab, new pustular lesions appeared. Biopsy confirms paradoxical psoriasiform eruption.", ar: "ذكر، 34، صدفية لويحية PASI 22. بعد 12 أسبوعًا أداليموماب ظهرت آفات بثرية جديدة. الخزعة تأكد التفاعل الصدفي المتناقض." }, protocol: { en: "Planning to switch to IL-17 inhibitor (secukinumab). Requesting peer input on washout period and risk of flare.", ar: "أخطط للتحول إلى مثبط IL-17 (سيكوكينوماب). أطلب رأي الزملاء حول فترة الغسيل وخطر التوهج." }, tags: [{ en: "Dermatology", ar: "الجلدية" }, { en: "Immunology", ar: "المناعة" }], authorSpecialtyId: "derma", upvotes: 52, collaborators: 3, time: { en: "6d ago", ar: "قبل 6 أيام" }, status: { en: "Open for review", ar: "مفتوح للمراجعة" }, suggestions: [{ id: "fs4", doctorId: "d3", body: { en: "Switch directly — no washout needed for IL-17. Monitor for inflammatory bowel disease symptoms as IL-17 can unmask it.", ar: "حوّل مباشرة — لا غسيل مطلوب لـ IL-17. راقب أعراض التهاب الأمعاء لأن IL-17 قد يكشفه." }, upvotes: 22, time: { en: "5d ago", ar: "قبل 5 أيام" }, bestApproach: true }] },
  ];

  /* ===================================================================
   * 9. DOCTOR HOME DATA
   * -------------------------------------------------------------------
   * doctorSchedule — today's appointment slots. accessRequests — incoming
   *   patient QR-access requests. referralNotifs — transferred cases.
   *   doctorMetrics — engagement KPI cards.
   * =================================================================== */
  var doctorSchedule = [
    { id: "sch1", time: { en: "09:00", ar: "09:00" }, patientName: { en: "Abdullah M.", ar: "عبدالله م." }, reason: { en: "Post-MI follow-up", ar: "متابعة بعد احتشاء" }, type: "in-person", status: { en: "Checked in", ar: "وصل" } },
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
   * clinicalRefs — peer-reviewed references with citation tags.
   *   Schema: { id, title, source, specialtyId, summary, citedBy,
   *             guidelines:[code], year }
   * =================================================================== */
  var guidelines = [
    { code: "NICE", name: { en: "NICE — UK National Institute", ar: "NICE — المعهد الوطني البريطاني" }, color: "border-sky-300 bg-sky-50 text-sky-700" },
    { code: "RCOG", name: { en: "RCOG — Royal College of Obstetricians", ar: "RCOG — الكلية الملكية لأطباء النساء" }, color: "border-violet-300 bg-violet-50 text-violet-700" },
    { code: "ACOG", name: { en: "ACOG — American College of Obstetricians", ar: "ACOG — الكلية الأمريكية لأطباء النساء" }, color: "border-teal-300 bg-teal-50 text-teal-700" },
    { code: "FIGO", name: { en: "FIGO — International Federation", ar: "FIGO — الاتحاد الدولي للنساء والولادة" }, color: "border-amber-300 bg-amber-50 text-amber-700" },
    { code: "ESHRE", name: { en: "ESHRE — Human Reproduction", ar: "ESHRE — الإنجاب البشري" }, color: "border-rose-300 bg-rose-50 text-rose-700" },
  ];
  function getGuideline(code) {
    return guidelines.filter(function (g) { return g.code === code; })[0];
  }
  var clinicalRefs = [
    { id: "r1", title: { en: "Management of ACS — ESC/NICE 2024", ar: "إدارة المتلازمة التاجية الحادة — ESC/NICE 2024" }, source: { en: "European Society of Cardiology", ar: "الجمعية الأوروبية للقلب" }, specialtyId: "cardio", summary: { en: "Updated risk stratification and invasive strategy timing for NSTE-ACS.", ar: "تحديث لتصنيف المخاطر وتوقيت الاستراتيجية الجراحية لـ NSTE-ACS." }, citedBy: 1280, guidelines: ["NICE", "FIGO"], year: 2024 },
    { id: "r2", title: { en: "Gestational Diabetes — NICE & RCOG 2026", ar: "سكري الحمل — NICE وRCOG 2026" }, source: { en: "RCOG / NICE", ar: "RCOG / NICE" }, specialtyId: "endo", summary: { en: "Screening at 24-28 weeks, oral glucose tolerance test; metformin first-line if lifestyle fails.", ar: "الفحص بين 24-28 أسبوعًا، اختبار تحمل الجلوكوز؛ الميتفورمين خطًا أولًا عند فشل نمط الحياة." }, citedBy: 980, guidelines: ["NICE", "RCOG", "FIGO"], year: 2026 },
    { id: "r3", title: { en: "Psoriasis Biologic Algorithm — AAD/NICE", ar: "خوارزمية البيولوجيك للصدفية — AAD/NICE" }, source: { en: "American Academy of Dermatology", ar: "الأكاديمية الأمريكية للأمراض الجلدية" }, specialtyId: "derma", summary: { en: "Biologic sequencing guidance including IL-17/IL-23 choice by severity.", ar: "إرشادات تسلسل البيولوجيات بما فيها اختيار IL-17/IL-23 حسب الشدة." }, citedBy: 642, guidelines: ["NICE"], year: 2024 },
    { id: "r4", title: { en: "Pre-eclampsia — ACOG & FIGO 2026", ar: "مقدمات الارتعاج — ACOG وFIGO 2026" }, source: { en: "ACOG / FIGO", ar: "ACOG / FIGO" }, specialtyId: "obgyn", summary: { en: "Aspirin 150mg from 12 weeks for high-risk; magnesium sulfate for seizure prophylaxis.", ar: "الأسبرين 150 مغ من الأسبوع 12 للعالي الخطورة؛ كبريتات المغنيسيوم للوقاية من التشنج." }, citedBy: 1520, guidelines: ["ACOG", "FIGO", "NICE"], year: 2026 },
    { id: "r5", title: { en: "PCOS Diagnosis & Fertility — ESHRE/ASRM", ar: "تشخيص متلازمة المبيض المتعدد الكيسات والخصوبة — ESHRE/ASRM" }, source: { en: "ESHRE / ASRM", ar: "ESHRE / ASRM" }, specialtyId: "obgyn", summary: { en: "Rotterdam criteria; letrozole first-line ovulation induction; lifestyle cornerstone.", ar: "معايير روتردام؛ الليتروزول خطًا أولًا لتحريض الإباضة؛ نمط الحياة ركيزة." }, citedBy: 870, guidelines: ["ESHRE", "ACOG"], year: 2024 },
  ];

  /* ===================================================================
   * 11. PATIENT SUMMARY + CONSULTANT MENTOR MODE
   * -------------------------------------------------------------------
   * patientSummary — Instant AI summary used by the Patient Summary modal.
   * mentorAnalysis — 6-card structured analysis for an uploaded CTG/lab
   *   report, plus 3 board-style MCQs. Returned by
   *   ApiService.generateMentorAnalysis() when Gemini is offline.
   * =================================================================== */
  var patientSummary = {
    patientName: { en: "Reem S.", ar: "ريم س." },
    ageGender: { en: "34, Female", ar: "34، أنثى" },
    summary: { en: "Type 2 diabetic (HbA1c 7.4%) on metformin. Recent ECG shows sinus rhythm with occasional PACs. Lipid panel: LDL 132 (elevated). No prior cardiac events. Reports palpitations increasing over 2 weeks, correlated with caffeine intake.", ar: "مريضة سكري النوع الثاني (تراكمي 7.4) على الميتفورمين. تخطيط القلب الحالي نظم جيبي مع توافق أذيني مبكر عرضي. الدهون: LDL 132 (مرتفع). لا أحداث قلبية سابقة. تشتكي من خفقان متزايد خلال أسبوعين مرتبط بالكافيين." },
    keyFindings: [
      { en: "HbA1c 7.4% — suboptimal control", ar: "التراكمي 7.4% — ضبط غير مثالي" },
      { en: "LDL 132 mg/dL — above target", ar: "LDL 132 مغ/دل — فوق الهدف" },
      { en: "Occasional PACs on ECG, no VT", ar: "توافق أذيني مبكر عرضي، لا تسرع بطيني" },
      { en: "Palpitations temporally linked to caffeine", ar: "خفقان مرتبط زمنيًا بالكافيين" },
    ],
    recommendations: [
      { en: "Consider 24h Holter to quantify arrhythmia burden", ar: "فكّر في هولتر 24 ساعة لقياس عبء اضطراب النظم" },
      { en: "Lifestyle: reduce caffeine, optimize glycemic control", ar: "نمط حياة: قلل الكافيين، حسّن ضبط السكر" },
      { en: "Initiate statin therapy for LDL target <70", ar: "ابدأ علاج الستاتين لهدف LDL أقل من 70" },
    ],
  };
  var mentorAnalysis = {
    reportTitle: { en: "CTG at 39 weeks — reduced variability & late decels", ar: "تخطيط قلب الجنين 39 أسبوعًا — تقلب منخفض وتباطؤ متأخر" },
    reportType: { en: "Cardiotocography (CTG)", ar: "تخطيط قلب الجنين (CTG)" },
    guidelines: ["NICE", "RCOG", "FIGO"],
    pathophysiology: {
      physiology: { en: "Normal fetal heart rate baseline 110-160 bpm with variability 5-25 bpm and accelerations reflects a well-oxygenated autonomic nervous system. The CTG is a screening tool, not diagnostic.", ar: "النظم القاعدي الطبيعي لقلب الجنين 110-160 نبضة/د مع تقلب 5-25 وتسارعات يعكس جهازًا عصبيًا ذاتيًا جيد التأكسج. الـCTG أداة فحص وليس تشخيصيًا." },
      pathology: { en: "Reduced variability (<5 bpm for >30 min) plus recurrent late decelerations suggests uteroplacental insufficiency and developing fetal hypoxia/acidosis. Combined with a rising baseline, this meets NICE/RCOG pathological CTG criteria.", ar: "التقلب المنخفض (أقل من 5 نبضة/د لأكثر من 30 دقيقة) مع تباطؤ متأخر متكرر يشير إلى قصور رحمي مشيمي ونقص أكسجة/حماض جنيني متطور. مع ارتفاع النظم القاعدي، يحقق معايير الـCTG المرضي وفق NICE/RCOG." },
    },
    differentials: [
      { dx: { en: "Uteroplacental insufficiency / fetal hypoxia", ar: "قصور رحمي مشيمي / نقص أكسجة جنيني" }, probability: 78, severity: { en: "High — risk of acidosis", ar: "عالي — خطر الحماض" } },
      { dx: { en: "Medication effect (opioid/magnesium sulfate)", ar: "تأثير دوائي (أفيوني/كبريتات المغنيسيوم)" }, probability: 12, severity: { en: "Low — reversible", ar: "منخفض — قابل للعكس" } },
      { dx: { en: "Fetal sleep cycle / transient", ar: "نوم جنيني / عابر" }, probability: 7, severity: { en: "Low — observe 40 min", ar: "منخفض — مراقبة 40 دقيقة" } },
      { dx: { en: "Chorioamnionitis", ar: "التهاب المشيماء والسلى" }, probability: 3, severity: { en: "Moderate-High", ar: "متوسط-عالي" } },
    ],
    decision: {
      intervene: { en: "If pathological CTG persists despite intrauterine resuscitation (left lateral, IV fluids, stop oxytocin, consider tocolysis) for ~15-20 min — proceed to expedited delivery (category-1 LUSCS). Apply the fresh eyes 2nd review at 30 min.", ar: "إذا استمر الـCTG المرضي رغم الإنعاش الرحمي (جنب أيسر، سوائل وريدية، إيقاف الأوكسيتوسين، تأمل التوليد) لنحو 15-20 دقيقة — انتقل للولادة العاجلة (قيصرية منخفضة الخطورة فئة 1). طبّق المراجعة الثانية عيون جديدة عند 30 دقيقة." },
      observe: { en: "If variability recovers and decels resolve after resuscitation, continue CTG surveillance and re-classify. Avoid continuous fetal blood sampling — discontinued in current NICE guidance.", ar: "إذا تعافى التقلب وزال التباطؤ بعد الإنعاش، واصل مراقبة الـCTG وأعد التصنيف. تجنب أخذ عينة دم جنيني مستمر — متوقف في إرشادات NICE الحالية." },
    },
    pitfalls: {
      refs: { en: "NICE NG229 (Fetal monitoring in labour, 2022) · RCOG Green-top 8 · FIGO consensus 2019", ar: "NICE NG229 (مراقبة الجنين أثناء الولادة 2022) · RCOG Green-top 8 · إجماع FIGO 2019" },
      pitfalls: [
        { en: "Over-relying on a single CTG without clinical context (infection, growth, meconium).", ar: "الاعتماد المفرط على CTG واحد دون سياق سريري (عدوى، نمو، عقي)." },
        { en: "Mislabeling a variable decel as 'late' — timing relative to contraction peak matters.", ar: "تصنيف التباطؤ المتغير خطأً كـ'متأخر' — التوقيت نسبةً لذروة الانقباض مهم." },
        { en: "Not stopping oxytocin promptly when CTG becomes suspicious.", ar: "عدم إيقاف الأوكسيتوسين فورًا عند اشتباه الـCTG." },
        { en: "Delaying category-1 section while awaiting a 'second opinion' beyond 30 min.", ar: "تأخير القيصرية فئة 1 انتظارًا لرأي ثانٍ بعد 30 دقيقة." },
      ],
    },
    pearls: {
      pearls: [
        { en: "Use DR C BRAVADO (DR, Risk, Contractions, BP, RA, Vaginal loss, Amniotic fluid, Drugs, Overall) for structured CTG interpretation.", ar: "استخدم DR C BRAVADO لتفسير منظم للـCTG." },
        { en: "A 40-minute fetal sleep episode can reduce variability — recheck before acting.", ar: "نوبة نوم جنيني 40 دقيقة قد تقلل التقلب — أعد الفحص قبل التدخل." },
        { en: "Document the 'fresh eyes' review — it reduces cesarean for abnormal CTG by ~30%.", ar: "وثّق مراجعة 'العيون الجديدة' — تقلل القيصرية للـCTG غير الطبيعي بنحو 30%." },
      ],
      patientScript: {
        en: "Your baby's heart monitor shows some changes we need to watch closely. This can mean the baby needs more oxygen, so we'll help by changing your position, giving fluids, and slowing the contractions. If the pattern doesn't improve in the next 15 minutes, the safest option is a quick cesarean to bring your baby out safely. You and your baby are our priority.",
        ar: "شاشة قلب الجنين تُظهر تغيرات نحتاج مراقبتها عن قرب. قد تعني أن الجنين يحتاج أكسجين أكثر، لذا سنُغيّر وضعك ونعطي سوائل ونُبطّئ الانقباضات. إذا لم يتحسن النمط خلال 15 دقيقة، فالخيار الأأمن هو ولادة قيصرية سريعة لإخراج الجنين بأمان. أنتِ وطفلك أولويتنا.",
      },
    },
    quiz: [
      { q: { en: "Which CTG feature is most concerning for developing fetal acidosis?", ar: "أي سمة CTG هي الأكثر إثارة للقلق بشأن الحماض الجنيني المتطور؟" }, options: [{ en: "Baseline 145 with accelerations", ar: "نظم قاعدي 145 مع تسارعات" }, { en: "Reduced variability <5 bpm + recurrent late decels", ar: "تقلب منخفض <5 + تباطؤ متأخر متكرر" }, { en: "Early decelerations with normal variability", ar: "تباطؤ مبكر مع تقلب طبيعي" }, { en: "Single variable decel lasting 30 sec", ar: "تباطؤ متغير وحيد يدوم 30 ثانية" }], correct: 1, rationale: { en: "Reduced variability + recurrent late decels signal uteroplacental insufficiency and risk of hypoxia/acidosis (NICE/RCOG pathological).", ar: "التقلب المنخفض + التباطؤ المتأخر المتكرر يشير إلى قصور رحمي مشيمي وخطر نقص أكسجة/حماض (مرضي وفق NICE/RCOG)." } },
      { q: { en: "First intrauterine resuscitation step for a suspicious CTG?", ar: "أول خطوة في الإنعاش الرحمي لـCTG مشتبه؟" }, options: [{ en: "Increase oxytocin to shorten labour", ar: "زيادة الأوكسيتوسين لتقصير الولادة" }, { en: "Left lateral position, stop oxytocin, IV fluids", ar: "جنب أيسر، إيقاف الأوكسيتوسين، سوائل وريدية" }, { en: "Immediate operative vaginal delivery", ar: "ولادة مهبلية جراحية فورية" }, { en: "Administer betamethasone", ar: "إعطاء بيتاميثازون" }], correct: 1, rationale: { en: "Repositioning, stopping oxytocin, and IV fluids improve uteroplacental perfusion — first-line resuscitation per RCOG.", ar: "تغيير الوضع وإيقاف الأوكسيتوسين والسوائل الوريدية تحسّن التروية الرحمية المشيمية — إنعاش خط أول وفق RCOG." } },
      { q: { en: "When should a 'fresh eyes' CTG review happen?", ar: "متى تتم مراجعة CTG 'العيون الجديدة'؟" }, options: [{ en: "Only at the start of labour", ar: "فقط عند بدء الولادة" }, { en: "Every 4 hours", ar: "كل 4 ساعات" }, { en: "Around 30 min into a suspicious/abnormal trace", ar: "نحو 30 دقيقة ضمن تخطيط مشتبه/غير طبيعي" }, { en: "After delivery only", ar: "بعد الولادة فقط" }], correct: 2, rationale: { en: "NICE recommends a second reviewer ('fresh eyes') review at ~30 min for suspicious or abnormal traces to reduce over-intervention.", ar: "توصي NICE بمراجعة ثانية (عيون جديدة) عند ~30 دقيقة للتخطيط المشتبه أو غير الطبيعي لتقليل التدخل الزائد." } },
    ],
  };

  /* ===================================================================
   * 12. SURGICAL TIPS & TRICKS  (Doctors-Only Forum tab)
   * -------------------------------------------------------------------
   * surgicalSpecialties — filter chips for the surgical tab.
   * surgicalTips — posts: video / intra-op trick / protocol.
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
    { id: "st1", title: { en: "Safe Entry for Laparoscopic Hysterectomy — Hassan vs Optical", ar: "دخول آمن لاستئصال الرحم بالمنظار — حسن مقابل البصري" }, specialtyId: "obgyn", type: "trick", doctorId: "d1", excerpt: { en: "Step-by-step on avoiding major vessel injury at primary port placement.", ar: "خطوة بخطوة لتجنّب إصابة الأوعية الكبرى عند وضع المنفذ الأول." }, steps: [{ en: "Palpate the aortic bifurcation — entry above risks the aorta/IVC.", ar: "تحسّس تفرّع الأبهر — الدخول أعلاه يخاطر بالأبهر/الوريد الأجوف." }, { en: "Use Palmer's point (left subcostal, midclavicular) for high-risk adhesions.", ar: "استخدم نقطة بالمر (تحت الضلع الأيسر، منتصف الترقوة) للالتصاقات عالية الخطورة." }, { en: "Elevate abdominal wall + 90° trocar angle; never blind force.", ar: "ارفع جدار البطن + زاوية تروكار 90°؛ لا تستخدم القوة العمياء." }, { en: "Confirm CO2 pressure >=20mmHg before inserting first trocar.", ar: "تأكد من ضغط CO2 ≥20 مم زئبق قبل إدخال التروكار الأول." }], mediaGradient: "from-pink-500 to-rose-700", upvotes: 412, time: { en: "2d ago", ar: "قبل يومين" } },
    { id: "st2", title: { en: "C-Section: Preventing Bladder & Ureter Injury", ar: "القيصرية: الوقاية من إصابة المثانة والحالب" }, specialtyId: "obgyn", type: "video", doctorId: "d2", excerpt: { en: "3-min video: bladder flap technique and ureter identification at difficult LSCS.", ar: "فيديو 3 دقائق: تقنية رفع المثانة وتحديد الحالب في القيصرية الصعبة." }, mediaGradient: "from-rose-400 to-pink-600", duration: { en: "3:24", ar: "3:24" }, upvotes: 689, time: { en: "5d ago", ar: "قبل 5 أيام" } },
    { id: "st3", title: { en: "Postpartum Hemorrhage — Complication-Avoidance Bundle", ar: "نزيف ما بعد الولادة — حزمة الوقاية من المضاعفات" }, specialtyId: "obgyn", type: "protocol", doctorId: "d1", excerpt: { en: "WHO/RCOG bundle: prophylactic oxytocin, bimanual compression, Bakri balloon timing.", ar: "حزمة WHO/RCOG: الأوكسيتوسين الوقائي، الضغط الثنائي اليدين، توقيت بالون باكري." }, steps: [{ en: "Active 3rd-stage management: 10 IU oxytocin IM/IV within 1 min.", ar: "إدارة النشطة للمرحلة الثالثة: 10 وحدة أوكسيتوسين عضلي/وريدي خلال دقيقة." }, { en: "If >500ml: call help, ABC, two large-bore IVs, cross-match.", ar: "إذا >500 مل: استدعِ المساعدة، ABC، وريديان عريضان، تطابق دم." }, { en: "Uterotonics ladder: oxytocin → ergometrine → carboprost → misoprostol.", ar: "سلّم المحرضات الرحمية: أوكسيتوسين → إرغومترين → كاربوبروست → ميزوبروستول." }, { en: "Bakri balloon if atonic & refractory; before that, exclude retained tissue.", ar: "بالون باكري إذا كان رخوًا ومقاومًا؛ قبله، استبقِ الأنسجة المتبقية." }], mediaGradient: "from-red-500 to-rose-700", upvotes: 534, time: { en: "1w ago", ar: "قبل أسبوع" } },
    { id: "st4", title: { en: "Total Laparoscopic Hysterectomy — Ureteric Stent Trick", ar: "استئصال الرحم الكامل بالمنظار — حيلة الدعامة الحالبية" }, specialtyId: "obgyn", type: "trick", doctorId: "d5", excerpt: { en: "When to pre-stent, and how to skeletonize the uterine artery safely.", ar: "متى تُوضع الدعامة مسبقًا، وكيف تُعرّي الشريان الرحمي بأمان." }, steps: [{ en: "Pre-op stent only for large fibroids or endometriosis — not routine.", ar: "دعامة قبل الجراحة فقط للألياف الكبيرة أو البطان الرحمي — ليست روتينية." }, { en: "Open the broad ligament parallel to the round ligament, identify ureter first.", ar: "افتح الرباط العريض موازيًا للرباط المدور، حدد الحالب أولًا." }, { en: "Coagulate uterine artery at its ascending branch, away from ureter.", ar: "خثّر الشريان الرحمي عند فرعه الصاعد، بعيدًا عن الحالب." }], mediaGradient: "from-fuchsia-500 to-pink-700", upvotes: 287, time: { en: "3d ago", ar: "قبل 3 أيام" } },
    { id: "st5", title: { en: "Knee Arthroscopy — Portal Placement to Avoid Cartilage Damage", ar: "منظار الركبة — وضع المنافذ لتجنّب ضرر الغضروف" }, specialtyId: "ortho", type: "video", doctorId: "d6", excerpt: { en: "90-second video: knee flexed 90°, anterolateral portal safe zone.", ar: "فيديو 90 ثانية: الركبة مثنية 90°، المنطقة الآمنة للمنفذ الأمامي الوحشي." }, mediaGradient: "from-cyan-500 to-blue-700", duration: { en: "1:32", ar: "1:32" }, upvotes: 358, time: { en: "4d ago", ar: "قبل 4 أيام" } },
    { id: "st6", title: { en: "Craniotomy — Burr-Hole Hemostasis Protocol", ar: "ثقب الجمجمة — بروتوكول وقف النزيف" }, specialtyId: "neuro", type: "protocol", doctorId: "d4", excerpt: { en: "Bone wax, Surgicel, and bipolar sequence to control diploic bleeding.", ar: "شمع العظم والسورجيسيل والثنائي القطبي للسيطرة على نزيف الدبلو." }, steps: [{ en: "Identify diploic veins early; apply bone wax before extending craniotomy.", ar: "حدد الأوردة الدبلوية مبكرًا؛ ضع شمع العظم قبل توسيع ثقب الجمجمة." }, { en: "Bipolar coagulate dura edges before opening.", ar: "خثّر حواف الجافية بالثنائي القطبي قبل الفتح." }, { en: "Maintain traction suture on dura flap for continuous hemostasis.", ar: "حافظ على خيط الشد على رفرف الجافية لوقف نزيف مستمر." }], mediaGradient: "from-violet-500 to-purple-700", upvotes: 246, time: { en: "6d ago", ar: "قبل 6 أيام" } },
  ];

  /* ---- Public surface ---------------------------------------------- */
  return {
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
    patientSummary: patientSummary,
    mentorAnalysis: mentorAnalysis,
    surgicalSpecialties: surgicalSpecialties,
    surgicalTips: surgicalTips,
  };
})();
