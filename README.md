# MedConnect — Bilingual Healthcare Platform (English / العربية)

MedConnect is a full-stack bilingual healthcare prototype built with **React + Vite**, **Python + FastAPI**, **SQLite**, and the **Google Gen AI SDK (`google-genai==3.6.1`, Interactions API)**. It provides separate **Patient** and **Doctor** portals, isolated health records, real PDF/medical image uploads, context-aware Gemini AI analysis and chat, Consultant Mentor Mode, clinical guidelines/surgical tips, a Doctor Forum, a Patient Community, and scoped temporary QR record sharing.

> **Which App Is Active?**  
> - **Active Full-Stack Application:** Lives inside [`frontend/`](frontend/) and [`backend/`](backend/). All new development happens here.  
> - **Original Legacy Prototype:** Root-level [`index.html`](index.html), [`styles.css`](styles.css), [`data.js`](data.js), [`api.js`](api.js), and [`app.js`](app.js) are preserved as historical reference for the original browser-only MVP.

---

## Key Features

- **Separate Patient & Doctor Accounts:** `bcrypt` password hashing + JWT authentication (`backend/app/auth.py`). Newly registered users start with completely empty, isolated records. Demo accounts hold clearly badged fictional data.
- **Personal Health Profiles:** Patients manage conditions, medications, allergies, and vitals in SQLite (`backend/app/routers/patients.py`).
- **Real PDF & Medical Image Uploads:** Validates `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp` up to 20 MB, persists files on disk (`backend/app/storage/uploads/`), and supports authorized preview/download.
- **Gemini AI Report Analysis & Context-Aware Chat:** Backend service (`backend/app/services/gemini_service.py`) sends uploaded file bytes and health context to Gemini via `google-genai==3.6.1` (`client.interactions.create()`), generating both Arabic and English results in a single call.
- **Reliability & Timeouts:** Live `/api/health` startup check (`3s` timeout), strict deadlines (`30s` upload, `45s` chat, `90s` report analysis), 9 bilingual failure categories without faking AI responses, and automatic preservation of previously saved analyses when a re-analysis fails.
- **Consultant Mentor Mode (Doctors):** 6-card structured clinical reasoning (real uploaded reports via Gemini + 3 bundled educational demo cases: CTG, ECG, Blood Test) with interactive MCQ self-quiz.
- **Clinical Knowledge & Offline Educational Cache:** 14 specialties, 14 guideline organizations, 16 clinical references, and 6 surgical tips cached via `/api/clinical/bundle` and Service Worker (`frontend/public/sw.js`) without exposing private patient records.
- **Care Team, Sharing, Community & QR Backend:** Explicit patient-to-doctor access sharing, appointment booking with consultation fees and simulated payment status, Doctors-only Forum, Patient Community, and SHA-256 hashed temporary QR access backend.
- **Bilingual UI (Arabic RTL / English LTR):** Dynamic `<html dir>` switching with `Cairo` (AR) and `Inter` (EN) typography.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18.3, Vite 6, React Router DOM 7, Tailwind CSS v3, Lucide Icons, `qrcode`, `jsqr` |
| **Backend** | Python 3.11+ (`3.13` recommended), FastAPI 0.115.6, Uvicorn, SQLAlchemy 2.0, Pydantic v2, `python-jose`, `bcrypt` |
| **Database & Storage** | SQLite (29 ORM tables in `backend/app/models.py`) + local disk file storage |
| **AI SDK** | Official `google-genai==3.6.1` Python SDK (`client.interactions.create()`, `GEMINI_MODEL=gemini-3.8-flash`) |

---

## Installation & Local Setup (Windows)

### Prerequisites
- **Python 3.11+** (`py -3.13 --version` recommended because `google-genai>=2.x` requires Python `>=3.11`)
- **Node.js 18+** & **npm** (`node --version`, `npm --version`)

### 1. Backend Installation & Gemini Configuration
```powershell
cd backend
py -3.13 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` and set your API key:
```env
SECRET_KEY=medconnect-local-dev-secret-key-change-me
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
DATABASE_URL=sqlite:///./medconnect.db
UPLOAD_DIR=app/storage/uploads
MAX_UPLOAD_SIZE=20971520
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Configuration Notes:**
> - `GEMINI_API_KEY` in `backend/.env` is authoritative on the backend and is never sent to the browser. Any `GOOGLE_API_KEY` env var is ignored.
> - **Restart the backend (`uvicorn`)** after editing `backend/.env` (`uvicorn --reload` watches `.py` files, not `.env`).

### 2. Frontend Installation
```powershell
cd ..\frontend
npm install
```

### 3. Start the Application

**One-Click Demo Launcher (from repository root):**
```powershell
.\start_medconnect.bat
```

**Or Start Manually in Two Terminals:**
```powershell
# Terminal 1 — Backend (port 8000)
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

- Web App: `http://localhost:5173`
- API Health: `http://127.0.0.1:8000/api/health`
- Swagger API Docs: `http://127.0.0.1:8000/docs`

---

## Demo Accounts

One-click buttons are available on the Sign In screen, or use:

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient_demo` | `demo123` | Fictional sample profile shared with `doctor_demo` (labeled `Demo Data`) |
| **Doctor** | `doctor_demo` | `demo123` | Dr. Layla Al-Harbi with sample shared access to demo patients |

*(Newly registered accounts start empty with isolated data and `verification_status="unverified"` for doctors.)*

---

## Documentation for Developers

- **[ARCHITECTURE.md](ARCHITECTURE.md):** Complete file inventory (active vs. legacy), all 29 SQLite tables, REST endpoint catalog, `google-genai` integration, security boundaries, and 12 data-flow traces.
- **[TEAM_GUIDE.md](TEAM_GUIDE.md):** Team ownership handover map, branch & PR workflow, shared coordination files, and `.gitignore` rules.

---

## Current Limitations & Known Issues

1. **Upstream Gemini `gemini-3.8-flash` Availability:** Diagnostic probes using `client.interactions.create()` and `client.models.generate_content()` currently encounter transient upstream HTTP `503` (`service_unavailable`, high demand) on `gemini-3.8-flash`. Live Gemini AI outputs remain unverified until upstream capacity clears or another active model (e.g. `gemini-3.5-flash-lite`) is configured in `backend/.env`. All AI timeout/error tests ran against mocked SDK responses.
2. **UI-to-Client Naming Mismatches (`frontend/src/api/client.js`):**
   - **QR Sharing (`QrSharePage.jsx`, `PatientsPage.jsx`):** Backend [`qr.py`](backend/app/routers/qr.py) routes (`/api/qr/tokens`, `/api/qr/access`, `/api/qr/reports/{id}/file`) pass backend API tests, but `client.js` currently exposes `listQrSessions` / `redeemQrToken` (`/api/qr/sessions` & `GET /api/qr/redeem/...`) and omits `fetchQrReportBlob`, so QR flows from the React UI need `client.js` alignment before browser use.
   - **Community Edit & Report (`CommunityPage.jsx`):** `CommunityPage.jsx` calls `api.updateCommunityPost` (not yet defined in `client.js`) and `api.reportCommunityPost` (while `client.js` calls `/flag` instead of `community.py`'s `/report`).
3. **`mentor.py` Error Persistence:** Failed Mentor Mode uploads mark `Report.status = "error"` without saving `Report.last_error_json`.
4. **Prototype Scope:** Payment options (`card_sim`, `paypal_sim`) record demonstration status (`simulated_demo_only`) with no real payment gateway, doctor license verification uses manual `pending` review rather than an admin dashboard, and full interactive browser QA across RTL/LTR and offline camera QR scan has not yet been completed.
