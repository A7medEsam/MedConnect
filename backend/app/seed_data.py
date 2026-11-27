import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app import models
from app.auth import hash_password


SPECIALTIES = [
    ("cardio", "Cardiology", "أمراض القلب", "HeartPulse", "from-rose-500 to-red-600", True),
    ("pediatrics", "Pediatrics", "طب الأطفال", "Baby", "from-amber-400 to-orange-500", False),
    ("derma", "Dermatology", "الأمراض الجلدية", "Sparkles", "from-fuchsia-500 to-pink-600", False),
    ("neuro", "Neurology", "الأعصاب", "Brain", "from-violet-500 to-purple-600", False),
    ("neurosurgery", "Neurosurgery", "جراحة الأعصاب", "Brain", "from-purple-500 to-indigo-700", True),
    ("ortho", "Orthopedics", "العظام", "Bone", "from-cyan-500 to-blue-600", True),
    ("endo", "Endocrinology", "الغدد الصماء", "Activity", "from-teal-500 to-emerald-600", False),
    ("ophthal", "Ophthalmology", "طب العيون", "Eye", "from-sky-500 to-indigo-600", False),
    ("ent", "ENT", "أنف وأذن وحنجرة", "Ear", "from-lime-500 to-green-600", False),
    ("psych", "Psychiatry", "الطب النفسي", "BrainCircuit", "from-indigo-500 to-blue-700", False),
    ("obgyn", "Obstetrics & Gynecology", "النساء والولادة", "Baby", "from-pink-500 to-rose-600", True),
    ("gp", "General Practice", "الممارسة العامة", "Stethoscope", "from-slate-500 to-slate-700", False),
    ("infectious", "Infectious Diseases", "الأمراض المعدية", "Microscope", "from-emerald-500 to-teal-700", False),
    ("general", "General Surgery", "الجراحة العامة", "Scissors", "from-teal-500 to-emerald-600", True),
]

GUIDELINES = [
    ("NICE", "NICE — National Institute for Health and Care Excellence", "NICE — المعهد الوطني للتميز في الصحة والرعاية", "border-sky-300 bg-sky-50 text-sky-700"),
    ("RCOG", "RCOG — Royal College of Obstetricians and Gynaecologists", "RCOG — الكلية الملكية لأطباء النساء والتوليد", "border-violet-300 bg-violet-50 text-violet-700"),
    ("ACOG", "ACOG — American College of Obstetricians and Gynecologists", "ACOG — الكلية الأمريكية لأطباء النساء والتوليد", "border-teal-300 bg-teal-50 text-teal-700"),
    ("FIGO", "FIGO — International Federation of Gynecology and Obstetrics", "FIGO — الاتحاد الدولي لأمراض النساء والتوليد", "border-amber-300 bg-amber-50 text-amber-700"),
    ("ESHRE", "ESHRE — European Society of Human Reproduction and Embryology", "ESHRE — الجمعية الأوروبية للتكاثر البشري وعلم الأجنة", "border-rose-300 bg-rose-50 text-rose-700"),
    ("ESC", "ESC — European Society of Cardiology", "ESC — الجمعية الأوروبية للقلب", "border-cyan-300 bg-cyan-50 text-cyan-700"),
    ("AHA", "AHA — American Heart Association", "AHA — جمعية القلب الأمريكية", "border-red-300 bg-red-50 text-red-700"),
    ("ADA", "ADA — American Diabetes Association", "ADA — الجمعية الأمريكية للسكري", "border-orange-300 bg-orange-50 text-orange-700"),
    ("IDSA", "IDSA — Infectious Diseases Society of America", "IDSA — جمعية الأمراض المعدية الأمريكية", "border-emerald-300 bg-emerald-50 text-emerald-700"),
    ("AAN", "AAN — American Academy of Neurology", "AAN — الأكاديمية الأمريكية لطب الأعصاب", "border-indigo-300 bg-indigo-50 text-indigo-700"),
    ("AAP", "AAP — American Academy of Pediatrics", "AAP — الأكاديمية الأمريكية لطب الأطفال", "border-amber-300 bg-amber-50 text-amber-700"),
    ("AAD", "AAD — American Academy of Dermatology", "AAD — الأكاديمية الأمريكية للأمراض الجلدية", "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"),
    ("ASRM", "ASRM — American Society for Reproductive Medicine", "ASRM — الجمعية الأمريكية للطب التناسلي", "border-orange-300 bg-orange-50 text-orange-700"),
    ("WHO", "WHO — World Health Organization", "WHO — منظمة الصحة العالمية", "border-emerald-300 bg-emerald-50 text-emerald-700"),
]

CLINICAL_REFS = [
    {
        "id": "r1", "year": "2023", "last_updated": "2023", "specialty_id": "cardio", "guidelines": ["ESC"],
        "title_en": "2023 ESC Guidelines for the Management of Acute Coronary Syndromes",
        "title_ar": "إرشادات الجمعية الأوروبية لأمراض القلب لعام 2023 لتدبير المتلازمات التاجية الحادة",
        "source_en": "European Society of Cardiology (ESC)", "source_ar": "الجمعية الأوروبية لأمراض القلب",
        "summary_en": "Official ESC clinical practice guideline for acute coronary syndromes. Link to the source rather than converting this index entry into patient-specific treatment advice.",
        "summary_ar": "إرشاد سريري رسمي من ESC للمتلازمات التاجية الحادة. ينبغي أن يربط التطبيق بالمصدر، لا أن يحوّل هذا الفهرس إلى نصيحة علاجية خاصة بمريض.",
        "url": "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes",
    },
    {
        "id": "r2", "year": "2026", "last_updated": "2026", "specialty_id": "endo", "guidelines": ["ADA"],
        "title_en": "Diagnosis and Classification of Diabetes: Standards of Care in Diabetes—2026 (Section 2)",
        "title_ar": "تشخيص السكري وتصنيفه: معايير الرعاية في السكري لعام 2026، القسم الثاني",
        "source_en": "American Diabetes Association (ADA)", "source_ar": "الجمعية الأمريكية للسكري",
        "summary_en": "Official ADA 2026 diagnostic criteria. For nonpregnant adults, laboratory A1C >=6.5% or fasting plasma glucose >=126 mg/dL after >=8h without caloric intake meets a diagnostic threshold.",
        "summary_ar": "معايير تشخيصية رسمية من ADA لعام 2026. لدى البالغين غير الحوامل، يُعد HbA1c >=6.5% أو سكر البلازما الصائم >=126 ملغم/دل بعد 8 ساعات صيام حدًا تشخيصيًا.",
        "url": "https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926",
    },
    {
        "id": "r3", "year": "2019", "last_updated": "2019", "specialty_id": "derma", "guidelines": ["AAD"],
        "title_en": "Psoriasis Clinical Guidelines",
        "title_ar": "الإرشادات السريرية لمرض الصدفية",
        "source_en": "American Academy of Dermatology (AAD)", "source_ar": "الأكاديمية الأمريكية للأمراض الجلدية",
        "summary_en": "Official AAD psoriasis guideline collection. Individual recommendations vary by treatment modality; check the linked guideline before clinical decisions.",
        "summary_ar": "مجموعة الإرشادات الرسمية من AAD بشأن الصدفية. تختلف التوصيات بحسب طريقة العلاج؛ لذا راجع الإرشاد المرتبط قبل اتخاذ القرارات السريرية.",
        "url": "https://www.aad.org/member/clinical-quality/guidelines/psoriasis",
    },
    {
        "id": "r4", "year": "2019", "last_updated": "2019", "specialty_id": "obgyn", "guidelines": ["NICE"],
        "title_en": "Hypertension in Pregnancy: Diagnosis and Management (NICE NG133)",
        "title_ar": "ارتفاع ضغط الدم أثناء الحمل: التشخيص والتدبير، إرشاد NICE NG133",
        "source_en": "National Institute for Health and Care Excellence (NICE)", "source_ar": "المعهد الوطني للتميز في الصحة والرعاية",
        "summary_en": "Official NICE guideline on assessment and management of hypertensive disorders in pregnancy.",
        "summary_ar": "إرشاد NICE الرسمي لتقييم اضطرابات ارتفاع ضغط الدم أثناء الحمل وتدبيرها.",
        "url": "https://www.nice.org.uk/guidance/ng133/chapter/recommendations",
    },
    {
        "id": "r5", "year": "2023", "last_updated": "2023", "specialty_id": "obgyn", "guidelines": ["ESHRE", "ASRM"],
        "title_en": "2023 International Evidence-based Guideline for the Assessment and Management of PCOS",
        "title_ar": "الإرشاد الدولي المبني على الأدلة لعام 2023 لتقييم متلازمة تكيس المبايض وتدبيرها",
        "source_en": "ESHRE / ASRM and international partners", "source_ar": "الجمعية الأوروبية للتكاثر البشري والجمعية الأمريكية للطب التناسلي",
        "summary_en": "Official guideline hub for the 2023 international PCOS guideline.",
        "summary_ar": "الصفحة الرسمية للإرشاد الدولي لعام 2023 بشأن متلازمة تكيس المبايض.",
        "url": "https://www.eshre.eu/Guidelines-and-Legal/Guidelines/Polycystic-ovary-syndrome",
    },
    {
        "id": "r6", "year": "2025", "last_updated": "2025", "specialty_id": "cardio", "guidelines": ["AHA"],
        "title_en": "2025 AHA Guideline for High Blood Pressure in Adults",
        "title_ar": "إرشاد AHA لعام 2025 للوقاية من ارتفاع ضغط الدم لدى البالغين وتدبيره",
        "source_en": "American Heart Association (AHA)", "source_ar": "جمعية القلب الأمريكية",
        "summary_en": "Official AHA summary of adult blood-pressure categories and management recommendations (<120/<80 mmHg normal).",
        "summary_ar": "ملخص رسمي من AHA لفئات ضغط الدم لدى البالغين وتوصيات تدبيره.",
        "url": "https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know",
    },
    {
        "id": "r7", "year": "2026", "last_updated": "2026", "specialty_id": "endo", "guidelines": ["ADA"],
        "title_en": "Glycemic Goals, Hypoglycemia, and Hyperglycemic Crises: Standards of Care—2026 (Section 6)",
        "title_ar": "أهداف سكر الدم ونقص السكر وفرط السكر: معايير الرعاية في السكري لعام 2026، القسم السادس",
        "source_en": "American Diabetes Association (ADA)", "source_ar": "الجمعية الأمريكية للسكري",
        "summary_en": "ADA 2026 states A1C <7% is appropriate for many nonpregnant adults, individualized to patient context.",
        "summary_ar": "تذكر ADA لعام 2026 أن هدف HbA1c <7% مناسب لكثير من البالغين غير الحوامل مع التخصيص الفردي.",
        "url": "https://doi.org/10.2337/dc26-s006",
    },
    {
        "id": "r8", "year": "2026", "last_updated": "2026", "specialty_id": "infectious", "guidelines": ["IDSA"],
        "title_en": "Knowledge and Skills Required for Antimicrobial Stewardship Leaders",
        "title_ar": "المعارف والمهارات المطلوبة لقادة ترشيد استخدام مضادات الميكروبات",
        "source_en": "Infectious Diseases Society of America (IDSA)", "source_ar": "جمعية الأمراض المعدية الأمريكية",
        "summary_en": "Official IDSA professional resource describing knowledge and skills for antimicrobial stewardship leadership.",
        "summary_ar": "مرجع مهني رسمي من IDSA يصف المعارف والمهارات اللازمة لقيادة برامج ترشيد المضادات الميكروبية.",
        "url": "https://www.idsociety.org/practice-guideline/knowledge-and-skills/",
    },
    {
        "id": "r9", "year": "2026", "last_updated": "2026", "specialty_id": "neuro", "guidelines": ["AAN"],
        "title_en": "Adult Migraine Prevention: AAN Guideline Subcommittee Clinical Practice Guideline",
        "title_ar": "الوقاية من الشقيقة لدى البالغين: إرشاد الأكاديمية الأمريكية لطب الأعصاب",
        "source_en": "American Academy of Neurology (AAN)", "source_ar": "الأكاديمية الأمريكية لطب الأعصاب",
        "summary_en": "Official 2026 clinical practice guideline publication for adult migraine prevention.",
        "summary_ar": "منشور إرشادي سريري رسمي لعام 2026 بشأن الوقاية من الشقيقة لدى البالغين.",
        "url": "https://www.neurology.org/doi/10.1212/WNL.0000000000214881",
    },
    {
        "id": "r10", "year": "2025", "last_updated": "2025", "specialty_id": "pediatrics", "guidelines": ["AAP"],
        "title_en": "Bright Futures / AAP Periodicity Schedule",
        "title_ar": "جدول الفحوص الدورية لبرنامج برايت فيوتشرز والأكاديمية الأمريكية لطب الأطفال",
        "source_en": "American Academy of Pediatrics (AAP)", "source_ar": "الأكاديمية الأمريكية لطب الأطفال",
        "summary_en": "Official AAP preventive-care schedule for children and adolescents.",
        "summary_ar": "الجدول الرسمي للرعاية الوقائية لدى الأطفال والمراهقين من AAP.",
        "url": "https://publications.aap.org/pediatriccare/pages/periodicity-schedule",
    },
    {
        "id": "r11", "year": "2022", "last_updated": "2026", "specialty_id": "obgyn", "guidelines": ["NICE"],
        "title_en": "Fetal Monitoring in Labour (NICE NG229)",
        "title_ar": "مراقبة الجنين أثناء المخاض، إرشاد NICE NG229",
        "source_en": "National Institute for Health and Care Excellence (NICE)", "source_ar": "المعهد الوطني للتميز في الصحة والرعاية",
        "summary_en": "Official NICE intrapartum CTG guideline defining baseline, variability, contractions, decelerations, and overall CTG categorisation.",
        "summary_ar": "إرشاد NICE الرسمي لتخطيط قلب الجنين أثناء المخاض ويحدد المعدل الأساسي والتذبذب والانقباضات والتباطؤات والتصنيف العام.",
        "url": "https://www.nice.org.uk/guidance/ng229/chapter/recommendations",
    },
    {
        "id": "r12", "year": "2026", "last_updated": "2026", "specialty_id": "cardio", "guidelines": ["AHA"],
        "title_en": "2026 ACC/AHA Guideline on the Management of Dyslipidemia",
        "title_ar": "إرشاد ACC/AHA لعام 2026 لتدبير اضطرابات الدهون",
        "source_en": "American College of Cardiology / American Heart Association", "source_ar": "الكلية الأمريكية لأمراض القلب وجمعية القلب الأمريكية",
        "summary_en": "Official 2026 dyslipidemia guideline; LDL-C targets are risk-based.",
        "summary_ar": "إرشاد رسمي لعام 2026 بشأن اضطرابات الدهون؛ تعتمد أهداف LDL-C على مستوى الخطورة.",
        "url": "https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia/top-things-to-know",
    },
    {
        "id": "r13", "year": "2024", "last_updated": "2024", "specialty_id": "cardio", "guidelines": ["ESC"],
        "title_en": "2024 ESC Guidelines for the Management of Atrial Fibrillation",
        "title_ar": "إرشادات ESC لعام 2024 لتدبير الرجفان الأذيني",
        "source_en": "European Society of Cardiology (ESC)", "source_ar": "الجمعية الأوروبية لأمراض القلب",
        "summary_en": "Official ESC guideline covering AF diagnosis, ECG confirmation, and clinical evaluation.",
        "summary_ar": "إرشاد ESC الرسمي لتشخيص الرجفان الأذيني وتأكيده بتخطيط ECG وتقييمه السريري.",
        "url": "https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/atrial-fibrillation",
    },
    {
        "id": "r14", "year": "Current", "last_updated": "2026", "specialty_id": "cardio", "guidelines": ["AHA"],
        "title_en": "All About Heart Rate (Pulse)",
        "title_ar": "كل ما يتعلق بمعدل ضربات القلب والنبض",
        "source_en": "American Heart Association (AHA)", "source_ar": "جمعية القلب الأمريكية",
        "summary_en": "AHA explains resting heart rate of 60-100 bpm is common for most adults when calm and well.",
        "summary_ar": "توضح AHA أن معدل القلب أثناء الراحة بين 60 و100 نبضة/دقيقة شائع لدى معظم البالغين.",
        "url": "https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse",
    },
    {
        "id": "r15", "year": "2024", "last_updated": "2024", "specialty_id": "gp", "guidelines": ["WHO"],
        "title_en": "Guideline on Haemoglobin Cutoffs to Define Anaemia in Individuals and Populations",
        "title_ar": "إرشاد حدود الهيموغلوبين لتعريف فقر الدم لدى الأفراد والمجموعات",
        "source_en": "World Health Organization (WHO)", "source_ar": "منظمة الصحة العالمية",
        "summary_en": "WHO 2024 defines anaemia in nonpregnant women aged 15-65 as Hb <120 g/L (110-119 g/L mild).",
        "summary_ar": "تعرف WHO لعام 2024 فقر الدم لدى النساء غير الحوامل بعمر 15-65 سنة عند Hb <120 غ/لتر.",
        "url": "https://www.who.int/publications/i/item/9789240088542",
    },
    {
        "id": "r16", "year": "2020", "last_updated": "2020", "specialty_id": "gp", "guidelines": ["WHO"],
        "title_en": "WHO Guideline on Use of Ferritin Concentrations to Assess Iron Status",
        "title_ar": "إرشاد WHO لاستخدام تركيزات الفيريتين لتقييم حالة الحديد",
        "source_en": "World Health Organization (WHO)", "source_ar": "منظمة الصحة العالمية",
        "summary_en": "WHO guidance on interpreting ferritin (<15 ug/L depleted iron stores in healthy adults).",
        "summary_ar": "إرشاد WHO لتفسير الفيريتين (أقل من 15 ميكروغرام/لتر يشير لنفاد مخازن الحديد لدى البالغين الأصحاء).",
        "url": "https://www.who.int/publications/i/item/9789240000124",
    },
]

SURGICAL_TIPS = [
    {
        "id": "st1", "specialty_id": "obgyn", "tip_type": "trick", "upvotes": 412, "duration": None,
        "author_name_en": "Dr. Rana Al-Harbi (Demo)", "author_name_ar": "د. رنا الحربي (تجريبي)",
        "title_en": "Laparoscopic Hysterectomy — Safe-Access Planning Discussion",
        "title_ar": "استئصال الرحم بالمنظار — نقاش التخطيط للدخول الآمن",
        "excerpt_en": "Supervised teaching topic: patient-specific access risks, relevant anatomy and the institution-approved entry approach.",
        "excerpt_ar": "موضوع تعليمي بإشراف مختص: مخاطر الدخول الخاصة بالمريضة والتشريح ذي الصلة وطريقة الدخول المعتمدة في المؤسسة.",
        "steps": [
            {"en": "Review prior operations, imaging and patient-specific risk factors with the supervising surgeon.", "ar": "راجع العمليات السابقة والتصوير وعوامل الخطورة الخاصة بالمريضة مع الجرّاح المشرف."},
            {"en": "Discuss relevant anatomy and alternative access strategies in a supervised teaching setting.", "ar": "ناقش التشريح ذي الصلة وبدائل الدخول في بيئة تعليمية خاضعة للإشراف."},
            {"en": "Use only the institution-approved technique and equipment after formal training.", "ar": "استخدم التقنية والأدوات المعتمدة في المؤسسة فقط بعد التدريب الرسمي."},
            {"en": "Stop and escalate to the attending surgeon whenever anatomy or access is uncertain.", "ar": "توقف واطلب تدخل الجرّاح المسؤول كلما كان التشريح أو مسار الدخول غير واضح."},
        ],
        "reference_url": "https://www.nice.org.uk/guidance/ng229/chapter/recommendations",
    },
    {
        "id": "st2", "specialty_id": "obgyn", "tip_type": "video", "upvotes": 689, "duration": "3:24",
        "author_name_en": "Dr. Rana Al-Harbi (Demo)", "author_name_ar": "د. رنا الحربي (تجريبي)",
        "title_en": "Caesarean Delivery — Awareness of Bladder and Ureteric Injury",
        "title_ar": "الولادة القيصرية — التوعية بإصابات المثانة والحالب",
        "excerpt_en": "Demo video topic: anatomy review, risk recognition and supervised complication-prevention teaching. Not a procedural guide.",
        "excerpt_ar": "موضوع فيديو تجريبي: مراجعة التشريح والتعرف على عوامل الخطورة والتعليم بإشراف مختص للوقاية من المضاعفات.",
        "steps": [],
        "reference_url": None,
    },
    {
        "id": "st3", "specialty_id": "obgyn", "tip_type": "protocol", "upvotes": 534, "duration": None,
        "author_name_en": "Dr. Rana Al-Harbi (Demo)", "author_name_ar": "د. رنا الحربي (تجريبي)",
        "title_en": "Postpartum Haemorrhage — Team Readiness and Escalation",
        "title_ar": "نزف ما بعد الولادة — جاهزية الفريق والتصعيد",
        "excerpt_en": "Educational overview of team activation, assessment and use of the current local haemorrhage pathway.",
        "excerpt_ar": "عرض تعليمي لتفعيل الفريق والتقييم واستخدام مسار التعامل المحلي الحالي مع النزف.",
        "steps": [
            {"en": "Activate the local emergency response and allocate team roles promptly.", "ar": "فعّل استجابة الطوارئ المحلية وحدد أدوار أعضاء الفريق دون تأخير."},
            {"en": "Assess maternal condition and blood loss while following the institution's current protocol.", "ar": "قيّم حالة الأم وكمية الدم المفقود مع اتباع البروتوكول الحالي للمؤسسة."},
            {"en": "Medication choice and sequence must be determined by qualified clinicians and local guidance.", "ar": "يحدد المختصون اختيار الأدوية وتسلسلها وفق موانع الاستعمال والإرشادات المحلية."},
            {"en": "Escalate promptly to senior obstetric, anaesthetic and transfusion support.", "ar": "صعّد الحالة سريعًا إلى دعم التوليد والتخدير ونقل الدم المختص."},
        ],
        "reference_url": None,
    },
    {
        "id": "st4", "specialty_id": "obgyn", "tip_type": "trick", "upvotes": 287, "duration": None,
        "author_name_en": "Dr. Rana Al-Harbi (Demo)", "author_name_ar": "د. رنا الحربي (تجريبي)",
        "title_en": "Total Laparoscopic Hysterectomy — Ureteric Anatomy Review",
        "title_ar": "استئصال الرحم الكامل بالمنظار — مراجعة تشريح الحالب",
        "excerpt_en": "Supervised discussion of ureteric anatomy, risk factors and selective use of adjuncts.",
        "excerpt_ar": "نقاش بإشراف مختص حول تشريح الحالب وعوامل الخطورة والاستخدام الانتقائي للوسائل المساعدة.",
        "steps": [
            {"en": "Review pelvic anatomy and prior operative findings before the procedure.", "ar": "راجع تشريح الحوض ونتائج العمليات السابقة قبل الإجراء."},
            {"en": "Discuss the patient's specific risk profile with the supervising surgeon.", "ar": "ناقش عوامل الخطورة الخاصة بالمريضة مع الجرّاح المشرف."},
            {"en": "Any adjunctive device requires specialist decision and local protocol.", "ar": "يتطلب استخدام أي وسيلة مساعدة قرار الاختصاصي والبروتوكول المحلي."},
        ],
        "reference_url": None,
    },
    {
        "id": "st5", "specialty_id": "ortho", "tip_type": "video", "upvotes": 358, "duration": "1:32",
        "author_name_en": "Dr. Faisal Al-Ghamdi (Demo)", "author_name_ar": "د. فيصل الغامدي (تجريبي)",
        "title_en": "Knee Arthroscopy — Portal Anatomy and Cartilage Protection",
        "title_ar": "منظار الركبة — تشريح المنافذ وحماية الغضروف",
        "excerpt_en": "Demo video topic: supervised anatomy teaching and review of complications. Not a guide to portal placement.",
        "excerpt_ar": "موضوع فيديو تجريبي: تعليم التشريح بإشراف مختص ومراجعة المضاعفات.",
        "steps": [],
        "reference_url": None,
    },
    {
        "id": "st6", "specialty_id": "neurosurgery", "tip_type": "protocol", "upvotes": 246, "duration": None,
        "author_name_en": "Dr. Sami Al-Nasser (Demo)", "author_name_ar": "د. سامي الناصر (تجريبي)",
        "title_en": "Craniotomy — Haemostasis Principles and Team Safety",
        "title_ar": "فتح القحف — مبادئ إيقاف النزف وسلامة الفريق",
        "excerpt_en": "High-level educational topic on preparation, haemostasis principles and supervised neurosurgical practice.",
        "excerpt_ar": "موضوع تعليمي عام حول التحضير ومبادئ إيقاف النزف والممارسة الجراحية العصبية بإشراف مختص.",
        "steps": [
            {"en": "Review imaging, anatomy, equipment readiness and the operative plan with the attending neurosurgeon.", "ar": "راجع الصور والتشريح وجاهزية الأدوات والخطة الجراحية مع جرّاح الأعصاب المسؤول."},
            {"en": "Follow the neurosurgical unit's approved haemostasis and escalation procedures.", "ar": "اتبع إجراءات إيقاف النزف والتصعيد المعتمدة في وحدة جراحة الأعصاب."},
            {"en": "Unexpected bleeding or uncertain anatomy requires immediate communication with the supervising team.", "ar": "يتطلب النزف غير المتوقع أو عدم وضوح التشريح التواصل الفوري مع الفريق المشرف."},
        ],
        "reference_url": None,
    },
]

MENTOR_SAMPLES = [
    {
        "id": "ctg",
        "title_en": "DEMO SAMPLE — Intrapartum CTG Teaching Case",
        "title_ar": "عينة تعليمية تجريبية — تخطيط قلب الجنين أثناء المخاض",
        "report_type_en": "Cardiotocography (CTG) — Demo Educational Sample",
        "report_type_ar": "تخطيط قلب الجنين (CTG) — عينة تعليمية تجريبية",
        "data": {
            "is_demo": True,
            "supported_report_type": True,
            "report_title": {"en": "DEMO CASE — Intrapartum CTG teaching example (not an uploaded patient report)", "ar": "حالة تجريبية — مثال تعليمي لتخطيط قلب الجنين أثناء المخاض (ليس تقرير مريض مرفوعًا)"},
            "report_type": {"en": "Illustrative CTG training data — demo only", "ar": "بيانات تدريبية توضيحية لتخطيط قلب الجنين — للعرض فقط"},
            "guidelines": ["NICE"],
            "probability_note": {"en": "No validated diagnostic probabilities are available in this demo. Differentials are qualitative teaching considerations only.", "ar": "لا تتوفر في هذه النسخة التجريبية احتمالات تشخيصية معتمدة؛ التشخيصات التفريقية تعليمية وصفية فقط."},
            "sample_measures": [
                {"name": {"en": "Baseline FHR", "ar": "المعدل الأساسي"}, "value": "150 bpm", "note": {"en": "White feature (110-160 bpm)", "ar": "سمة بيضاء (110-160)"}},
                {"name": {"en": "Variability", "ar": "التذبذب"}, "value": "3 bpm for 35 min", "note": {"en": "Amber feature (<5 bpm 30-50 min)", "ar": "سمة كهرمانية"}},
                {"name": {"en": "Contractions", "ar": "الانقباضات"}, "value": "4 / 10 min", "note": {"en": "White feature (<5 / 10 min)", "ar": "سمة بيضاء"}},
                {"name": {"en": "Late decelerations", "ar": "تباطؤات متأخرة"}, "value": "Present", "note": {"en": "Red feature under NICE NG229", "ar": "سمة حمراء وفق NICE NG229"}},
            ],
            "pathophysiology": {
                "physiology": {"en": "A CTG records fetal heart-rate pattern and uterine activity alongside baseline rate, variability, accelerations, decelerations, and maternal/fetal context.", "ar": "يسجل تخطيط قلب الجنين نمط نبض الجنين ونشاط الرحم مع المعدل الأساسي والتذبذب والتسارعات والتباطؤات والسياق السريري."},
                "pathology": {"en": "In this fictional intrapartum trace, baseline FHR is 150 bpm, variability is 3 bpm for 35 min (amber), and late decelerations are present (red feature per NICE NG229 -> pathological classification).", "ar": "في هذا التخطيط الافتراضي، المعدل الأساسي 150 والتذبذب 3 لمدة 35 دقيقة (كهرمانية) مع وجود تباطؤات متأخرة (سمة حمراء تجعل التصنيف مرضيًا وفق NICE NG229)."},
            },
            "differentials": [
                {"dx": {"en": "Possible uteroplacental compromise / fetal hypoxia", "ar": "احتمال تأثر وظيفة المشيمة أو نقص أكسجة الجنين"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Potentially serious — urgent clinical review required", "ar": "قد يكون خطيرًا — يلزم تقييم سريري عاجل"}},
                {"dx": {"en": "Medication or maternal-factor effect", "ar": "تأثير دوائي أو عامل متعلق بالأم"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Context-dependent", "ar": "تعتمد على السياق السريري"}},
                {"dx": {"en": "Fetal behavioural state / transient change", "ar": "حالة نشاط الجنين أو تغير عابر"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Requires assessment in context", "ar": "يتطلب التقييم ضمن السياق"}},
            ],
            "decision": {
                "intervene": {"en": "Obtain immediate senior obstetric review, assess mother & fetus, check reversible contributors (hypotension, hyperstimulation), and follow local emergency pathway.", "ar": "طلب مراجعة فورية من اختصاصي التوليد، وتقييم الأم والجنين، والتحقق من العوامل القابلة للتصحيح واتباع مسار الطوارئ المحلي."},
                "observe": {"en": "Observation alone is appropriate only when the responsible clinician judges it safe after reviewing the complete trace and clinical context.", "ar": "المراقبة وحدها مناسبة فقط عندما يقرر الطبيب المسؤول أمانها بعد مراجعة التخطيط كاملًا والسياق السريري."},
            },
            "pitfalls": {
                "refs": {"en": "NICE NG229, Fetal Monitoring in Labour (recommendations 1.4.3-1.4.32).", "ar": "المصدر: NICE NG229 لمراقبة الجنين أثناء المخاض (التوصيات 1.4.3–1.4.32)."},
                "reference_ids": ["r11"],
                "pitfalls": [
                    {"en": "Interpreting CTG without maternal observations and labour progress.", "ar": "تفسير التخطيط دون مراعاة علامات الأم وتقدم المخاض."},
                    {"en": "Focusing on one isolated feature instead of the full trace evolution.", "ar": "التركيز على سمة منفردة بدل تقييم التخطيط كاملًا."},
                    {"en": "Treating an AI output as a confirmed diagnosis or delaying urgent escalation.", "ar": "اعتبار مخرجات الذكاء الاصطناعي تشخيصًا مؤكدًا أو تأخير التصعيد العاجل."},
                ],
            },
            "pearls": {
                "pearls": [
                    {"en": "Interpret the entire trace alongside maternal observations and labour progress.", "ar": "فسّر التخطيط كاملًا مع مؤشرات الأم وتقدم المخاض."},
                    {"en": "Check signal quality and reversible contributors before drawing conclusions.", "ar": "تحقق من جودة الإشارة والعوامل القابلة للتصحيح أولًا."},
                    {"en": "Document reviewer identity, findings, and escalation plan clearly.", "ar": "وثّق المراجع والنتائج وخطة التصعيد بوضوح."},
                ],
                "patient_script": {"en": "The monitor showed a pattern that needs closer review. A senior maternity clinician is checking both you and your baby now and will explain the next steps clearly.", "ar": "أظهر جهاز المراقبة نمطًا يحتاج لمراجعة أدق. يراجع فريق الولادة التخطيط وحالتك الآن وسيشرح لك الخطوات التالية بوضوح."},
            },
            "quiz": [
                {
                    "q": {"en": "What is the safest way to interpret a concerning CTG feature?", "ar": "ما الطريقة الأكثر أمانًا لتفسير سمة مقلقة في تخطيط قلب الجنين؟"},
                    "options": [
                        {"en": "Review the whole trace with maternal/fetal context and obtain senior clinical review", "ar": "مراجعة التخطيط كاملًا مع سياق الأم والجنين وطلب التقييم السريري المختص"},
                        {"en": "Treat one feature as a definitive diagnosis", "ar": "اعتبار سمة واحدة تشخيصًا نهائيًا"},
                        {"en": "Ignore the pattern if baseline rate is 150 bpm", "ar": "تجاهل النمط لأن المعدل الأساسي 150"},
                        {"en": "Use an AI probability alone for delivery decisions", "ar": "الاعتماد على نسبة الذكاء الاصطناعي وحدها لقرار الولادة"},
                    ],
                    "correct": 0,
                    "rationale": {"en": "CTG interpretation requires the full trace, clinical context, and qualified clinician review.", "ar": "يتطلب تفسير التخطيط مراجعة التسجيل كاملًا والسياق السريري وتقييم المختص."},
                },
                {
                    "q": {"en": "Under NICE NG229, how is an intrapartum trace with one red feature (late decelerations) classified?", "ar": "وفق NICE NG229، كيف يُصنف التخطيط عند وجود سمة حمراء واحدة (تباطؤات متأخرة)؟"},
                    "options": [
                        {"en": "Normal", "ar": "طبيعي"},
                        {"en": "Pathological", "ar": "مرضي (Pathological)"},
                        {"en": "Cannot be classified", "ar": "لا يمكن تصنيفه"},
                        {"en": "Artifact", "ar": "تشويش"},
                    ],
                    "correct": 1,
                    "rationale": {"en": "Any single red feature places an intrapartum CTG trace into the pathological category under NICE NG229.", "ar": "وجود سمة حمراء واحدة يضع التخطيط في التصنيف المرضي وفق NICE NG229."},
                },
            ],
        },
    },
    {
        "id": "ecg",
        "title_en": "DEMO SAMPLE — 12-Lead ECG Teaching Case",
        "title_ar": "عينة تعليمية تجريبية — تخطيط القلب ذو 12 اشتقاقًا",
        "report_type_en": "12-Lead Electrocardiogram (ECG) — Demo Educational Sample",
        "report_type_ar": "تخطيط القلب الكهربائي (ECG) — عينة تعليمية تجريبية",
        "data": {
            "is_demo": True,
            "supported_report_type": True,
            "report_title": {"en": "DEMO CASE — ECG teaching example (not an uploaded patient report)", "ar": "حالة تجريبية — مثال تعليمي لتخطيط القلب (ليس تقرير مريض مرفوعًا)"},
            "report_type": {"en": "Illustrative 12-lead ECG training data — demo only", "ar": "بيانات تدريبية لتخطيط القلب — للعرض فقط"},
            "guidelines": ["ESC"],
            "probability_note": {"en": "No calibrated diagnostic probabilities are available in this demo.", "ar": "لا تتوفر احتمالات تشخيصية معايرة في هذه العينة التجريبية."},
            "sample_measures": [
                {"name": {"en": "Ventricular rate", "ar": "معدل البطين"}, "value": "78 bpm", "note": {"en": "Within 60-100 bpm resting range", "ar": "ضمن المعدل المعتاد"}},
                {"name": {"en": "PR interval", "ar": "فترة PR"}, "value": "160 ms", "note": {"en": "Usual 120-200 ms", "ar": "ضمن 120-200 مللي ثانية"}},
                {"name": {"en": "QRS duration", "ar": "مدة QRS"}, "value": "90 ms", "note": {"en": "Narrow (<120 ms)", "ar": "ضيق"}},
                {"name": {"en": "QTc", "ar": "QTc"}, "value": "420 ms", "note": {"en": "Illustrative value", "ar": "قيمة توضيحية"}},
                {"name": {"en": "Rhythm", "ar": "النظم"}, "value": "Sinus rhythm + occasional PACs", "note": {"en": "No definite acute ST elevation described", "ar": "نظم جيبي مع انقباضات أذينية مبكرة متفرقة"}},
            ],
            "pathophysiology": {
                "physiology": {"en": "A 12-lead ECG records cardiac electrical activity from multiple vectors; systematic review checks calibration, rate, rhythm, axis, intervals, and ST-T segments.", "ar": "يسجل تخطيط القلب النشاط الكهربائي من اتجاهات متعددة؛ وتشمل القراءة المنهجية المعايرة والمعدل والنظم والمحور والفترات وST-T."},
                "pathology": {"en": "This fictional trace shows sinus rhythm with occasional premature atrial complexes (PACs). A single ECG cannot exclude ACS or intermittent arrhythmia without symptoms and serial testing.", "ar": "يُظهر هذا المثال نظماً جيبياً مع انقباضات أذينية مبكرة متفرقة. ولا يكفي تخطيط واحد لاستبعاد نقص التروية أو اضطرابات النظم المتقطعة."},
            },
            "differentials": [
                {"dx": {"en": "Sinus rhythm with occasional PACs", "ar": "نظم جيبي مع انقباضات أذينية مبكرة متفرقة"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Illustrative finding; correlate clinically", "ar": "نتيجة توضيحية؛ تربط سريريًا"}},
                {"dx": {"en": "Intermittent arrhythmia not captured on snapshot", "ar": "اضطراب نظم متقطع لم يظهر في اللقطة"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "May need ambulatory monitoring", "ar": "قد يلزم مراقبة هولتر"}},
                {"dx": {"en": "Ischaemia or electrolyte/medication contributor", "ar": "نقص تروية أو اضطراب أملاح أو دواء"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Exclude if symptomatic", "ar": "يجب استبعاده عند وجود أعراض"}},
            ],
            "decision": {
                "intervene": {"en": "For real chest pain, syncope, or haemodynamic instability, arrange urgent emergency evaluation per local chest-pain pathways.", "ar": "عند وجود ألم صدري أو إغماء أو عدم استقرار الدورة الدموية، اطلب تقييم طوارئ عاجل وفق البروتوكول المحلي."},
                "observe": {"en": "Outpatient follow-up or Holter monitoring only after urgent pathology is clinically excluded.", "ar": "المتابعة الخارجية أو هولتر فقط بعد استبعاد الحالات العاجلة سريريًا."},
            },
            "pitfalls": {
                "refs": {"en": "2024 ESC Guidelines for Atrial Fibrillation & ECG evaluation.", "ar": "إرشادات ESC لعام 2024 للرجفان الأذيني وتقييم ECG."},
                "reference_ids": ["r13"],
                "pitfalls": [
                    {"en": "Calling an ECG normal without checking lead placement and calibration.", "ar": "وصف التخطيط بالطبيعي دون فحص المعايرة ومواضع الاشتقاقات."},
                    {"en": "Assuming a single normal tracing rules out acute coronary syndrome.", "ar": "افتراض أن تخطيطًا واحدًا يستبعد المتلازمة التاجية الحادة."},
                    {"en": "Relying solely on automated machine statements.", "ar": "الاعتماد على عبارة الجهاز الآلية وحدها."},
                ],
            },
            "pearls": {
                "pearls": [
                    {"en": "Confirm patient identity, speed (25 mm/s), and gain (10 mm/mV) first.", "ar": "تحقق من هوية المريض وسرعة الورق والمعايرة أولًا."},
                    {"en": "Always use the same systematic sequence: rate, rhythm, axis, intervals, ST-T.", "ar": "اتبع التسلسل نفسه دائمًا: المعدل، النظم، المحور، الفترات، ST-T."},
                    {"en": "Compare with prior ECGs whenever available.", "ar": "قارن بالتخطيطات السابقة متى توفرت."},
                ],
                "patient_script": {"en": "This ECG is one piece of your evaluation. We interpret it alongside your symptoms and history to decide whether extra monitoring is helpful.", "ar": "هذا التخطيط جزء من تقييمك؛ نفسّره مع الأعراض والتاريخ الصحي لتحديد الحاجة لفحوص إضافية."},
            },
            "quiz": [
                {
                    "q": {"en": "Can one non-diagnostic ECG exclude acute coronary syndrome?", "ar": "هل يكفي تخطيط واحد غير تشخيصي لاستبعاد المتلازمة التاجية الحادة؟"},
                    "options": [
                        {"en": "Yes, always", "ar": "نعم دائمًا"},
                        {"en": "No; clinical context, serial ECGs, and biomarkers may be needed", "ar": "لا؛ قد يلزم التقييم السريري وتخطيطات متتابعة وإنزيمات قلبية"},
                        {"en": "Only if heart rate is under 100", "ar": "فقط إذا كان النبض أقل من 100"},
                        {"en": "Only if machine text says normal", "ar": "فقط إذا قال الجهاز طبيعي"},
                    ],
                    "correct": 1,
                    "rationale": {"en": "A single ECG cannot exclude ACS; serial tracings and clinical correlation are essential.", "ar": "لا يستبعد تخطيط واحد المتلازمة التاجية الحادة؛ فالمتابعة والربط السريري ضروريان."},
                }
            ],
        },
    },
    {
        "id": "bloodTest",
        "title_en": "DEMO SAMPLE — Complete Blood Count (CBC) Teaching Case",
        "title_ar": "عينة تعليمية تجريبية — تعداد الدم الكامل (CBC)",
        "report_type_en": "Complete Blood Count & Ferritin — Demo Educational Sample",
        "report_type_ar": "تعداد الدم الكامل والفيريتين — عينة تعليمية تجريبية",
        "data": {
            "is_demo": True,
            "supported_report_type": True,
            "report_title": {"en": "DEMO CASE — CBC microcytic anaemia teaching example (not an uploaded report)", "ar": "حالة تجريبية — مثال تعليمي لتعداد الدم الكامل (ليس تقريراً مرفوعاً)"},
            "report_type": {"en": "Illustrative CBC / blood test training data — demo only", "ar": "بيانات تدريبية لتعداد الدم — للعرض فقط"},
            "guidelines": ["WHO"],
            "probability_note": {"en": "No calibrated probabilities calculated in this demo sample.", "ar": "لا تُحسب احتمالات تشخيصية في هذه العينة التجريبية."},
            "sample_measures": [
                {"name": {"en": "Haemoglobin", "ar": "الهيموغلوبين"}, "value": "11.2 g/dL", "note": {"en": "WHO mild anaemia (110-119 g/L) in nonpregnant women", "ar": "فقر دم خفيف وفق WHO"}},
                {"name": {"en": "MCV", "ar": "متوسط حجم الكرية MCV"}, "value": "74 fL", "note": {"en": "Microcytic (<80 fL)", "ar": "صغير الكريات"}},
                {"name": {"en": "Serum ferritin", "ar": "فيريتين المصل"}, "value": "10 ug/L", "note": {"en": "Low (<15 ug/L per WHO without inflammation)", "ar": "منخفض (<15 ميكروغرام/لتر)"}},
            ],
            "pathophysiology": {
                "physiology": {"en": "CBC evaluates red cells, white cells, and platelets alongside age, sex, pregnancy status, and lab reference ranges.", "ar": "يقيس تعداد الدم الكامل مؤشرات الكريات الحمراء والبيضاء والصفائح وفق العمر والجنس والحمل والمجالات المرجعية."},
                "pathology": {"en": "Low Hb (11.2 g/dL), low MCV (74 fL), and low ferritin (10 ug/L) fit a microcytic iron-deficiency pattern, though the underlying cause of iron loss still requires evaluation.", "ar": "انخفاض الهيموغلوبين وMCV والفيريتين يتوافق مع نمط فقر دم صغير الكريات بنقص الحديد، مع ضرورة البحث عن سبب فقدان الحديد."},
            },
            "differentials": [
                {"dx": {"en": "Iron deficiency anaemia", "ar": "فقر الدم بنقص الحديد"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Investigate underlying cause (bleeding/malabsorption)", "ar": "يتطلب البحث عن السبب الأساسي"}},
                {"dx": {"en": "Thalassaemia trait", "ar": "سمة الثلاسيميا"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Consider if ferritin normal/elevated", "ar": "يُطرح عند اعتدال الفيريتين"}},
                {"dx": {"en": "Anaemia of chronic inflammation", "ar": "فقر دم الالتهاب المزمن"}, "probability": None, "probability_status": "not-calculated", "severity": {"en": "Ferritin can rise as acute-phase reactant", "ar": "يرتفع الفيريتين مع الالتهاب"}},
            ],
            "decision": {
                "intervene": {"en": "Assess haemodynamic stability, red-flag bleeding symptoms, and investigate cause of iron deficiency before/alongside replacement.", "ar": "قيّم استقرار المريض وعلامات النزف وابحث عن سبب نقص الحديد قبل أو بالتوازي مع التعويض."},
                "observe": {"en": "Follow response to clinician-prescribed therapy with repeat CBC/reticulocytes per local guidance.", "ar": "متابعة الاستجابة للعلاج الموصوف بإعادة فحص الدم وفق الإرشادات."},
            },
            "pitfalls": {
                "refs": {"en": "WHO 2024 Haemoglobin cutoffs & WHO Ferritin Guidance.", "ar": "حدود الهيموغلوبين WHO 2024 وإرشاد الفيريتين."},
                "reference_ids": ["r15", "r16"],
                "pitfalls": [
                    {"en": "Diagnosing iron deficiency from low MCV alone without ferritin/iron studies.", "ar": "تشخيص نقص الحديد من MCV وحده دون فحص الفيريتين."},
                    {"en": "Forgetting that ferritin is an acute-phase reactant and can look normal during inflammation.", "ar": "نسيان أن الفيريتين يرتفع في حالات الالتهاب."},
                ],
            },
            "pearls": {
                "pearls": [
                    {"en": "Always pair MCV with ferritin and inflammatory context.", "ar": "اقرن MCV دائماً بالفيريتين وسياق الالتهاب."},
                    {"en": "Identify WHY iron is low (menstrual, GI loss, dietary, malabsorption) rather than just prescribing iron.", "ar": "ابحث عن سبب نقص الحديد لا مجرد وصف المكملات."},
                ],
                "patient_script": {"en": "Your blood count shows mild microcytic anaemia with low iron stores. Your doctor will review possible causes and discuss the best replacement plan.", "ar": "تُظهر التحاليل فقر دم خفيفاً مع انخفاض مخزون الحديد؛ سيراجع طبيبك الأسباب ويحدد الخطة المناسبة."},
            },
            "quiz": [
                {
                    "q": {"en": "What does a low MCV (74 fL) describe?", "ar": "ماذا يصف انخفاض MCV (74 fL)؟"},
                    "options": [
                        {"en": "Smaller-than-average red blood cell volume (microcytosis)", "ar": "حجم كريات دم حمراء أصغر من المتوسط"},
                        {"en": "Elevated platelet count", "ar": "ارتفاع الصفائح"},
                        {"en": "White cell infection", "ar": "عدوى بالكريات البيضاء"},
                        {"en": "Confirmed diagnosis by itself", "ar": "تشخيص مؤكد بمفرده"},
                    ],
                    "correct": 0,
                    "rationale": {"en": "MCV measures average red-cell volume; iron studies and history determine the underlying cause.", "ar": "MCV يقيس متوسط حجم الكريات الحمراء ولا يحدد السبب بمفرده."},
                }
            ],
        },
    },
]

DEMO_DOCTORS = [
    ("doctor_demo", "doctor@medconnect.app", "Dr. Layla Al-Harbi", "cardio", "Cardiology & Internal Medicine", "Riyadh", "MED-LIC-48213", "MedConnect Cardiology Demo Clinic", 14, "150 SAR", "Interventional cardiologist specializing in arrhythmia management and preventive cardiology (Demo Account)."),
    ("doc_omar_demo", "omar.demo@medconnect.app", "Dr. Omar Al-Saud", "pediatrics", "Pediatrics", "Jeddah", "DEMO-PED-102", "Al-Salam Children's Demo Hospital", 11, "Free", "Fictional pediatrician focused on neonatal care and vaccination schedules."),
    ("doc_sara_demo", "sara.demo@medconnect.app", "Dr. Sara Al-Qahtani", "derma", "Dermatology", "Riyadh", "DEMO-DER-103", "DermaCare Demo Clinic", 9, "200 SAR", "Fictional dermatologist treating acne, eczema, and skin screening."),
    ("doc_khalid_demo", "khalid.demo@medconnect.app", "Dr. Khalid Al-Dossari", "neuro", "Neurology", "Dammam", "DEMO-NEU-104", "Eastern Neuro Demo Center", 17, "180 SAR", "Fictional neurologist specializing in epilepsy and migraine management."),
    ("doc_noura_demo", "noura.demo@medconnect.app", "Dr. Noura Al-Otaibi", "endo", "Endocrinology", "Riyadh", "DEMO-END-105", "MedConnect Endocrine Demo Clinic", 12, "160 SAR", "Fictional endocrinologist managing diabetes and thyroid disorders."),
    ("doc_faisal_demo", "faisal.demo@medconnect.app", "Dr. Faisal Al-Ghamdi", "ortho", "Orthopedic Surgery", "Mecca", "DEMO-ORT-106", "Mecca Orthopedic Demo Hospital", 15, "Not specified", "Fictional orthopedic surgeon treating sports injuries and joint conditions."),
    ("doc_mona_demo", "mona.demo@medconnect.app", "Dr. Mona Al-Zahrani", "ophthal", "Ophthalmology", "Khobar", "DEMO-OPH-107", "Vision Care Demo Center", 10, "250 SAR", "Fictional ophthalmologist providing cataract and glaucoma care."),
    ("doc_yousef_demo", "yousef.demo@medconnect.app", "Dr. Yousef Al-Mutairi", "psych", "Psychiatry", "Riyadh", "DEMO-PSY-108", "MindWell Demo Clinic", 13, "220 SAR", "Fictional psychiatrist treating anxiety, depression, and sleep disorders."),
    ("doc_rana_demo", "rana.demo@medconnect.app", "Dr. Rana Al-Harbi", "obgyn", "Obstetrics & Gynecology", "Riyadh", "DEMO-OBG-109", "MedConnect Women's Health Demo Clinic", 12, "Not specified", "Fictional OB/GYN profile for demonstration content only."),
    ("doc_sami_demo", "sami.demo@medconnect.app", "Dr. Sami Al-Nasser", "neurosurgery", "Neurosurgery", "Riyadh", "DEMO-NSG-110", "MedConnect Neurosurgery Demo Unit", 14, "Not specified", "Fictional neurosurgery profile for demonstration content only."),
]

SYNTHETIC_PATIENTS = [
    {
        "username": "patient_demo", "email": "patient@medconnect.app", "full_name": "Reem Al-Qahtani",
        "dob": "1990-05-15", "gender": "Female", "blood_type": "A+", "height": 165.0, "weight": 62.0,
        "phone": "+966-50-000-0001", "emergency": "Ahmed Al-Qahtani (Demo) +966-55-000-0001",
        "notes": "FICTIONAL DEMO PATIENT: Regular checkups recommended. Family history of diabetes.",
        "conditions": [("Type 2 Diabetes", "managed", "2019-03-10", "Controlled with Metformin. Demo HbA1c 6.8%."), ("Hypertension", "active", "2020-07-22", "Monitored weekly."), ("Seasonal Allergies", "active", "2015-04-01", "Worsens in spring.")],
        "medications": [("Metformin", "500mg", "Twice daily", "2019-03-15", "Take with meals"), ("Lisinopril", "10mg", "Once daily", "2020-08-01", "Take in morning")],
        "allergies": [("Penicillin", "moderate", "Skin rash and hives", "Demo record"), ("Dust mites", "mild", "Sneezing", "Demo record")],
        "vitals": [("heart_rate", "72", "bpm", "Resting HR (demo)"), ("blood_pressure", "128/82", "mmHg", "Morning reading (demo)"), ("glucose", "110", "mg/dL", "Fasting glucose (demo)")],
        "demo_report": ("demo_lipid_panel_reem.pdf", "application/pdf", 253952),
        "share_with_demo_doc": True,
    },
    {
        "username": "patient_salman_demo", "email": "salman.demo@medconnect.app", "full_name": "Salman Al-Rashid (Demo)",
        "dob": "1968-11-04", "gender": "Male", "blood_type": "O+", "height": 176.0, "weight": 84.0,
        "phone": "+966-50-000-0002", "emergency": "Nasser Al-Rashid (Demo) +966-55-000-0002",
        "notes": "FICTIONAL DEMO PATIENT: Post-MI cardiac rehabilitation follow-up profile.",
        "conditions": [("Coronary Artery Disease", "managed", "2024-02-14", "Post-PCI follow-up (fictional)"), ("Hyperlipidemia", "active", "2022-09-01", "On statin therapy")],
        "medications": [("Atorvastatin", "40mg", "Once nightly", "2024-02-15", "Demo medication"), ("Aspirin", "81mg", "Once daily", "2024-02-15", "Antiplatelet")],
        "allergies": [("Sulfa drugs", "severe", "Urticaria", "Fictional demo allergy")],
        "vitals": [("heart_rate", "66", "bpm", "Resting"), ("blood_pressure", "124/78", "mmHg", "Clinic check")],
        "demo_report": ("demo_ecg_post_mi_salman.pdf", "application/pdf", 412000),
        "share_with_demo_doc": True,
    },
    {
        "username": "patient_lina_demo", "email": "lina.demo@medconnect.app", "full_name": "Lina Hassan (Demo)",
        "dob": "1996-03-22", "gender": "Female", "blood_type": "B+", "height": 161.0, "weight": 55.0,
        "phone": "+966-50-000-0003", "emergency": "Maha Hassan (Demo) +966-55-000-0003",
        "notes": "FICTIONAL DEMO PATIENT: Mild persistent asthma & iron-deficiency screening.",
        "conditions": [("Mild Persistent Asthma", "managed", "2018-06-12", "Uses inhaled controller"), ("Iron Deficiency Anaemia", "active", "2026-01-10", "Fictional teaching case")],
        "medications": [("Budesonide Inhaler", "200mcg", "Once daily", "2023-01-10", "Demo entry"), ("Ferrous Sulfate", "325mg", "Every other day", "2026-01-15", "With vitamin C")],
        "allergies": [("Aspirin", "moderate", "Mild bronchospasm", "Fictional allergy")],
        "vitals": [("oxygen", "98", "%", "Room air SpO2"), ("heart_rate", "79", "bpm", "Clinic reading")],
        "demo_report": ("demo_cbc_ferritin_lina.pdf", "application/pdf", 198400),
        "share_with_demo_doc": False,
    },
    {
        "username": "patient_tariq_demo", "email": "tariq.demo@medconnect.app", "full_name": "Tariq Al-Amoudi (Demo)",
        "dob": "1982-08-19", "gender": "Male", "blood_type": "AB+", "height": 179.0, "weight": 78.0,
        "phone": "+966-50-000-0004", "emergency": "Huda Al-Amoudi (Demo) +966-55-000-0004",
        "notes": "FICTIONAL DEMO PATIENT: Episodic migraine and lumbar strain history.",
        "conditions": [("Migraine without aura", "active", "2021-04-18", "Trigger diary maintained"), ("Lumbar disc bulge", "managed", "2025-05-02", "Physiotherapy")],
        "medications": [("Sumatriptan", "50mg", "As needed at aura/onset", "2022-03-01", "Demo entry")],
        "allergies": [("Latex", "mild", "Contact dermatitis", "Fictional allergy")],
        "vitals": [("blood_pressure", "120/76", "mmHg", "Baseline"), ("weight", "78", "kg", "Monthly log")],
        "demo_report": ("demo_mri_lumbar_tariq.png", "image/png", 890200),
        "share_with_demo_doc": False,
    },
    {
        "username": "patient_noura_demo", "email": "noura.patient.demo@medconnect.app", "full_name": "Noura Al-Subaie (Demo)",
        "dob": "1993-12-09", "gender": "Female", "blood_type": "O-", "height": 163.0, "weight": 67.0,
        "phone": "+966-50-000-0005", "emergency": "Fahad Al-Subaie (Demo) +966-55-000-0005",
        "notes": "FICTIONAL DEMO PATIENT: Hypothyroidism & routine prenatal monitoring.",
        "conditions": [("Hypothyroidism", "managed", "2020-11-11", "Stable on levothyroxine")],
        "medications": [("Levothyroxine", "75mcg", "Once daily fasting", "2020-11-12", "Take 30 min before breakfast")],
        "allergies": [("Shellfish", "moderate", "Hives", "Fictional allergy")],
        "vitals": [("temperature", "36.7", "°C", "Afebrile"), ("heart_rate", "76", "bpm", "Resting")],
        "demo_report": ("demo_thyroid_tsh_noura.pdf", "application/pdf", 184000),
        "share_with_demo_doc": True,
    },
]

FORUM_CASES = [
    {
        "seed_key": "f1",
        "author_name": "Dr. Layla Al-Harbi (Demo)",
        "specialty_id": "cardio",
        "title": "Discussion case: recurrent ventricular tachycardia after myocardial infarction",
        "title_ar": "حالة للنقاش: تكرر تسرع القلب البطيني بعد احتشاء عضلة القلب",
        "presentation": "Fictional case: a 58-year-old patient, several months after myocardial infarction, with reduced ejection fraction and recurrent documented monomorphic ventricular tachycardia.",
        "presentation_ar": "حالة افتراضية: مريض عمره 58 عامًا بعد احتشاء عضلة القلب بعدة أشهر، مع انخفاض الكسر القذفي ونوبات موثقة متكررة من تسرع القلب البطيني.",
        "protocol": "Discussion prompt: identify missing clinical info, review current arrhythmia guidance, and discuss device therapy and ablation options.",
        "protocol_ar": "محور النقاش: تحديد المعلومات السريرية الناقصة ومراجعة إرشادات اضطرابات النظم وخيارات الأجهزة والاستئصال.",
        "tags": ["Cardiology", "Electrophysiology", "Demo Case"],
        "comments": [
            ("fc1", "Dr. Khalid Al-Dossari (Demo)", "Compare primary- and secondary-prevention indications using rhythm history, LVEF, and reversible causes.", "قارن دواعي الوقاية الأولية والثانوية بالاستناد إلى سجل النظم ووظيفة البطين.", False),
            ("fc2", "Dr. Faisal Al-Ghamdi (Demo)", "Review medication history, QT interval, comorbidities, and sleep triggers with electrophysiology.", "راجع التاريخ الدوائي وفترة QT والأمراض المصاحبة مع فريق الفيزيولوجيا الكهربائية.", True),
        ],
    },
    {
        "seed_key": "f2",
        "author_name": "Dr. Khalid Al-Dossari (Demo)",
        "specialty_id": "neuro",
        "title": "Discussion case: suspected autoimmune encephalitis in a child",
        "title_ar": "حالة للنقاش: اشتباه التهاب دماغ مناعي لدى طفل",
        "presentation": "Fictional case: a 9-year-old child with subacute behavioural changes, seizures and a reported neuronal antibody result requiring independent review.",
        "presentation_ar": "حالة افتراضية: طفل عمره 9 سنوات لديه تغيرات سلوكية تحت حادة وتشنجات ونتيجة أجسام مضادة عصبية تحتاج مراجعة مستقلة.",
        "protocol": "Discussion prompt: review diagnostic criteria, infectious/metabolic mimics, confirmatory testing, and paediatric neurology MDT.",
        "protocol_ar": "محور النقاش: مراجعة معايير التشخيص والاحتمالات المعدية والاستقلابية والفحوصات التأكيدية.",
        "tags": ["Pediatrics", "Neurology", "Demo Case"],
        "comments": [
            ("fc3", "Dr. Omar Al-Saud (Demo)", "Confirm phenotype and antibody assay specificity, and exclude infectious mimics before immunotherapy.", "أكّد الصورة السريرية ونوع الفحص واستبعد الحالات المشابهة قبل العلاج المناعي.", True),
        ],
    },
    {
        "seed_key": "f3",
        "author_name": "Dr. Sara Al-Qahtani (Demo)",
        "specialty_id": "derma",
        "title": "Discussion case: new pustular lesions during biologic treatment for psoriasis",
        "title_ar": "حالة للنقاش: ظهور آفات بثرية جديدة أثناء العلاج البيولوجي للصدفية",
        "presentation": "Fictional case: an adult with plaque psoriasis develops new pustular lesions after starting a biologic agent.",
        "presentation_ar": "حالة افتراضية: شخص بالغ مصاب بالصدفية اللويحية تظهر لديه آفات بثرية جديدة بعد بدء دواء بيولوجي.",
        "protocol": "Discussion prompt: assess infection vs paradoxical reaction, treatment timeline, and specialist dermatology review.",
        "protocol_ar": "محور النقاش: تقييم العدوى مقابل التفاعل المتناقض ومراجعة التسلسل الزمني للعلاج.",
        "tags": ["Dermatology", "Immunology", "Demo Case"],
        "comments": [
            ("fc4", "Dr. Sara Al-Qahtani (Demo)", "Verify suspected drug reaction, exclude bacterial/viral superinfection, and avoid abrupt unsupervised medication changes.", "تحقق من التفاعل الدوائي واستبعد العدوى الثانوية قبل أي تعديل علاجي.", False),
        ],
    },
]

COMMUNITY_POSTS = [
    ("c1", "article", "cardio", "Dr. Layla Al-Harbi (Demo)", "doctor",
     "Understanding Hypertension: A Patient Guide", "فهم ارتفاع ضغط الدم: دليل للمريض",
     "What blood pressure numbers mean, when clinicians consider treatment, and lifestyle habits that support healthy readings.",
     "ماذا تعني أرقام ضغط الدم ومتى يُعالج وتغييرات نمط الحياة التي تساعد في خفض القراءات.",
     "For many people with controlled hypertension, regular moderate aerobic activity and reduced sodium intake are helpful under clinician guidance."),
    ("c2", "article", "pediatrics", "Dr. Omar Al-Saud (Demo)", "doctor",
     "Childhood Vaccination Schedule Overview", "نظرة عامة على جدول تطعيمات الأطفال",
     "Educational overview of routine childhood immunization milestones and common mild post-vaccine reactions.",
     "دليل مبسط لمواعيد التطعيمات الروتينية للأطفال وأبرز الأعراض الجانبية الخفيفة المتوقعة.",
     "Always bring your child's immunization card to each well-child visit."),
    ("c3", "article", "derma", "Dr. Sara Al-Qahtani (Demo)", "doctor",
     "Recognizing Skin Warning Signs: The ABCDE Rule", "التعرف على علامات الجلد التحذيرية: قاعدة ABCDE",
     "Asymmetry, Border, Color, Diameter, and Evolving — a visual framework to discuss suspicious moles early with a dermatologist.",
     "عدم التماثل، الحواف، اللون، القطر، والتغير — قاعدة مبسطة لملاحظة الشامات ومراجعة طبيب الجلدية مبكرًا.",
     "Use broad-spectrum non-comedogenic sunscreen SPF 30+ regularly."),
    ("c4", "question", "endo", "Salem A. (Demo Patient)", "patient",
     "Can Type 2 diabetes improve with sustained lifestyle changes?", "هل يمكن تحسن السكري من النوع الثاني بتغيير نمط الحياة؟",
     "I was recently diagnosed with Type 2 diabetes and want to know how nutrition and weight management affect HbA1c alongside medication.",
     "تم تشخيصي حديثاً بالسكري من النوع الثاني وأود معرفة أثر التغذية وإنقاص الوزن على السكر التراكمي مع الدواء.",
     "Some individuals achieve substantial improvement or remission with clinician-supervised nutrition and weight loss, though ongoing monitoring remains essential."),
]


def seed_all(db: Session) -> None:
    """Idempotently seed specialties, guidelines, references, tips, mentor samples, demo doctors/patients, and demo discussions."""
    # 1. Specialties
    for sid, en, ar, icon, color, is_surg in SPECIALTIES:
        if not db.query(models.Specialty).filter(models.Specialty.id == sid).first():
            db.add(models.Specialty(id=sid, name_en=en, name_ar=ar, icon=icon, color=color, is_surgical=is_surg))

    # 2. Guidelines
    for code, en, ar, color in GUIDELINES:
        if not db.query(models.Guideline).filter(models.Guideline.code == code).first():
            db.add(models.Guideline(code=code, name_en=en, name_ar=ar, color=color))

    # 3. Clinical References
    for ref in CLINICAL_REFS:
        if not db.query(models.ClinicalReference).filter(models.ClinicalReference.id == ref["id"]).first():
            db.add(models.ClinicalReference(
                id=ref["id"],
                title_en=ref["title_en"],
                title_ar=ref["title_ar"],
                source_en=ref["source_en"],
                source_ar=ref["source_ar"],
                specialty_id=ref["specialty_id"],
                guidelines_json=json.dumps(ref["guidelines"]),
                summary_en=ref["summary_en"],
                summary_ar=ref["summary_ar"],
                url=ref["url"],
                year=ref["year"],
                last_updated=ref["last_updated"],
                verification_status="Original reference, not independently verified",
                is_demo=True,
            ))

    # 4. Surgical Tips
    for tip in SURGICAL_TIPS:
        if not db.query(models.SurgicalTip).filter(models.SurgicalTip.id == tip["id"]).first():
            db.add(models.SurgicalTip(
                id=tip["id"],
                title_en=tip["title_en"],
                title_ar=tip["title_ar"],
                specialty_id=tip["specialty_id"],
                tip_type=tip["tip_type"],
                author_name_en=tip["author_name_en"],
                author_name_ar=tip["author_name_ar"],
                excerpt_en=tip["excerpt_en"],
                excerpt_ar=tip["excerpt_ar"],
                steps_json=json.dumps(tip["steps"], ensure_ascii=False),
                reference_url=tip["reference_url"],
                duration=tip["duration"],
                upvotes=tip["upvotes"],
                is_demo=True,
            ))

    # 5. Mentor Demo Samples
    for ms in MENTOR_SAMPLES:
        if not db.query(models.MentorSample).filter(models.MentorSample.id == ms["id"]).first():
            db.add(models.MentorSample(
                id=ms["id"],
                title_en=ms["title_en"],
                title_ar=ms["title_ar"],
                report_type_en=ms["report_type_en"],
                report_type_ar=ms["report_type_ar"],
                sample_json=json.dumps(ms["data"], ensure_ascii=False),
                is_demo=True,
            ))

    db.flush()

    # 6. Demo Doctors (preserve existing doctor_demo if present, only backfill missing fields)
    doctor_users = {}
    for uname, email, full_name, spec_id, spec_name, loc, lic, clinic, yrs, fee, bio in DEMO_DOCTORS:
        user = db.query(models.User).filter(models.User.username == uname).first()
        if not user:
            user = models.User(
                username=uname,
                email=email,
                full_name=full_name,
                password_hash=hash_password("demo123"),
                role="doctor",
                language="en",
            )
            db.add(user)
            db.flush()
        doctor_users[uname] = user

        doc_prof = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
        if not doc_prof:
            db.add(models.DoctorProfile(
                user_id=user.id,
                specialty=spec_name,
                specialty_id=spec_id,
                location=loc,
                license_number=lic,
                clinic_name=clinic,
                years_experience=yrs,
                phone="+966-50-555-0199",
                bio=bio,
                consultation_fee=fee,
                verification_status="demo",
                is_demo=True,
            ))
        elif doc_prof.verification_status in (None, "unverified") and uname == "doctor_demo":
            doc_prof.specialty_id = doc_prof.specialty_id or spec_id
            doc_prof.location = doc_prof.location or loc
            doc_prof.consultation_fee = doc_prof.consultation_fee or fee
            doc_prof.verification_status = "demo"
            doc_prof.is_demo = True

    db.flush()
    main_demo_doc = doctor_users["doctor_demo"]

    # 7. Synthetic Patients (5 distinct demo profiles)
    now = datetime.utcnow()
    for idx, pdata in enumerate(SYNTHETIC_PATIENTS):
        p_user = db.query(models.User).filter(models.User.username == pdata["username"]).first()
        is_new_seed_patient = False
        if not p_user:
            is_new_seed_patient = True
            p_user = models.User(
                username=pdata["username"],
                email=pdata["email"],
                full_name=pdata["full_name"],
                password_hash=hash_password("demo123"),
                role="patient",
                language="en",
            )
            db.add(p_user)
            db.flush()

            db.add(models.PatientProfile(
                user_id=p_user.id,
                date_of_birth=pdata["dob"],
                gender=pdata["gender"],
                blood_type=pdata["blood_type"],
                height_cm=pdata["height"],
                weight_kg=pdata["weight"],
                phone=pdata["phone"],
                emergency_contact=pdata["emergency"],
                medical_notes=pdata["notes"],
            ))

            for cname, cstatus, cdate, cnotes in pdata["conditions"]:
                db.add(models.Condition(user_id=p_user.id, name=cname, status=cstatus, diagnosed_date=cdate, notes=cnotes, is_demo=True))
            for mname, mdose, mfreq, mstart, mnotes in pdata["medications"]:
                db.add(models.Medication(user_id=p_user.id, name=mname, dosage=mdose, frequency=mfreq, start_date=mstart, notes=mnotes, is_demo=True))
            for aname, asev, areact, anotes in pdata["allergies"]:
                db.add(models.Allergy(user_id=p_user.id, allergen=aname, severity=asev, reaction=areact, notes=anotes, is_demo=True))
            for v_i, (vtype, vval, vunit, vnotes) in enumerate(pdata["vitals"]):
                db.add(models.Vital(user_id=p_user.id, vital_type=vtype, value=vval, unit=vunit, recorded_at=now - timedelta(hours=2 + v_i), notes=vnotes, is_demo=True))

        # Ensure demo report metadata exists (for demo patients only)
        if is_new_seed_patient or (
            pdata["username"] == "patient_demo"
            and db.query(models.Report).filter(models.Report.user_id == p_user.id, models.Report.status == "demo_sample").count() == 0
        ):
            r_name, r_mime, r_size = pdata["demo_report"]
            if db.query(models.Report).filter(models.Report.user_id == p_user.id, models.Report.original_filename == r_name).count() == 0:
                db.add(models.Report(
                    user_id=p_user.id,
                    filename=r_name,
                    original_filename=r_name,
                    content_type=r_mime,
                    file_size=r_size,
                    status="demo_sample",
                ))

        # Demo appointment (idempotent per patient)
        if db.query(models.Appointment).filter(models.Appointment.patient_id == p_user.id).count() == 0:
            db.add(models.Appointment(
                patient_id=p_user.id,
                doctor_id=main_demo_doc.id,
                scheduled_at=now + timedelta(days=idx + 1),
                appointment_type="followup",
                status="confirmed" if idx % 2 == 0 else "scheduled",
                notes="Fictional demonstration appointment",
                consultation_fee="150 SAR",
                payment_method="clinic",
                payment_status="pay_at_clinic",
            ))

        # Shared access with doctor_demo
        if pdata["share_with_demo_doc"]:
            exists_share = (
                db.query(models.SharedAccess)
                .filter(models.SharedAccess.doctor_id == main_demo_doc.id, models.SharedAccess.patient_id == p_user.id)
                .first()
            )
            if not exists_share:
                db.add(models.SharedAccess(doctor_id=main_demo_doc.id, patient_id=p_user.id, status="active"))

    # 8. Demo Forum Posts
    for fc in FORUM_CASES:
        post = db.query(models.ForumPost).filter(models.ForumPost.seed_key == fc["seed_key"]).first()
        if not post:
            post = models.ForumPost(
                seed_key=fc["seed_key"],
                author_id=main_demo_doc.id,
                author_name=fc["author_name"],
                specialty_id=fc["specialty_id"],
                title=fc["title"],
                title_ar=fc["title_ar"],
                presentation=fc["presentation"],
                presentation_ar=fc["presentation_ar"],
                protocol=fc["protocol"],
                protocol_ar=fc["protocol_ar"],
                tags_json=json.dumps(fc["tags"]),
                is_demo=True,
            )
            db.add(post)
            db.flush()
            for c_key, c_author, c_body, c_body_ar, c_best in fc["comments"]:
                if not db.query(models.ForumComment).filter(models.ForumComment.seed_key == c_key).first():
                    db.add(models.ForumComment(
                        seed_key=c_key,
                        post_id=post.id,
                        author_id=main_demo_doc.id,
                        author_name=c_author,
                        body=c_body,
                        body_ar=c_body_ar,
                        is_best_approach=c_best,
                        is_demo=True,
                    ))

    # 9. Demo Patient Community Posts
    for key, ptype, chan, author_name, role, t_en, t_ar, b_en, b_ar, reply_en in COMMUNITY_POSTS:
        cpost = db.query(models.CommunityPost).filter(models.CommunityPost.seed_key == key).first()
        if not cpost:
            cpost = models.CommunityPost(
                seed_key=key,
                author_id=None,
                author_name=author_name,
                author_role=role,
                channel_id=chan,
                post_type=ptype,
                title=t_en,
                title_ar=t_ar,
                body=b_en,
                body_ar=b_ar,
                is_demo=True,
            )
            db.add(cpost)
            db.flush()
            db.add(models.CommunityComment(
                seed_key=f"{key}_reply",
                post_id=cpost.id,
                author_name="Dr. Layla Al-Harbi (Demo)",
                author_role="doctor",
                body=reply_en,
                is_demo=True,
            ))
