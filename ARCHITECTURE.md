# MedConnect — System Architecture & Technical Reference

This document describes the **verified current architecture** of MedConnect on branch `feature/restore-legacy-modules`. It is written so any engineer or new Computer Science contributor can trace every screen, API endpoint, service module, and SQLite table accurately.

> **Important Version Distinction:**  
> - **Active Application (Develop Going Forward):** [`frontend/`](frontend/) (React 18 + Vite + Tailwind CSS v3) and [`backend/`](backend/) (Python + FastAPI + SQLAlchemy + SQLite + `google-genai==3.6.1`).  
> - **Legacy Prototype (Preserved Reference Only):** Root-level [`index.html`](index.html), [`styles.css`](styles.css), [`data.js`](data.js), [`api.js`](api.js), and [`app.js`](app.js) implement the original zero-build browser-only application (`localStorage` + CDN scripts). Do not extend those legacy files for new backend-backed features.

---

## 1. High-Level System Overview

```text
Browser (React 18 + Vite @ :5173)
  │
  ├── Static shell & public educational cache (frontend/public/sw.js)
  │
  └── HTTP / XHR JSON & FormData (/api/* proxied via frontend/vite.config.js)
        │
        ▼
FastAPI Backend (Uvicorn @ :8000, backend/app/main.py)
  ├── Auth & RBAC (backend/app/auth.py — JWT + bcrypt)
  ├── 11 Domain Routers (backend/app/routers/*.py)
  ├── File Storage Service (backend/app/services/file_service.py → backend/app/storage/uploads/)
  ├── Gemini AI Service (backend/app/services/gemini_service.py → google-genai 3.6.1 Interactions API)
  └── SQLAlchemy ORM + SQLite (backend/app/models.py + database.py → backend/medconnect.db)
```

---

## 2. Complete Project Directory & File Inventory

Generated/environment paths ignored from source control (`.gitignore`): `backend/venv/`, `frontend/node_modules/`, `frontend/dist/`, `__pycache__/`, `*.db`, `backend/app/storage/uploads/`, `backend/.env`.

### A. Root & Documentation Files

| Path | Purpose | Main Contents / Role | Communicates With | Maintainer / Area | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `README.md` | Main repository overview & quick start | Setup, demo logins, scripts, links | `ARCHITECTURE.md`, `TEAM_GUIDE.md`, `start_medconnect.bat` | Anas / Team | **Active** |
| `ARCHITECTURE.md` | Full technical reference (this file) | File map, DB schema, API, data flows | Codebase (`frontend/`, `backend/`) | Anas / Lead Architect | **Active** |
| `TEAM_GUIDE.md` | Developer onboarding & Git workflow | Ownership, branch flow, coordination | All team members | Anas / Ahmed Esam | **Active** |
| `start_medconnect.bat` | Windows one-click demo launcher | Checks venv/deps, starts backend `:8000` & frontend `:5173`, polls `/api/health` | `backend/venv`, `frontend/` | Anas / Demo Ops | **Active** |
| `.gitignore` | Git exclusion rules | Ignores `.env`, `venv`, `node_modules`, `*.db`, `uploads/` | Git CLI | Ahmed Esam | **Active** |
| `PROJECT_COMPARISON_REPORT.md` | Historical audit (pre-restoration) | Snapshot before `feature/restore-legacy-modules` | Git history | Audit artifact | **Historical** |
| `RESTORED_FEATURES_REPORT.md` | Restoration log for legacy modules | Summarizes clinical, forum, mentor, QR, fee restoration | Backend & Frontend | Audit artifact | **Historical** |
| `index.html`, `styles.css`, `data.js`, `api.js`, `app.js` | Original browser-only MVP | Self-contained React UMD + `localStorage` app | None (independent of `frontend/` + `backend/`) | Historical team (`main`) | **Legacy** |

### B. Backend (`backend/`)

| Path | Purpose | Main Functions / Classes | Communicates With | Suggested Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/requirements.txt` | Python package pins | `fastapi==0.115.6`, `uvicorn==0.34.0`, `sqlalchemy==2.0.36`, `google-genai==3.6.1`, `pydantic>=2.10.4,<3.0.0`, `pydantic-settings==2.7.1`, `python-dotenv==1.0.1`, `python-jose`, `passlib[bcrypt]`, `python-multipart`, `aiofiles` | `backend/venv` (Python 3.13) | Shared | **Active** |
| `backend/.env.example` | Backend environment template | Documents `SECRET_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `DATABASE_URL`, `CORS_ORIGINS` | `config.py` | Ahmed Ameen / Lead | **Active** |
| `backend/app/__init__.py` | Package marker | Makes `app` importable | — | Shared | **Active** |
| `backend/app/config.py` | Environment & timeout config | `Settings`, `ENV_FILE_PATH`, `get_settings()`, `resolve_gemini_config()`, `get_timeout_config()` (`45s` chat, `90s` report, `30s` upload) | `backend/.env`, `main.py`, `gemini_service.py`, routers | Ahmed Ameen / Shared | **Active** |
| `backend/app/database.py` | SQLAlchemy engine & schema init | `engine`, `SessionLocal`, `Base`, `get_db()`, `_ensure_column_migrations()`, `init_db()` | `config.py`, `models.py`, `seed_data.py` | Abdullah | **Active** |
| `backend/app/models.py` | SQLite ORM schema (29 tables) | User, profiles, health records, reports/analyses, chat, appointments, sharing, clinical knowledge, mentor, forum, community, QR tokens/logs | `database.py`, routers | Abdullah / Shared | **Active** |
| `backend/app/schemas.py` | Pydantic validation & response DTOs | Auth, patient/doctor profiles, reports, chat (`MessageOut`), appointments, forum, community, QR requests | All routers | Abdullah / Shared | **Active** |
| `backend/app/auth.py` | Authentication & RBAC guards | `hash_password()`, `verify_password()`, `create_access_token()`, `get_current_user()`, `require_role()` | `models.py`, `config.py`, routers | Shared | **Active** |
| `backend/app/seed_data.py` | Idempotent demo & clinical seeder | `SPECIALTIES` (14), `GUIDELINES` (14), `CLINICAL_REFS` (16), `SURGICAL_TIPS` (6), `MENTOR_SAMPLES` (3), 5 demo patients, 10 demo doctors, seeded forum/community posts | `database.py`, `models.py`, `auth.py` | Abdullah | **Active** |
| `backend/app/main.py` | FastAPI app entrypoint & health | `app`, CORS middleware, `global_exception_handler()` (safe bilingual 500 JSON), `on_startup()`, `health_check()` (`/` & `/api/health`) | All 11 routers, `database.py`, `config.py` | Shared | **Active** |
| `backend/app/services/file_service.py` | Secure upload disk storage | `validate_upload()` (`.pdf/.png/.jpg/.jpeg/.webp`, `<=20MB`), `save_upload_file()`, `get_file_path()`, `read_file_bytes()`, `delete_file()` | `reports.py`, `doctors.py`, `mentor.py`, `qr.py` | Ahmed Ameen / Shared | **Active** |
| `backend/app/services/gemini_service.py` | Official `google-genai` Interactions client | `GeminiServiceError`, `_get_configured_client()` (`attempts=1`), `_run_interaction_with_deadline()`, `_map_gemini_exception()` (9 categories), `analyze_medical_report()`, `chat_with_context()`, `analyze_mentor_report()` | `config.py`, `reports.py`, `chat.py`, `mentor.py` | Ahmed Ameen | **Active** |
| `backend/app/routers/auth.py` | Account auth & language pref | `/register`, `/login`, `/me`, `/language` | `auth.py`, `models.py`, `schemas.py` | Shared | **Active** |
| `backend/app/routers/patients.py` | Patient records & sharing CRUD | `/profile`, `/conditions`, `/medications`, `/allergies`, `/vitals`, `/doctors`, `/share` | `models.py`, `schemas.py`, `auth.py` | Abdullah / Mostafa | **Active** |
| `backend/app/routers/doctors.py` | Doctor profile, license & patients | `/profile`, `/verification`, `/verification/file`, `/patients`, `/patients/{patient_id}` | `models.py`, `file_service.py`, `reports.py` | Mostafa | **Active** |
| `backend/app/routers/reports.py` | Medical report upload & AI analysis | `/upload`, `/{id}/analyze` (preserves prior `Analysis` on failure), list/get/file/delete | `file_service.py`, `gemini_service.py`, `models.py` | Ahmed Ameen | **Active** |
| `backend/app/routers/chat.py` | Context-aware bilingual AI chat | Conversation CRUD + `send_message` (injects profile & report summaries + up to 16 turns) | `gemini_service.py`, `models.py`, `schemas.py` | Ahmed Ameen | **Active** |
| `backend/app/routers/appointments.py` | Visit booking & simulated payment | List, create (`clinic`/`card_sim`/`paypal_sim`), update status, delete | `models.py`, `schemas.py`, `auth.py` | Mostafa | **Active** |
| `backend/app/routers/clinical.py` | Specialties, guidelines, refs, tips | `/specialties`, `/guidelines`, `/references`, `/surgical-tips`, `/bookmark`, `/bundle` | `models.py`, `auth.py` | Abdullah | **Active** |
| `backend/app/routers/mentor.py` | Consultant Mentor Mode (doctors) | `/samples`, `/history`, `/analyze` (uploads file + calls `analyze_mentor_report`) | `file_service.py`, `gemini_service.py`, `models.py` | Mostafa / Ahmed Ameen | **Active** |
| `backend/app/routers/forum.py` | Doctor clinical forum | Post CRUD, comments, upvotes (`doctor` role only) | `models.py`, `schemas.py`, `auth.py` | Ahmed Esam | **Active** |
| `backend/app/routers/community.py` | Patient health community | Post CRUD, comments, likes, moderation flags (`report_count`) | `models.py`, `schemas.py`, `auth.py` | Ahmed Esam | **Active** |
| `backend/app/routers/qr.py` | Cryptographic temporary QR tokens | SHA-256 hashed tokens (`/tokens`), doctor scoped redemption (`/access`), scoped report download | `models.py`, `file_service.py`, `reports.py` | Mostafa / Security | **Active** |

### C. Frontend (`frontend/`)

| Path | Purpose | Main Functions / Components | Communicates With | Suggested Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/package.json` | JS dependencies & scripts | React 18.3, Vite 6, React Router 7.1, Tailwind 3.4, `lucide-react`, `qrcode`, `jsqr` | `npm`, `vite.config.js` | Shared | **Active** |
| `frontend/vite.config.js` | Dev server & backend proxy | Proxies `/api/*` → `http://localhost:8000`, serves on port `5173` | Backend `:8000` | Shared | **Active** |
| `frontend/tailwind.config.js` | Tailwind palette & typography | Custom `primary` teal scale (`#0d9488`), `Inter` (EN) & `Cairo` (AR) fonts | `index.css` | Ahmed Esam | **Active** |
| `frontend/index.html` | Vite SPA shell | Loads Google Fonts (`Inter`, `Cairo`) and `/src/main.jsx` | `src/main.jsx` | Ahmed Esam | **Active** |
| `frontend/public/sw.js` | Service Worker offline cache | Caches SPA shell & `/api/clinical/bundle` (`network-first`); **never caches private `/api/*` user routes** | `main.jsx`, `/api/clinical/bundle` | Abdullah / Ahmed Esam | **Active** |
| `frontend/src/main.jsx` | React root mount & providers | Wraps `BrowserRouter` → `LangProvider` → `ConnectivityProvider` → `AuthProvider` → `ToastProvider` → `App` | Contexts, `sw.js`, `App.jsx` | Shared | **Active** |
| `frontend/src/index.css` | Global styles & utility classes | `.card`, `.btn-primary`, `.btn-secondary`, `.input-field`, `.spinner`, `.loading-dot`, `[dir="rtl"]` fonts | All UI components | Ahmed Esam | **Active** |
| `frontend/src/App.jsx` | Client route table | Defines `/`, `/login`, `/register`, `/patient/*` (7 routes), `/doctor/*` (8 routes), `*` fallback | `ProtectedRoute.jsx`, all pages | Shared | **Active** |
| `frontend/src/api/client.js` | Centralized HTTP & XHR client | `API_TIMEOUTS` (`3s`/`15s`/`30s`/`48s`/`93s`/`123s`), `ApiError`, `getFriendlyErrorMessage()`, `setClientLang()`, `subscribeBackendStatus()`, `api.*` | All pages & contexts | Ahmed Ameen / Shared | **Active** |
| `frontend/src/context/LangContext.jsx` | Bilingual (`en`/`ar`) & RTL/LTR state | `lang`, `setLang()`, `toggleLang()`, updates `<html dir>` + `setClientLang()` | `locales/en.js`, `locales/ar.js`, `client.js` | Abdullah / Ahmed Esam | **Active** |
| `frontend/src/context/ConnectivityContext.jsx` | Backend `/api/health` & offline monitor | Polls `/api/health` on start (`3s` timeout) & every `30s`, tracks `backendStatus` (`checking`/`connected`/`disconnected`), `isGeminiConfigured`, caches `eduBundle` in `localStorage` | `client.js`, `AppLayout`, `AuthLayout`, `OfflineAiAlert`, pages | Ahmed Ameen / Shared | **Active** |
| `frontend/src/context/AuthContext.jsx` | Session & user state | `login()`, `register()`, `logout()`, `syncLanguage()`, `refreshUser()`, preserves JWT on transient disconnects, clears on `401` | `client.js`, `LangContext.jsx` | Shared | **Active** |
| `frontend/src/locales/en.js` & `ar.js` | UI dictionaries (`en` / `ar`) | Full UI copy + exact bilingual connectivity, stage loading, and AI error strings | `LangContext.jsx` | Abdullah / Team | **Active** |
| `frontend/src/layouts/AuthLayout.jsx` | Public auth page wrapper | Header with language toggle + live backend connection indicator/retry banner | `ConnectivityContext`, `LangContext` | Ahmed Esam | **Active** |
| `frontend/src/layouts/AppLayout.jsx` | Authenticated dashboard shell | Responsive sidebar (Patient/Doctor nav), top bar connectivity badge, offline banner, logout | `AuthContext`, `ConnectivityContext`, `LangContext` | Ahmed Esam | **Active** |
| `frontend/src/components/ProtectedRoute.jsx` | Role-based route guard | Redirects unauthenticated users to `/login` and mismatched roles to their dashboard | `AuthContext` | Shared | **Active** |
| `frontend/src/components/FileUpload.jsx` | Drag-and-drop validated uploader | Client validation (`.pdf/.png/.jpg/.jpeg/.webp`, `<=20MB`), shows neutral local selection until backend returns confirmed `report.id` | `ReportsPage`, `MentorPage` | Mostafa / Ahmed Esam | **Active** |
| `frontend/src/components/ReportAnalysisCard.jsx` | Structured AI report renderer | Dynamically switches stored `{ar, en}` report fields with zero extra API calls; shows `secondLangUnavailable` for legacy single-lang reports | `ReportsPage`, `PatientDetailPage` | Mostafa / Ahmed Ameen | **Active** |
| `frontend/src/components/ChatInterface.jsx` | Bilingual chat UI | Multi-stage loader (`Sending your question...` → `Gemini is preparing a response...` + `>10s` calm notice), instant `content_ar`/`content_en` toggle, Retry button, double-submit lock | `ChatPage` | Ahmed Ameen | **Active** |
| `frontend/src/components/OfflineAiAlert.jsx` | Connectivity / Gemini key banner | Distinguishes offline internet vs `backend_unavailable` vs missing `GEMINI_API_KEY`, offers Retry & Doctor Offline References link | `ConnectivityContext`, `ReportsPage`, `ChatPage`, `MentorPage` | Ahmed Ameen | **Active** |
| `frontend/src/components/Toast.jsx` | Notification toasts | Global `success`, `error`, `info` toasts | All pages | Ahmed Esam | **Active** |
| `frontend/src/pages/LoginPage.jsx` & `RegisterPage.jsx` | Sign-in, demo buttons & signup | Auth forms + one-click `patient_demo` / `doctor_demo` sign-in; disabled when backend is down | `AuthContext`, `ConnectivityContext` | Shared | **Active** |
| `frontend/src/pages/patient/DashboardPage.jsx` | Patient overview | Counts (`conditions`, `medications`, `allergies`, `reports`), recent vitals, appointments, quick links | `patients`, `reports`, `appointments` APIs | Mostafa | **Active** |
| `frontend/src/pages/patient/ProfilePage.jsx` | Personal info & clinical lists | Edit demographics + add/delete conditions, meds, allergies, vitals | `/api/patient/*` | Abdullah | **Active** |
| `frontend/src/pages/patient/ReportsPage.jsx` | Upload, preview & AI report analysis | Real progress upload → ID check → 90s analysis with multi-stage loader, Retry, preserved prior results on failure | `FileUpload`, `ReportAnalysisCard`, `reports.py` | Ahmed Ameen / Mostafa | **Active** |
| `frontend/src/pages/patient/ChatPage.jsx` | Patient & Doctor AI chat page | Conversation sidebar + `ChatInterface` (`45s` backend / `48s` frontend deadline, shared route for `/doctor/chat`) | `ChatInterface`, `chat.py` | Ahmed Ameen | **Active** |
| `frontend/src/pages/patient/CarePage.jsx` | Doctor directory, sharing & booking | Search/list doctors with fees & verification status, share/revoke records, book visits with payment method (`clinic`, `card_sim`, `paypal_sim`) | `patients.py`, `appointments.py` | Mostafa | **Active** |
| `frontend/src/pages/patient/CommunityPage.jsx` | Patient Health Community UI | Browse/filter posts, create post, comment, like, flag *(see Section 7 for `client.js` mismatches)* | `community.py` via `client.js` | Ahmed Esam | **Active (Partial mismatch)** |
| `frontend/src/pages/patient/QrSharePage.jsx` | Patient QR code generator UI | Generates expiring scoped SVG QR via `qrcode` library *(see Section 7 for `client.js` mismatch)* | `qr.py` via `client.js` | Mostafa | **Active (Mismatch in `client.js`)** |
| `frontend/src/pages/doctor/DashboardPage.jsx` | Physician overview | Shared patient count, appointment schedule with Confirm/Complete/Cancel controls, clinical quick links | `doctors.py`, `appointments.py` | Mostafa | **Active** |
| `frontend/src/pages/doctor/PatientsPage.jsx` | Shared patients list & QR scanner | Lists shared patients + `jsqr` camera/manual QR redemption *(see Section 7 for `client.js` mismatch)* | `doctors.py`, `qr.py` via `client.js` | Mostafa | **Active (Partial mismatch)** |
| `frontend/src/pages/doctor/PatientDetailPage.jsx` | Full shared patient medical view | Inspects shared patient's demographics, conditions, meds, allergies, vitals, and report PDF/images/analyses | `doctors.py`, `reports.py`, `ReportAnalysisCard` | Mostafa | **Active** |
| `frontend/src/pages/doctor/MentorPage.jsx` | Consultant Mentor Mode UI | 3 tabs: Real Upload (6-card Gemini reasoning), Demo Samples (CTG/ECG/BloodTest), History + MCQ self-quiz | `mentor.py`, `FileUpload`, `OfflineAiAlert` | Mostafa / Ahmed Ameen | **Active** |
| `frontend/src/pages/doctor/ReferencesPage.jsx` | Clinical guidelines library | Search/filter 16 refs across 14 orgs & 14 specialties; falls back to `eduBundle` cache offline | `clinical.py`, `ConnectivityContext` | Abdullah | **Active** |
| `frontend/src/pages/doctor/SurgicalTipsPage.jsx` | Educational surgical protocols | Specialty filter, text search, bookmark toggle, educational disclaimer, offline cache fallback | `clinical.py`, `ConnectivityContext` | Abdullah | **Active** |
| `frontend/src/pages/doctor/ForumPage.jsx` | Doctors-only clinical forum | Create/edit/delete clinical case discussions, comment, upvote | `forum.py` | Ahmed Esam | **Active** |
| `frontend/src/pages/doctor/ProfilePage.jsx` | Doctor profile & license upload | Edit specialty/location/fee (`consultation_fee`), upload medical license (`pending` manual review) | `doctors.py` | Mostafa | **Active** |

---

## 3. Data Flows (12 End-to-End Workflows)

1. **User Registration & Login:**  
   `LoginPage.jsx` / `RegisterPage.jsx` → `AuthContext.login()` / `register()` → `client.js` (`POST /api/auth/login` or `/register`) → `routers/auth.py` validates input (`schemas.py`), verifies/hashes password via `bcrypt` (`app/auth.py`), creates empty `PatientProfile` or `DoctorProfile` for new accounts, returns JWT (`access_token`, HS256). `AuthContext` stores JWT in `localStorage` (`medconnect_token`) and routes via `ProtectedRoute.jsx`.
2. **Patient Profile Updates & Storage:**  
   `patient/ProfilePage.jsx` → `api.getPatientProfile()` / `updatePatientProfile()` / `add*()` / `delete*()` → `routers/patients.py` (`require_role("patient")`) → queries/updates `users`, `patient_profiles`, `conditions`, `medications`, `allergies`, and `vitals` scoped strictly to `current_user.id`.
3. **Doctor Access to Shared Patient Records:**  
   Patient toggles access in `patient/CarePage.jsx` (`POST /api/patient/share` / `DELETE /api/patient/share/{doctor_id}`) → `routers/patients.py` creates/updates `SharedAccess(status="active"|"revoked")`. Doctor opens `doctor/PatientsPage.jsx` (`GET /api/doctor/patients`) → `doctor/PatientDetailPage.jsx` (`GET /api/doctor/patients/{patient_id}`) → `routers/doctors.py` checks `SharedAccess.status == "active"`, returning `403` if unshared.
4. **PDF & Medical Image Upload:**  
   `FileUpload.jsx` validates extension & `<=20MB` locally and shows neutral local selection state (no false "Uploaded" check) → `ReportsPage.jsx` (`api.uploadReport`, `30s` XHR timeout) → `POST /api/reports/upload` (`routers/reports.py`) → `file_service.save_upload_file()` writes UUID-prefixed bytes to `backend/app/storage/uploads/` → inserts `Report(status="uploaded")` and returns valid `report.id` → `FileUpload` shows confirmed green uploaded badge.
5. **Gemini Medical Report Analysis:**  
   `ReportsPage.jsx` checks backend connectivity, locks `analyzingRef`, and calls `api.analyzeReport(report.id, lang)` (`93s` frontend guard) → `POST /api/reports/{id}/analyze` (`routers/reports.py`) reads disk bytes via `file_service.read_file_bytes()`, builds patient context string, and calls `gemini_service.analyze_medical_report()`. `gemini_service.py` sends base64 `{type: "document"|"image"}` + bilingual prompt to `client.interactions.create(model="gemini-3.8-flash", store=False)` with `attempts=1` and a `90s` deadline. On success, saves `Analysis` (`schema_version: "bilingual_v2"`); on failure, preserves any existing `Analysis` + `status="analyzed"` and records `last_error_json`.
6. **Gemini AI Chat:**  
   `patient/ChatPage.jsx` & `ChatInterface.jsx` (also shared route `/doctor/chat`) display staged indicators (`Sending your question...` → `Gemini is preparing a response...` + `>10s` calm notice, `48s` frontend guard) → `POST /api/chat/conversations/{id}/messages` (`routers/chat.py`) gathers `patient_profiles`, `conditions`, `medications`, `allergies`, `vitals`, and analyzed report summaries, plus up to 16 prior messages (`user_input` / `model_output` steps) → `gemini_service.chat_with_context()` calls `client.interactions.create()` under `45s` deadline. User + assistant rows commit together **only after** Gemini succeeds, leaving clean DB history on timeouts/errors.
7. **Bilingual Arabic/English Support:**  
   UI strings live in `frontend/src/locales/en.js` and `ar.js`; toggling language in `AppLayout` / `AuthLayout` calls `AuthContext.syncLanguage()` → `LangContext` updates `<html dir="rtl"|"ltr" lang>` and `setClientLang(lang)`, and `PUT /api/auth/language` persists preference. Gemini prompts return `{ar, en}` JSON in a **single request** (`Message.content_en`/`content_ar` and `bilingual_v2` report JSON), allowing instant UI language switching in `ChatInterface` and `ReportAnalysisCard` without repeat Gemini calls.
8. **Appointments & Simulated Payment:**  
   Patient selects doctor & slot in `patient/CarePage.jsx` (`clinic`, `card_sim`, or `paypal_sim`) → `POST /api/appointments` (`routers/appointments.py`) snapshots doctor `consultation_fee` and sets `payment_status = "pay_at_clinic" | "simulated_demo_only"`. Both patients (`cancelled` only) and doctors (`confirmed` / `completed` / `cancelled`) update appointments via `PUT /api/appointments/{id}`.
9. **Consultant Mentor Mode:**  
   `doctor/MentorPage.jsx` loads seeded demo cases (`GET /api/mentor/samples`), prior saved analyses (`GET /api/mentor/history`), and allows real PDF/image uploads (`POST /api/mentor/analyze`, `123s` frontend guard). `routers/mentor.py` saves file + `Report`, calls `gemini_service.analyze_mentor_report()` (`90s` deadline, strict non-fabricated probability rules), and stores `MentorAnalysis`. *(Note: when Gemini fails inside `mentor.py`, `report.status="error"` is set without persisting `last_error_json`.)*
10. **Clinical References & Surgical Tips:**  
    `doctor/ReferencesPage.jsx` & `SurgicalTipsPage.jsx` fetch `GET /api/clinical/references`, `specialties`, `guidelines`, `surgical-tips`, and `POST /api/clinical/surgical-tips/{id}/bookmark`. Online, `ConnectivityContext` caches `GET /api/clinical/bundle` in `localStorage` (`medconnect_public_edu_cache`) and `sw.js` caches public clinical routes for offline fallback (never private patient data).
11. **Doctor Forum & Patient Community:**  
    Doctors use `doctor/ForumPage.jsx` ↔ `routers/forum.py` (`/api/forum/posts`, comments, upvotes; restricted to `require_role("doctor")`). Authenticated patients/doctors use `patient/CommunityPage.jsx` ↔ `routers/community.py` (`/api/community/posts`, comments, likes, moderation flags). *(See Section 7 for 2 `client.js` method mismatches on Community edit & flag.)*
12. **Temporary QR Access:**  
    Intended flow: Patient (`QrSharePage.jsx`) generates a token (`POST /api/qr/tokens` in `qr.py`), receives plaintext `MC-...` once, renders an SVG containing only that random token while backend stores SHA-256 `token_hash` + `scope_json` + `expires_at`. Doctor (`PatientsPage.jsx`) scans via `jsqr` camera/input and redeems via `POST /api/qr/access`, logging to `qr_access_logs` and optionally fetching scoped files (`GET /api/qr/reports/{id}/file` with `X-QR-Token`). **Currently blocked in browser UI due to naming/path mismatches in `frontend/src/api/client.js`** (backend `qr.py` passes API tests directly; see Section 7).

---

## 4. Database Documentation (29 SQLite Tables)

Defined via SQLAlchemy ORM in [`backend/app/models.py`](backend/app/models.py) and initialized/migrated by `init_db()` in [`backend/app/database.py`](backend/app/database.py).

| Category | Table Name | Purpose | Key Fields & Relationships | API Routers Using It |
| :--- | :--- | :--- | :--- | :--- |
| **Identity** | `users` | Accounts for patients & doctors | `id`, `username` (unique), `email` (unique), `full_name`, `password_hash`, `role` (`patient`/`doctor`), `language` | `auth`, `patients`, `doctors`, `appointments`, `qr`, `forum`, `community` |
| **Profiles** | `patient_profiles` | Patient demographics & notes | `id`, `user_id` (FK `users.id`, unique), `date_of_birth`, `gender`, `blood_type`, `height_cm`, `weight_kg`, `phone`, `emergency_contact`, `medical_notes` | `auth`, `patients`, `doctors`, `chat`, `reports`, `qr` |
| | `doctor_profiles` | Physician specialty, fee & verification | `id`, `user_id` (FK, unique), `specialty`, `specialty_id`, `location`, `license_number`, `clinic_name`, `years_experience`, `consultation_fee`, `verification_status`, `verification_document`, `is_demo` | `auth`, `doctors`, `patients`, `appointments` |
| **Health Records** | `conditions` | Patient medical conditions | `id`, `user_id` (FK), `name`, `status`, `diagnosed_date`, `notes`, `is_demo` | `patients`, `doctors`, `reports`, `chat`, `qr` |
| | `medications` | Patient medications | `id`, `user_id` (FK), `name`, `dosage`, `frequency`, `start_date`, `notes`, `is_demo` | `patients`, `doctors`, `reports`, `chat`, `qr` |
| | `allergies` | Recorded patient allergies | `id`, `user_id` (FK), `allergen`, `severity`, `reaction`, `notes`, `is_demo` | `patients`, `doctors`, `reports`, `chat`, `qr` |
| | `vitals` | Time-series health measurements | `id`, `user_id` (FK), `vital_type`, `value`, `unit`, `recorded_at`, `notes`, `is_demo` | `patients`, `doctors`, `chat`, `qr` |
| **Reports & AI** | `reports` | Uploaded file metadata & status | `id`, `user_id` (FK), `filename` (disk name), `original_filename`, `content_type`, `file_size`, `uploaded_at`, `status` (`uploaded`/`analyzing`/`analyzed`/`error`/`demo_sample`), `last_error_json` | `reports`, `doctors`, `mentor`, `qr`, `chat` |
| | `analyses` | Saved Gemini report summaries | `id`, `report_id` (FK `reports.id`), `user_id` (FK), `result_json` (`bilingual_v2`), `model_used`, `created_at` | `reports`, `doctors`, `chat`, `qr` |
| **AI Chat** | `conversations` | Chat threads per user | `id`, `user_id` (FK), `title`, `created_at`, `updated_at` | `chat` |
| | `messages` | Bilingual chat turn history | `id`, `conversation_id` (FK `conversations.id`), `role`, `content`, `content_en`, `content_ar`, `created_at` | `chat` |
| **Care & Sharing** | `appointments` | Scheduled clinic/review visits | `id`, `patient_id` (FK), `doctor_id` (FK), `scheduled_at`, `appointment_type`, `status`, `consultation_fee`, `payment_method`, `payment_status` | `appointments` |
| | `shared_access` | Persistent patient → doctor sharing | `id`, `doctor_id` (FK), `patient_id` (FK), `status` (`active`/`revoked`), `created_at` | `patients`, `doctors`, `reports` |
| **Clinical Knowledge** | `specialties` | Bilingual specialty catalog (14 seeded) | `id` (PK slug), `name_en`, `name_ar`, `icon`, `color`, `is_surgical` | `clinical`, `forum`, `community`, `doctors` |
| | `guidelines` | Clinical bodies (14 seeded, e.g. NICE, ESC) | `code` (PK), `name_en`, `name_ar`, `color` | `clinical` |
| | `clinical_references` | 16 guideline reference summaries | `id` (PK), `title_en/ar`, `source_en/ar`, `specialty_id`, `guidelines_json`, `summary_en/ar`, `url`, `verification_status`, `is_demo` | `clinical` |
| | `surgical_tips` | 6 educational surgical discussions | `id` (PK), `title_en/ar`, `specialty_id`, `tip_type`, `author_name_en/ar`, `steps_json`, `reference_url`, `upvotes`, `is_demo` | `clinical` |
| | `tip_bookmarks` | Doctor bookmarks per surgical tip | `id`, `user_id` (FK), `tip_id` (FK `surgical_tips.id`), unique `(user_id, tip_id)` | `clinical` |
| **Mentor Mode** | `mentor_samples` | 3 educational cases (CTG, ECG, BloodTest) | `id` (PK), `title_en/ar`, `report_type_en/ar`, `sample_json`, `is_demo` | `mentor`, `clinical` |
| | `mentor_analyses` | Real Gemini 6-card analyses for doctors | `id`, `user_id` (FK), `report_id` (FK nullable), `report_type`, `original_filename`, `result_json`, `model_used`, `is_demo` | `mentor` |
| **Doctor Forum** | `forum_posts` | Doctor clinical case discussions | `id`, `seed_key` (unique), `author_id` (FK nullable), `author_name`, `specialty_id`, `title/_ar`, `presentation/_ar`, `protocol/_ar`, `tags_json`, `is_demo` | `forum` |
| | `forum_comments` | Replies on doctor forum cases | `id`, `seed_key`, `post_id` (FK `forum_posts.id`), `author_id` (FK), `body/_ar`, `is_best_approach`, `is_demo` | `forum` |
| | `forum_upvotes` | Upvote tracking per doctor & post | `id`, `post_id` (FK), `user_id` (FK), unique `(post_id, user_id)` | `forum` |
| **Community** | `community_posts` | Public health community posts | `id`, `seed_key`, `author_id` (FK), `author_role`, `channel_id`, `post_type`, `title/_ar`, `body/_ar`, `report_count`, `is_demo` | `community` |
| | `community_comments` | Replies on community posts | `id`, `seed_key`, `post_id` (FK `community_posts.id`), `author_id` (FK), `author_role`, `body/_ar`, `is_demo` | `community` |
| | `community_likes` | Like tracking per user & post | `id`, `post_id` (FK), `user_id` (FK), unique `(post_id, user_id)` | `community` |
| | `community_flags` | Moderation flag reports | `id`, `post_id` (FK), `reporter_id` (FK), `reason`, unique `(post_id, reporter_id)` | `community` |
| **Temporary QR** | `qr_access_tokens` | SHA-256 hashed temporary QR grants | `id`, `patient_id` (FK), `token_hash` (unique, never plaintext), `token_hint`, `scope_json`, `expires_at`, `revoked_at`, `is_active` | `qr` |
| | `qr_access_logs` | Audit trail for QR redemptions | `id`, `token_id` (FK `qr_access_tokens.id`), `doctor_id` (FK), `action` (`granted`/`denied_expired`/`denied_revoked`), `accessed_at` | `qr` |

### Fictional Seed Data vs. Real User Accounts
- **`seed_all(db)` ([seed_data.py](backend/app/seed_data.py)):** Runs idempotently at backend startup. Seeds 5 demo patients (`patient_demo` + 4 fictional patients), 10 demo doctors (`doctor_demo` + 9 fictional doctors), clinical catalogs, and sample forum/community posts flagged `is_demo=True` (and `verification_status="demo"` for demo doctors). It checks existence by `username` / `seed_key` so restarting the backend never overwrites or attaches demo items to real users.
- **Newly Registered Accounts (`POST /api/auth/register`):** Always start with **zero** conditions, medications, allergies, vitals, reports, chats, or shared doctors, `is_demo=False`, and `verification_status="unverified"` for newly registered doctors.

---

## 5. Gemini AI Integration Details

Implemented strictly on the backend in [`backend/app/services/gemini_service.py`](backend/app/services/gemini_service.py):
- **SDK & API:** `google-genai==3.6.1` (`from google import genai`) using the **Interactions API**: `client.interactions.create(model=..., input=..., store=False)`.
- **Configuration Authoritativeness ([config.py](backend/app/config.py)):** `resolve_gemini_config()` reads `GEMINI_API_KEY` from `backend/.env` first (then OS env fallback) and actively ignores/neutralizes `GOOGLE_API_KEY` so only one key source controls requests. `GEMINI_MODEL` defaults to `"gemini-3.8-flash"`. Restarting `uvicorn` is recommended after editing `backend/.env`. Keys are never returned in HTTP responses or frontend code, and exception logs strip key patterns (`[REDACTED]`).
- **Deadlines & Retries:** `HttpOptions(timeout=..., retry_options=HttpRetryOptions(attempts=1))` disables automatic hidden 5x SDK retries. `_run_interaction_with_deadline()` enforces `45.0s` (chat) and `90.0s` (reports/mentor) end-to-end deadlines.
- **9 Distinct Error Categories:** `backend_unavailable` (`0`/proxy failure, frontend), `quota_exceeded` (`429`, `retryable=False`), `auth_invalid` (`401`), `permission_denied` (`403`), `model_unavailable` (`404`), `service_unavailable` (`503`), `network_error` (`503`), `request_timeout` (`504`), `invalid_response` (`502`), plus `not_configured` (`503` if key blank). No fake/mocked medical conclusions are ever substituted on error, and failed re-analysis preserves the prior successful `Analysis` row.

---

## 6. REST API Endpoint Reference

All routers are registered in [`backend/app/main.py`](backend/app/main.py). Requests requiring authentication expect `Authorization: Bearer <JWT>`.

| Method | Path | Purpose | Role / Auth | Frontend Caller (`client.js` / Page) |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` and `/api/health` | Backend health, Gemini key/model readiness & configured timeouts | Public | `ConnectivityContext` (`api.health`) |
| `POST` | `/api/auth/register` | Create isolated patient or doctor account + JWT | Public | `RegisterPage` (`api.register`) |
| `POST` | `/api/auth/login` | Sign in with username/email + password → JWT | Public | `LoginPage` (`api.login`) |
| `GET` | `/api/auth/me` | Return current user metadata | Authenticated | `AuthContext` (`api.me`) |
| `PUT` | `/api/auth/language` | Persist `en` or `ar` language preference | Authenticated | `AuthContext` (`api.updateLanguage`) |
| `GET` / `PUT` | `/api/patient/profile` | Read/update patient demographics & notes | `patient` | `PatientDashboardPage`, `ProfilePage` |
| `POST` / `DELETE` | `/api/patient/conditions`, `/conditions/{id}` | Add/delete medical condition | `patient` | `patient/ProfilePage` |
| `POST` / `DELETE` | `/api/patient/medications`, `/medications/{id}` | Add/delete medication | `patient` | `patient/ProfilePage` |
| `POST` / `DELETE` | `/api/patient/allergies`, `/allergies/{id}` | Add/delete allergy | `patient` | `patient/ProfilePage` |
| `POST` / `DELETE` | `/api/patient/vitals`, `/vitals/{id}` | Add/delete vital reading | `patient` | `patient/ProfilePage` |
| `GET` | `/api/patient/doctors` | List doctors, fees, verification status & `is_shared` | `patient` | `patient/CarePage` (`api.listDoctors`) |
| `POST` / `DELETE` | `/api/patient/share`, `/share/{doctor_id}` | Grant or revoke persistent doctor access | `patient` | `patient/CarePage` (`shareWithDoctor`, `revokeDoctorShare`) |
| `GET` / `PUT` | `/api/doctor/profile` | Read/update physician details & `consultation_fee` | `doctor` | `doctor/ProfilePage` |
| `POST` / `GET` | `/api/doctor/verification`, `/verification/file` | Upload/download physician credential (`status="pending"`) | `doctor` | `doctor/ProfilePage` |
| `GET` | `/api/doctor/patients`, `/patients/{patient_id}` | List shared patients or view full shared record (`403` if unshared) | `doctor` | `doctor/DashboardPage`, `PatientsPage`, `PatientDetailPage` |
| `POST` | `/api/reports/upload` | Upload PDF/image (`<=20MB`) and persist metadata | `patient` | `patient/ReportsPage` (`api.uploadReport`) |
| `POST` | `/api/reports/{report_id}/analyze` | Analyze stored report via Gemini Interactions API | `patient` or shared `doctor` | `patient/ReportsPage` (`api.analyzeReport`) |
| `GET` / `DELETE` | `/api/reports`, `/reports/{id}`, `/reports/{id}/file` | List, fetch, download/preview, or delete reports | Owner or shared `doctor` | `ReportsPage`, `PatientDetailPage` |
| `GET` / `POST` / `DELETE` | `/api/chat/conversations`, `/conversations/{id}` | List, create, read messages, or delete chat threads | Authenticated | `ChatPage` |
| `POST` | `/api/chat/conversations/{id}/messages` | Send turn to Gemini chat with health context & bilingual DB persistence | Authenticated | `ChatPage` (`api.sendMessage`) |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/appointments`, `/appointments/{id}` | List, book (with payment sim), update status, or delete visit | `GET/PUT/DELETE`: participant; `POST`: `patient` | `patient/CarePage`, `PatientDashboard`, `DoctorDashboard` |
| `GET` | `/api/clinical/specialties`, `/guidelines`, `/references` | Browse/filter specialties, guidelines, and 16 clinical refs | Public | `ReferencesPage`, `SurgicalTipsPage`, `ForumPage`, `CommunityPage` |
| `GET` / `POST` | `/api/clinical/surgical-tips`, `/surgical-tips/{id}/bookmark` | Read tips (`Authenticated`) / toggle bookmark (`doctor`) | Auth / `doctor` | `doctor/SurgicalTipsPage` |
| `GET` | `/api/clinical/bundle` | Public educational offline cache bundle (no private data) | Public | `ConnectivityContext` (`api.getClinicalBundle`) |
| `GET` | `/api/mentor/samples`, `/history` | Educational demo cases & physician's saved mentor runs | `doctor` | `doctor/MentorPage` |
| `POST` | `/api/mentor/analyze` | Upload & run 6-card Consultant Mentor Gemini analysis | `doctor` | `doctor/MentorPage` (`api.analyzeMentorReport`) |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/forum/posts`, `/posts/{id}` | Doctors-only clinical forum post CRUD | `doctor` | `doctor/ForumPage` |
| `POST` | `/api/forum/posts/{id}/comments`, `/upvote` | Add clinical comment or toggle post upvote | `doctor` | `doctor/ForumPage` |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/community/posts`, `/posts/{id}` | Public health community posts | Authenticated | `patient/CommunityPage` *(see Section 7 for `update` mismatch)* |
| `POST` | `/api/community/posts/{id}/comments`, `/like`, `/report` | Comment, like, or flag inappropriate post | Authenticated | `patient/CommunityPage` *(see Section 7 for `/report` mismatch)* |
| `POST` / `GET` / `DELETE` | `/api/qr/tokens`, `/tokens/{token_id}` | Patient issues, lists/audits, or revokes SHA-256 QR token | `patient` | `QrSharePage` *(see Section 7 for `/sessions` mismatch)* |
| `POST` / `GET` | `/api/qr/access`, `/reports/{id}/file` | Doctor redeems token (`body: {token}`) & reads scoped file (`X-QR-Token`) | `doctor` | `PatientsPage` *(see Section 7 for `/redeem` mismatch)* |

---

## 7. Verified Status Matrix (Implemented, Tested, Incomplete & Mismatches)

To ensure accurate onboarding, **do not assume a UI screen works merely because files exist**:

### Verified & Passing (Backend Tests + Vite Production Build)
- Authentication, JWT isolation, empty profiles for new users, `patient_demo` / `doctor_demo` seeding (`seed_data.py` verified idempotent).
- Patient health CRUD (`conditions`, `medications`, `allergies`, `vitals`), Doctor persistent record sharing (`403` before share → `200` after share), Appointments + consultation fee snapshot + `simulated_demo_only` payment markers, Doctor credential upload (`pending` manual state).
- File upload validation & disk retrieval, Clinical knowledge endpoints (`/api/clinical/*`), Doctor Forum CRUD, Patient Community backend endpoints, QR backend lifecycle (`/api/qr/tokens`, `/access`, SHA-256 hashing, revocation `403`, expiry `403`).
- `google-genai==3.6.1` Interactions API migration, `GEMINI_API_KEY` authoritativeness over `GOOGLE_API_KEY`, single-call `{ar, en}` report/chat storage, preservation of prior `Analysis` on failure, strict timeouts (`3s` health, `30s` upload, `45s` chat, `90s` report, `attempts=1`), and Vite production build (`1672` modules). *(AI tests used mocked SDK responses/timeouts.)*

### Verified Issues / Gaps Requiring Coordination
1. **Frontend `client.js` vs. Backend Route Mismatches (4 broken UI actions in browser):**
   - `QrSharePage.jsx` calls `api.listQrTokens`, `api.createQrToken`, `api.revokeQrToken`, whereas `client.js` exports `listQrSessions` (`/api/qr/sessions`), `createQrSession`, `revokeQrSession`, while `qr.py` serves **`/api/qr/tokens`**.
   - `PatientsPage.jsx` calls `api.redeemQrToken(token)` and `api.fetchQrReportBlob(reportId, token)`, whereas `client.js` sends `GET /api/qr/redeem/{token}` and omits `fetchQrReportBlob`, while `qr.py` serves **`POST /api/qr/access`** and **`GET /api/qr/reports/{id}/file`**.
   - `CommunityPage.jsx` calls `api.updateCommunityPost()` (missing from `client.js`) and `api.reportCommunityPost()` (named `flagCommunityPost` hitting `/flag` in `client.js`, whereas `community.py` serves **`/report`**).
2. **`mentor.py` Error Persistence:** Failed Mentor Mode uploads set `Report.status = "error"` without saving `Report.last_error_json` (unlike patient `reports.py`).
3. **Live Gemini `gemini-3.8-flash` Availability:** Isolated diagnostic checks returned upstream HTTP `503` (`"gemini-3.8-flash is currently experiencing high demand"`) on both `client.interactions.create()` and `client.models.generate_content()`, so live AI responses remain unverified under current Google API load.
4. **Browser E2E UI Audit:** Interactive browser testing across RTL/LTR layouts, `sw.js` offline DevTools caching, and live camera QR scanning has not yet been executed interactively.

---

## 8. Local Startup Reference

**One-Click Demo Startup (Windows):**
```powershell
.\start_medconnect.bat
```

**Manual Startup:**
```powershell
# Terminal 1 — Backend (:8000)
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend (:5173)
cd frontend
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend Swagger Docs: `http://127.0.0.1:8000/docs`
- Backend Health Check: `http://127.0.0.1:8000/api/health`
