# MedConnect — Team Onboarding & Developer Guide

Welcome to **MedConnect**. This guide helps any contributor—including new Computer Science teammates—understand folder ownership, run the stack locally on Windows, create clean feature branches, and coordinate safely without breaking teammates' work.

> **Which Version Should You Edit?**  
> - Edit **`frontend/`** and **`backend/`**.  
> - **Do not develop new features inside the root-level legacy files** (`index.html`, `styles.css`, `data.js`, `api.js`, `app.js`). Those belong to the original browser-only prototype kept for historical reference.

---

## 1. What Each Folder Does

```text
MedConnect/
├── frontend/                   # Active UI (React 18 + Vite + Tailwind CSS v3 + React Router 7)
│   ├── public/sw.js            # Offline educational bundle cache (excludes private patient data)
│   └── src/
│       ├── api/client.js       # Fetch/XHR API client, timeouts (3s/15s/30s/48s/93s), bilingual error handling
│       ├── context/            # AuthContext (JWT), LangContext (AR/EN + RTL/LTR), ConnectivityContext (/api/health)
│       ├── locales/            # English (en.js) & Arabic (ar.js) UI dictionaries
│       ├── layouts/            # AuthLayout & responsive AppLayout with connectivity banner
│       ├── components/         # Shared UI: FileUpload, ReportAnalysisCard, ChatInterface, Toast, OfflineAiAlert
│       └── pages/              # patient/ (7 pages), doctor/ (8 pages), LoginPage, RegisterPage
│
├── backend/                    # Active API Server (Python 3.11+ / 3.13 + FastAPI + SQLAlchemy + SQLite)
│   ├── app/
│   │   ├── main.py             # FastAPI app setup, CORS, startup init_db(), /api/health
│   │   ├── config.py           # Reads backend/.env (GEMINI_API_KEY authoritative) & timeouts
│   │   ├── auth.py             # bcrypt password hashing + JWT verification & role guards
│   │   ├── database.py         # SQLite engine, safe column migrations, idempotent seeding call
│   │   ├── models.py           # 29 SQLite ORM tables
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed_data.py        # Demo users, clinical refs, guidelines, tips, mentor samples, forum/community seed
│   │   ├── services/           # file_service.py (disk upload validation) & gemini_service.py (google-genai 3.6.1)
│   │   └── routers/            # 11 REST routers (auth, patients, doctors, reports, chat, appointments, clinical, mentor, forum, community, qr)
│   ├── requirements.txt        # Python dependencies (pins google-genai==3.6.1)
│   └── .env.example            # Template for backend/.env
│
├── start_medconnect.bat        # Windows one-click demo launcher (:8000 backend + :5173 frontend)
├── ARCHITECTURE.md             # Complete file, DB schema (29 tables), API, and data-flow guide
├── TEAM_GUIDE.md               # This onboarding & collaboration guide
└── README.md                   # GitHub entry point & installation guide
```

---

## 2. Team Responsibility Map & Evidence Basis

### Sources of Truth (Distinguishing Git Commits vs. Role Clues)
- **Verified Git Commits (`git log --all`):**
  - `Ahmed Esam`: Initial repository creation (`5cd9c91` on `origin/master`), root prototype upload (`index.html`, `styles.css`, `data.js`, `api.js`, `app.js`), and PR `#1` merge (`f80fe7f`).
  - `Mustafa Eskander` (`Mostafa-Esckader`): PR `#2` `README.md` (`0fb9dbb`, `bafec50`) and `Alpha version` (`d123c74`, adding booking payment state and `BookingModal` / profile updates).
  - `alshalfiabdullah352-A` (Abdullah Al-Shalafi): Major `data.js` clinical expansion (`b2598da` — guidelines, `clinicalRefs`, `surgicalTips`, 3 `mentorAnalysis` samples, and `validate()`).
  - `iopd678` (Anas Al-Mahdi): Initial comprehensive `README.md` (`1ea42f3`) documenting the project vision and the 5 team roles.
  - *Note on Ahmed Ameen:* While `api.js` was pushed inside the initial combined commit by `Ahmed Esam`, the original `README.md` (`1ea42f3`) explicitly assigns Gemini AI & `api.js` integration to Ahmed Ameen; we document that role clue transparently without inventing separate commit authorship.

### Individual Ownership & Handover Guide

| Member | Historical Work (Legacy Root) | Active Files in New Architecture | Status Today (Verified) | Recommended Next Tasks |
| :--- | :--- | :--- | :--- | :--- |
| **Ahmed Ameen** *(AI & API Integration)* | `api.js` Gemini hook & `MENTOR_SYSTEM_PROMPT` | `backend/app/services/gemini_service.py`, `backend/app/config.py`, `backend/app/routers/reports.py`, `backend/app/routers/chat.py`, `frontend/src/api/client.js`, `ChatPage.jsx`, `ChatInterface.jsx`, `OfflineAiAlert.jsx` | Migrated to `google-genai==3.6.1` Interactions API (`client.interactions.create()`), bilingual reports/chat, `45s`/`90s` timeouts, 9 error categories | 1. Fix `client.js` JSON `retryDelay` extraction in `gemini_service.py` (uses `exc.body` rather than `exc.details`).<br>2. Re-test live Gemini PDF/image/chat once `gemini-3.8-flash` upstream `503` clears.<br>3. Help coordinate `client.js` QR/Community method fixes below. |
| **Mostafa Eskander** *(Doctor/Patient Workflows, Mentor, Appointments & QR)* | `app.js` patient/doctor flows, Consultant Mentor Mode, booking & payment methods, QR modal, verification | `frontend/src/pages/patient/DashboardPage.jsx`, `CarePage.jsx`, `QrSharePage.jsx`, `frontend/src/pages/doctor/DashboardPage.jsx`, `PatientsPage.jsx`, `PatientDetailPage.jsx`, `MentorPage.jsx`, `ProfilePage.jsx`, `backend/app/routers/appointments.py`, `doctors.py`, `mentor.py`, `qr.py` | Core workflows, Mentor 6-card UI, fee snapshot, payment simulation (`card_sim`/`paypal_sim`), license verification (`pending`), and backend QR routes are restored | 1. Reconnect `client.js` ↔ `QrSharePage.jsx` (`/api/qr/tokens`) & `PatientsPage.jsx` (`POST /api/qr/access` + `fetchQrReportBlob`).<br>2. Persist `last_error_json` on failure in `backend/app/routers/mentor.py`.<br>3. QA doctor verification & QR camera scan in live browser. |
| **Ahmed Esam** *(UI Styling, Forum & Community)* | Repository foundation, `styles.css`, `DoctorForum`, `PatientCommunity`, layout shell | `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/src/layouts/AppLayout.jsx`, `AuthLayout.jsx`, `frontend/src/components/Toast.jsx`, `frontend/src/pages/doctor/ForumPage.jsx`, `frontend/src/pages/patient/CommunityPage.jsx`, `backend/app/routers/forum.py`, `community.py` | Visual theme, RTL/LTR layout shell, connectivity banners, Forum CRUD/upvotes, and Community backend endpoints are restored | 1. Fix `CommunityPage.jsx` ↔ `client.js` mismatch (`updateCommunityPost` missing; `reportCommunityPost` vs `flagCommunityPost` hitting `/flag` instead of `/report`).<br>2. Run full responsive + RTL visual check across all pages in Chrome. |
| **Abdullah Al-Shalafi** *(Clinical Data, DB Schema & Localization)* | `data.js` (`DEMO_ACCOUNTS`, 14 specialties, 14 guidelines, 16 `clinicalRefs`, 6 `surgicalTips`, 3 `mentorAnalysis*`) | `backend/app/models.py`, `schemas.py`, `database.py`, `seed_data.py`, `backend/app/routers/clinical.py`, `patients.py`, `frontend/src/pages/patient/ProfilePage.jsx`, `frontend/src/pages/doctor/ReferencesPage.jsx`, `SurgicalTipsPage.jsx`, `frontend/src/locales/en.js`, `ar.js` | All clinical catalogs, Patient Profile CRUD, idempotent `seed_all()`, and offline educational bundle + `sw.js` caching are restored | 1. Audit medical Arabic/English wording in `locales/ar.js` & `en.js`.<br>2. Verify `seed_data.py` schema alignment whenever new columns are added to `models.py`.<br>3. Test offline clinical browsing with DevTools offline mode. |
| **Anas Al-Mahdi** *(Lead Coordination & Documentation)* | Project direction, original `README.md`, clinical alignment | `README.md`, `ARCHITECTURE.md`, `TEAM_GUIDE.md`, `start_medconnect.bat` | Full documentation suite & one-click demo script established | 1. Coordinate fixes for the 4 UI/`client.js` wiring gaps before demo merge.<br>2. Run full end-to-end team QA with live browser & Gemini key.<br>3. Manage PR reviews into integration branch. |

---

## 3. How to Run the Project Locally (Windows)

### Option A: One-Click Demo Script
From the project root (`MedConnect\`):
```powershell
.\start_medconnect.bat
```
This script verifies `backend\venv` and `frontend\node_modules`, starts FastAPI on `127.0.0.1:8000`, waits for `/api/health`, starts Vite on `localhost:5173`, and opens the browser only once both services respond.

### Option B: Manual Startup (Recommended for Coding)

**Terminal 1 — FastAPI Backend:**
```powershell
cd backend
py -3.13 -m venv venv               # First time only (Python >=3.11 required for google-genai==3.6.1)
.\venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env              # First time only — add your own GEMINI_API_KEY inside backend/.env
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
- Swagger API UI: `http://127.0.0.1:8000/docs`
- Health & Timeouts Check: `http://127.0.0.1:8000/api/health`

**Terminal 2 — React + Vite Frontend:**
```powershell
cd frontend
npm install                         # First time only
npm run dev
```
- App URL: `http://localhost:5173`

> **Important `.env` Rule:** `GEMINI_API_KEY` inside `backend/.env` is the single authoritative key source (never put API keys in `frontend/`). Always restart `uvicorn` after editing `backend/.env` because `--reload` only watches `.py` files.

---

## 4. Git Workflow: Branches, Commits & Merging

### Current Repository Branches
- `main`: Preserves the original browser-only prototype. **Do not push breaking full-stack edits directly to `main` unless coordinated by the lead.**
- `medconnect-functional-rebuild`: Initial React + FastAPI rebuild baseline.
- `feature/restore-legacy-modules`: Current active development branch containing restored clinical modules, `google-genai==3.6.1` Interactions API migration, strict timeouts, and onboarding docs.

### Day-to-Day Workflow for Teammates
1. **Sync before starting:**
   ```powershell
   git checkout feature/restore-legacy-modules
   git pull origin feature/restore-legacy-modules
   ```
2. **Create a scoped feature branch:**
   ```powershell
   git checkout -b feature/<your-short-task>
   # Examples: feature/fix-qr-client-routes, feature/community-ui-fix, feature/mentor-error-log
   ```
3. **Verify before committing:**
   - Backend imports/tests pass cleanly without errors.
   - Frontend compiles cleanly: `cd frontend && npm run build`.
   - `git status` shows **no** `.env`, `.db`, `uploads/`, `venv/`, or `node_modules/` files staged.
4. **Push and open a Pull Request:**
   ```powershell
   git push -u origin feature/<your-short-task>
   ```
   Request review from at least one teammate working on the opposite layer (e.g., Frontend PR reviewed by Backend owner) before merging.

---

## 5. Shared Files Requiring Coordination

Always announce in team chat before editing these shared contracts so two branches do not conflict or break each other:

1. `backend/app/models.py` & `backend/app/database.py` — ORM schema & `ALTER TABLE` migrations.
2. `backend/app/schemas.py` — Pydantic request/response contracts.
3. `backend/app/main.py` — Router registration & global exception format.
4. `frontend/src/api/client.js` — Shared API URLs, timeouts, and error parser used by every page.
5. `frontend/src/App.jsx` — Client route paths and role guards.
6. `frontend/src/locales/en.js` & `frontend/src/locales/ar.js` — Shared bilingual UI keys.

---

## 6. Files That Must NEVER Be Committed

Already listed in `.gitignore` — double-check `git status` before every commit:
- **`backend/.env`** (contains `GEMINI_API_KEY` and `SECRET_KEY` — committing leaks credentials!)
- **`backend/medconnect.db` / `*.db` / `*.sqlite3`** (local user/patient test databases)
- **`backend/app/storage/uploads/`** (uploaded PDFs and medical images)
- **`backend/venv/`**, **`__pycache__/`**, **`*.pyc`**
- **`frontend/node_modules/`**, **`frontend/dist/`**
- **`*.log`**
