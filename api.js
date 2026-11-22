/* =====================================================================
   api.js  —  MedConnect ApiService layer (offline-first)
   ---------------------------------------------------------------------
   Exposes a single global:  window.ApiService

   Responsibilities:
     1. localStorage CRUD  — sessions, appointments, doctor credentials,
        per-doctor consultation fees (all keys documented below).
     2. Gemini API hook    — gemini-2.5-flash integration for the
        Consultant Mentor Mode (11-step system prompt). When the API
        key is absent or the network is offline, it AUTOMATICALLY falls
        back to the bundled mock analysis (MCData.mentorAnalysis).
     3. Offline fallbacks  — lightweight inline SVG generators for
        icons and QR codes used when the CDN scripts are unreachable.

   Every function below has an inputs/outputs comment block.
   ===================================================================== */
window.ApiService = (function () {
  "use strict";

  /* ===================================================================
   * SECTION A — localStorage KEY CONSTANTS
   * -------------------------------------------------------------------
   * Centralising keys prevents typos and makes data migration trivial.
   * Each key is namespaced under "mc:" so it never clashes with other
   * apps on the same origin.
   * =================================================================== */
  var KEYS = {
    SESSION: "mc:session", // current authenticated session {role,user,...}
    APPOINTMENTS: "mc:appointments", // array of patient bookings
    DOCTOR_CREDS: "mc:doctorCreds", // verification credentials (demo)
    DOCTOR_FEES: "mc:doctorFees", // map doctorId -> consultationFee
    USER_PAYMENT: "mc:userPayment", // saved patient payment method
  };

  /* Internal: safe JSON parse (never throws). */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  /* Internal: safe JSON write (never throws). */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ===================================================================
   * SECTION B — SESSION CRUD
   * -------------------------------------------------------------------
   * The session object shape:
   *   { authState, role, primaryRole, user:{name,email},
   *     doctorCreds, doctorVerified, lang }
   * The store in app.js calls these to persist/restore state.
   * =================================================================== */

  /* getSession() -> object|null  : restore last session (auto-login). */
  function getSession() {
    return read(KEYS.SESSION, null);
  }

  /* saveSession(state) -> bool  : persist the full session object. */
  function saveSession(state) {
    return write(KEYS.SESSION, state);
  }

  /* clearSession() -> bool  : wipe session (sign out). */
  function clearSession() {
    try {
      localStorage.removeItem(KEYS.SESSION);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ===================================================================
   * SECTION C — APPOINTMENTS CRUD  (patient bookings)
   * -------------------------------------------------------------------
   * Booking object shape:
   *   { id, doctorId, patientName:{en,ar}, time:{en,ar}, date:{en,ar},
   *     type:"in-person"|"video", fee:{en,ar}, notes:string,
   *     status:{en,ar} }
   * Saved by the Booking Modal (app.js). Read by PatientHome and
   * DoctorHome schedules.
   * =================================================================== */

  /* getAppointments() -> array  : all stored bookings (empty array if none). */
  function getAppointments() {
    return read(KEYS.APPOINTMENTS, []);
  }

  /* saveAppointment(booking) -> array  : append a booking, return new list.
   * Input:  booking object (see shape above)
   * Output: the full updated appointments array. */
  function saveAppointment(booking) {
    var list = getAppointments();
    list.unshift(booking); // newest first
    write(KEYS.APPOINTMENTS, list);
    return list;
  }

  /* ===================================================================
   * SECTION D — DOCTOR CREDENTIALS  (verification flow)
   * -------------------------------------------------------------------
   * doctorCreds shape:
   *   { license, specialty, yearsExp, clinic, fileName }
   * =================================================================== */
  function getDoctorCreds() {
    return read(KEYS.DOCTOR_CREDS, null);
  }
  function saveDoctorCreds(creds) {
    return write(KEYS.DOCTOR_CREDS, creds);
  }

  /* getUserPayment() -> {type, detail, verified}|null
   * Read the patient's saved default payment method. */
  function getUserPayment() {
    var method = read(KEYS.USER_PAYMENT, null);
    if (!method || (method.type !== "card" && method.type !== "paypal") ||
        typeof method.detail !== "string" || typeof method.verified !== "boolean") {
      return null;
    }
    return method;
  }

  /* saveUserPayment(methodObj) -> saved object|null
   * Stores only the supported payment-method shape. */
  function saveUserPayment(methodObj) {
    if (!methodObj || (methodObj.type !== "card" && methodObj.type !== "paypal") ||
        typeof methodObj.detail !== "string" || !methodObj.detail.trim()) {
      return null;
    }
    var saved = {
      type: methodObj.type,
      detail: methodObj.detail.trim(),
      verified: !!methodObj.verified,
    };
    return write(KEYS.USER_PAYMENT, saved) ? saved : null;
  }

  /* ===================================================================
   * SECTION E — PER-DOCTOR CONSULTATION FEE  (editable in DoctorProfile)
   * -------------------------------------------------------------------
   * Stored as a map: { "d1": {en:"150 SAR",ar:"150 ريال"}, ... }
   * getDoctorFee merges stored fees over MCData.doctors defaults so a
   * doctor's saved edit shows on every DoctorCard everywhere.
   * =================================================================== */

  /* getDoctorFees() -> object  : the whole fees map. */
  function getDoctorFees() {
    return read(KEYS.DOCTOR_FEES, {});
  }

  /* saveDoctorFee(doctorId, fee) -> bool
   * Input:  doctorId (string), fee ({en,ar} bilingual string)
   * Output: true if persisted. */
  function saveDoctorFee(doctorId, fee) {
    var fees = getDoctorFees();
    fees[doctorId] = fee;
    return write(KEYS.DOCTOR_FEES, fees);
  }

  /* getDoctorFee(doctorId) -> {en,ar}
   * Returns the stored fee for a doctor, or the default from MCData. */
  function getDoctorFee(doctorId) {
    var fees = getDoctorFees();
    if (fees[doctorId]) return fees[doctorId];
    var doc = window.MCData && window.MCData.getDoctor(doctorId);
    return doc ? doc.consultationFee : { en: "—", ar: "—" };
  }

  /* ===================================================================
   * SECTION F — GEMINI API HOOK  (gemini-2.5-flash)
   * -------------------------------------------------------------------
   * The Consultant Mentor Mode asks the model to read an uploaded report
   * and return a JSON object matching MCData.mentorAnalysis shape.
   *
   * GEMINI_API_KEY: set to a real key to enable live AI calls. Leave
   * empty ("") to always use the bundled offline mock — the app then
   * works 100% offline with zero configuration.
   * =================================================================== */
  var GEMINI_API_KEY = ""; // <-- paste a key here to enable live Gemini
  var GEMINI_MODEL = "gemini-2.5-flash";
  var GEMINI_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent";

  /* The 11-step Consultant Mentor system prompt. Each step maps to one
   * of the six clinical cards (+ quiz). Sent as the system instruction. */
  var MENTOR_SYSTEM_PROMPT = [
    "You are a senior consultant acting as a clinical mentor for a junior doctor.",
    "STEP 1 — PATHOPHYSIOLOGY: explain the normal physiology AND the pathology present in this report, separately.",
    "STEP 2 — DIFFERENTIAL DIAGNOSIS: list ranked differentials with a probability percentage and a severity label for each.",
    "STEP 3 — ACTIONABLE DECISION: state precisely when to intervene and when to observe, with time thresholds.",
    "STEP 4 — GUIDELINE REFERENCES: cite the relevant guideline (NICE/RCOG/ACOG/FIGO/ESHRE) with section numbers and list 3-4 common pitfalls.",
    "STEP 5 — CLINICAL PEARLS: give 3 concise, memorable pearls a registrar would use on call.",
    "STEP 6 — PATIENT COMMUNICATION SCRIPT: provide a simple, empathetic bilingual (English + Arabic) explanation a patient can understand.",
    "STEP 7 — BOARD SELF-QUIZ: write 3 single-best-answer MCQs testing the key teaching point, each with 4 options, the correct index, and a one-line rationale.",
    "STEP 8 — OUTPUT FORMAT: return STRICT JSON only with keys: reportTitle, reportType, guidelines[], pathophysiology{physiology,pathology}, differentials[{dx,probability,severity}], decision{intervene,observe}, pitfalls{refs,pitfalls[]}, pearls{pearls[],patientScript{en,ar}}, quiz[{q,options[],correct,rationale}].",
    "STEP 9 — SAFETY: if the report suggests an emergency, lead the Actionable Decision with 'EMERGENCY:'.",
    "STEP 10 — CITATION HONESTY: never invent guideline section numbers; if unsure, write 'refer to latest edition'.",
    "STEP 11 — LANGUAGE: every text field must be bilingual {en, ar}.",
  ].join("\n");

  /* isGeminiAvailable() -> bool
   * True only when an API key is configured AND the browser is online. */
  function isGeminiAvailable() {
    return !!GEMINI_API_KEY && navigator.onLine;
  }

  /* generateMentorAnalysis(reportData) -> Promise<object>
   * Input:  reportData = { fileName, type, preview? } from the upload.
   * Output: a Promise resolving to a mentorAnalysis-shaped object.
   *
   * ONLINE + key:  POSTs to the Gemini endpoint with the 11-step prompt.
   * OFFLINE/no key: resolves immediately with MCData.mentorAnalysis so
   *                 the UI never blocks and works without a network. */
  function generateMentorAnalysis(reportData) {
    // --- Offline / no-key fallback (default path for the demo) ---------
    if (!isGeminiAvailable()) {
      return new Promise(function (resolve) {
        // small artificial delay so the loading state is visible
        setTimeout(function () {
          resolve(window.MCData.mentorAnalysis);
        }, 900);
      });
    }

    // --- Online path: call gemini-2.5-flash ---------------------------
    var userText =
      "Analyze this clinical report and produce the structured consultant output.\n" +
      "Report file: " + (reportData && reportData.fileName ? reportData.fileName : "sample CTG") + "\n" +
      "Report type: " + (reportData && reportData.type ? reportData.type : "Cardiotocography (CTG)");

    var body = JSON.stringify({
      systemInstruction: { parts: [{ text: MENTOR_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    return fetch(GEMINI_ENDPOINT + "?key=" + GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        // Gemini returns { candidates:[{ content:{ parts:[{ text }] } }] }
        var text =
          json &&
          json.candidates &&
          json.candidates[0] &&
          json.candidates[0].content &&
          json.candidates[0].content.parts &&
          json.candidates[0].content.parts[0].text;
        if (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            return window.MCData.mentorAnalysis; // malformed JSON -> fallback
          }
        }
        return window.MCData.mentorAnalysis;
      })
      .catch(function () {
        // Network error -> graceful offline fallback
        return window.MCData.mentorAnalysis;
      });
  }

  /* clinicalSearch(query, guidelineFilters) -> Promise<array>
   * Input:  query (string), guidelineFilters (string[] of guideline codes)
   * Output: Promise resolving to filtered clinicalRefs from MCData.
   * (Stubbed locally; wire to Gemini for semantic search if desired.) */
  function clinicalSearch(query, guidelineFilters) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var q = (query || "").toLowerCase();
        var matched = window.MCData.clinicalRefs.filter(function (r) {
          var txt = (r.title.en + r.summary.en).toLowerCase();
          return q.split(/\s+/).some(function (w) {
            return w.length > 3 && txt.indexOf(w) > -1;
          });
        });
        if (!matched.length) matched = window.MCData.clinicalRefs.slice();
        if (guidelineFilters && guidelineFilters.length) {
          var f = matched.filter(function (r) {
            return r.guidelines && r.guidelines.some(function (g) {
              return guidelineFilters.indexOf(g) > -1;
            });
          });
          resolve(f.length ? f : matched);
        } else {
          resolve(matched);
        }
      }, 700);
    });
  }

  /* ===================================================================
   * SECTION G — OFFLINE FALLBACKS  (icons + QR)
   * -------------------------------------------------------------------
   * Lightweight inline SVG generators used by the Icon component and
   * the QR modal when their CDN scripts (lucide / qrcodejs) are not
   * reachable. These keep the UI visually intact offline.
   * =================================================================== */

  /* iconFallbackSvg(name) -> string
   * Input:  name (lucide icon name, e.g. "HeartPulse")
   * Output: an inline SVG string (a rounded square + first-letter glyph).
   *         Lightweight by design — not pixel-perfect, just recognisable. */
  function iconFallbackSvg(name) {
    var letter = (name || "I").charAt(0).toUpperCase();
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="18" height="18" rx="4"/>' +
      '<text x="12" y="16" font-size="11" font-family="system-ui,sans-serif" text-anchor="middle" fill="currentColor" stroke="none">' +
      letter +
      "</text></svg>"
    );
  }

  /* qrFallbackSvg(text, size) -> string
   * Input:  text (the URL/data to encode), size (px)
   * Output: an inline SVG string rendering a deterministic QR-like grid
   *         derived from a hash of `text`. Not scannable, but visually
   *         communicates "a code is here" when the real QR lib is offline.
   *         Includes corner finder squares for the QR silhouette. */
  function qrFallbackSvg(text, size) {
    size = size || 180;
    var cells = 21; // QR version 1 grid
    // simple deterministic hash -> bit grid
    var seed = 0;
    var s = String(text || "");
    for (var i = 0; i < s.length; i++) {
      seed = (seed * 31 + s.charCodeAt(i)) & 0xffffffff;
    }
    var rng = seed;
    function next() {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      return rng / 0x7fffffff;
    }
    var unit = size / cells;
    var rects = "";
    for (var y = 0; y < cells; y++) {
      for (var x = 0; x < cells; x++) {
        // leave finder corners clear
        var corner =
          (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
        if (corner) continue;
        if (next() > 0.5) {
          rects +=
            '<rect x="' + (x * unit).toFixed(1) + '" y="' + (y * unit).toFixed(1) +
            '" width="' + unit.toFixed(1) + '" height="' + unit.toFixed(1) + '"/>';
        }
      }
    }
    // finder squares
    function finder(fx, fy) {
      return (
        '<rect x="' + (fx * unit).toFixed(1) + '" y="' + (fy * unit).toFixed(1) +
        '" width="' + (7 * unit).toFixed(1) + '" height="' + (7 * unit).toFixed(1) +
        '" fill="currentColor" stroke="none"/>' +
        '<rect x="' + ((fx + 1) * unit).toFixed(1) + '" y="' + ((fy + 1) * unit).toFixed(1) +
        '" width="' + (5 * unit).toFixed(1) + '" height="' + (5 * unit).toFixed(1) +
        '" fill="#fff" stroke="none"/>' +
        '<rect x="' + ((fx + 2) * unit).toFixed(1) + '" y="' + ((fy + 2) * unit).toFixed(1) +
        '" width="' + (3 * unit).toFixed(1) + '" height="' + (3 * unit).toFixed(1) +
        '" fill="currentColor" stroke="none"/>'
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 ' + size + " " + size + '" fill="currentColor">' +
      rects +
      finder(0, 0) +
      finder(cells - 7, 0) +
      finder(0, cells - 7) +
      "</svg>"
    );
  }

  /* ---- Public surface ---------------------------------------------- */
  return {
    KEYS: KEYS,
    // session
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    // appointments
    getAppointments: getAppointments,
    saveAppointment: saveAppointment,
    // doctor creds
    getDoctorCreds: getDoctorCreds,
    saveDoctorCreds: saveDoctorCreds,
    // patient payment method
    getUserPayment: getUserPayment,
    saveUserPayment: saveUserPayment,
    // doctor fees
    getDoctorFees: getDoctorFees,
    saveDoctorFee: saveDoctorFee,
    getDoctorFee: getDoctorFee,
    // gemini
    MENTOR_SYSTEM_PROMPT: MENTOR_SYSTEM_PROMPT,
    GEMINI_MODEL: GEMINI_MODEL,
    isGeminiAvailable: isGeminiAvailable,
    generateMentorAnalysis: generateMentorAnalysis,
    clinicalSearch: clinicalSearch,
    // offline fallbacks
    iconFallbackSvg: iconFallbackSvg,
    qrFallbackSvg: qrFallbackSvg,
  };
})();
