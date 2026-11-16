# MedConnect — AI-Augmented Healthcare Knowledge & Collaboration Platform 🩺✨

**MedConnect** is a bilingual (Arabic RTL / English LTR), offline-first healthcare platform built for the **Shiraa 2026 AI Hackathon** (organized by ETC Netherlands & the General Union of Yemeni Students in Indonesia). It connects patients with verified medical practitioners while providing doctors with an AI-powered **Consultant Mentor Mode** and peer-reviewed clinical collaboration tools.

---

## 🚀 Key Features

- **Strict Role Separation & Doctor Verification:** Dedicated workflows for Patients and Verified Doctors, including credential submission and review states.
- **Consultant Mentor Mode (Gemini API):** Structures clinical reports (lab results, ultrasounds, CTGs) into 6 consultant-level cards (Pathophysiology, Differentials, Actionable Decisions, Guideline References, Clinical Pearls, and Board-Style Self-Quiz).
- **Smart Health Record & Temporary QR Access:** Patients can generate time-limited QR codes and one-time links to share medical records securely during visits.
- **Appointment Booking & Transparent Pricing:** Doctors manage consultation fees directly from their profiles, synced across all doctor cards and booking modals.
- **Offline-First Architecture:** Built with zero-build React 18 (JSX), Tailwind CSS, `localStorage` persistence, and automatic inline SVG fallbacks when offline.

---

## 👥 Team & Responsibilities

| Member | Role | Focus Area |
| :--- | :--- | :--- |
| **Anas Al-Mahdi** | Team Lead, System Architect & Pitch Presenter | Initial modular MVP foundation, clinical validation with physicians, documentation, and final hackathon pitch. |
| **Ahmed Esam** | Repository & DevOps Lead / UI Styling | GitHub repository management, deployment setup, and responsive visual refinements (`styles.css`). |
| **Mostafa Fares Eskander** | Product Owner & Full-Stack Developer | Application workflow, hospital-aligned user journeys, booking & pricing logic (`app.js`). |
| **Abdullah Ali Al-Shalafi** | Data & AI Schema Developer | Clinical datasets, bilingual medical content, guideline references, and AI JSON schema alignment (`data.js`). |
| **Ahmed Ameen Masoud** | AI Integration Engineer | Live `Gemini API` integration, multimodal report analysis, and fallback handling (`api.js`). |

---

## 🛠️ Project Structure

```text
MedConnect/
├── index.html      # Main entry shell (Tailwind CDN, React 18, Babel classic runtime)
├── styles.css      # Theme RGB variables, RTL/LTR typography, animations, and utilities
├── data.js         # Bilingual mock datasets, doctor profiles, guidelines, and clinical cases
├── api.js          # ApiService layer (localStorage CRUD, Gemini 2.5 Flash hook, offline SVGs)
└── app.js          # React 18 JSX components (PatientApp, DoctorApp, Auth, Modals)
```

---

## ▶️ How to Run Locally

1. Clone or download the repository:
   ```bash
   git clone [https://github.com/A7medEsam/MedConnect.git](https://github.com/A7medEsam/MedConnect.git)
   ```
2. Open the folder in **VS Code** and launch with **Live Server**, or run a local Python HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Visit `http://localhost:8000` in your browser.

---
---

---

<div dir="rtl">

# منصة MedConnect — منصة الرعاية الصحية والتعاون السريري المعززة بالذكاء الاصطناعي 🩺✨

**MedConnect** هي منصة رعاية صحية ثنائية اللغة (عربي / إنجليزي) مصممة للعمل حتى بدون إنترنت (Offline-First)، تم تطويرها للمشاركة في **هاكاثون شراع 2026 للذكاء الاصطناعي** (بتنظيم مركز ETC في هولندا والاتحاد العام للطلاب اليمنيين في إندونيسيا). تربط المنصة المرضى بالأطباء الموثقين، وتوفر للأطباء **وضع المرشد الاستشاري (Consultant Mentor Mode)** المدعوم بالذكاء الاصطناعي وأدوات التعاون السريري المبنية على الأدلة.

---

## 🚀 المميزات الرئيسية

- **فصل صارم للأدوار وتوثيق الأطباء:** مسارات مستقلة للمريض والطبيب الموثق، مع نظام مراجعة واعتماد الشهادات الطبية.
- **وضع المرشد الاستشاري (Gemini API):** يحلل التقارير السريرية (الفحوصات المخبرية، السونار، وتخطيط الجنين) ويقسمها إلى 6 بطاقات استشارية متكاملة (الفيزيولوجيا المرضية، التشخيص التفريقي، القرارات العلاجية، المراجع الإرشادية، الدرر السريرية، واختبار تقييم ذاتي).
- **السجل الصحي الذكي ورمز الوصول المؤقت (QR):** يتيح للمريض مشاركة سجله الطبي بأمان عبر رمز QR مؤقت ورابط لمرة واحدة أثناء الزيارة الطبية.
- **نظام حجز المواعيد وشفافية الرسوم:** يتحكم الطبيب برسوم الاستشارة من ملفه الشخصي وتنعكس تلقائياً في جميع بطاقات الحجز.
- **بنية تعمل بدون إنترنت (Offline-First):** مبنية باستخدام React 18 و Tailwind CSS مع حفظ محلي للبيانات ونظام احتياطي تلقائي يعمل بسلاسة عند انقطاع الشبكة.

---

## 👥 فريق العمل والمسؤوليات

| العضو | الدور | نطاق العمل |
| :--- | :--- | :--- |
| **أنس المهدي** | قائد الفريق، مهندس النظام ومقدم العرض | بناء الأساس المعياري للنسخة الأولية (MVP)، التحقق الميداني مع الأطباء، التوثيق، وإلقاء العرض النهائي. |
| **أحمد عصام** | مسؤول المستودع والنشر وتنسيق الواجهات | إدارة مستودع GitHub، إعداد الاستضافة والنشر، والتحسينات البصرية (`styles.css`). |
| **مصطفى فارس إسكندر** | مالك المنتج ومطور الواجهات والمنطق | تصميم تدفق التطبيق بما يطابق واقع المستشفيات، ومنطق الحجز والتسعير (`app.js`). |
| **عبدالله علي الشلفي** | مطور البيانات وهيكل الذكاء الاصطناعي | بناء قواعد البيانات السريرية، المحتوى الطبي ثنائي اللغة، وضبط توافق مخرجات JSON (`data.js`). |
| **أحمد أمين مسعود** | مهندس تكامل الذكاء الاصطناعي | تفعيل الربط الحي مع `Gemini API` وتحليل التقارير الطبية (`api.js`). |

</div>
