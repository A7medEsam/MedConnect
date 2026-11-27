const TOKEN_KEY = 'medconnect_token';
let activeClientLang =
  typeof localStorage !== 'undefined' && localStorage.getItem('medconnect_lang') === 'ar'
    ? 'ar'
    : 'en';

export function setClientLang(lang) {
  activeClientLang = lang === 'ar' ? 'ar' : 'en';
}

export const API_TIMEOUTS = {
  HEALTH_MS: 3000,
  DEFAULT_MS: 15000,
  UPLOAD_MS: 30000,
  CHAT_MS: 48000, // Slightly > 45s backend deadline so structured 504 arrives cleanly first
  REPORT_ANALYZE_MS: 93000, // Slightly > 90s backend deadline
  MENTOR_ANALYZE_MS: 123000, // 30s upload + 90s analysis + 3s margin
};

export const BILINGUAL_FALLBACK_ERRORS = {
  backend_unavailable: {
    category: 'backend_unavailable',
    retryable: true,
    message: {
      ar: 'الخادم غير متصل حالياً. لا يمكن تنفيذ العمليات أو حفظ البيانات حتى يعود الاتصال. تأكد من تشغيل الخادم ثم أعد المحاولة.',
      en: 'The application server is currently unavailable. Operations and saving are disabled until the server reconnects. Please start the backend and retry.',
    },
  },
  request_timeout: {
    category: 'request_timeout',
    retryable: true,
    message: {
      ar: 'استغرق الطلب وقتاً أطول من المسموح. لم تصلنا نتيجة مكتملة. يمكنك المحاولة مرة أخرى.',
      en: 'The request took longer than allowed and did not return a complete result. You can try again.',
    },
  },
  client_abort_timeout: {
    category: 'request_timeout',
    retryable: true,
    message: {
      ar: 'توقف المتصفح عن انتظار الاستجابة بعد انتهاء المهلة المحددة. يمكنك المحاولة مرة أخرى.',
      en: 'The browser stopped waiting after the request deadline elapsed. You can try again.',
    },
  },
  upload_timeout: {
    category: 'request_timeout',
    retryable: true,
    message: {
      ar: 'استغرق رفع الملف وقتاً أطول من المسموح (30 ثانية). تحقق من الاتصال وحجم الملف ثم أعد المحاولة.',
      en: 'File upload exceeded the 30-second deadline. Check your connection and file size, then try again.',
    },
  },
  network_error: {
    category: 'network_error',
    retryable: true,
    message: {
      ar: 'تعذر الاتصال بسبب مشكلة في الشبكة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.',
      en: 'A network error interrupted the request. Please check your connection and try again.',
    },
  },
  service_unavailable: {
    category: 'service_unavailable',
    retryable: true,
    message: {
      ar: 'خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. بياناتك ونتائجك السابقة ما زالت محفوظة.',
      en: 'The AI service is temporarily unavailable. Your saved data and previous results remain safe.',
    },
  },
  invalid_response: {
    category: 'invalid_response',
    retryable: true,
    message: {
      ar: 'تعذر قراءة استجابة صالحة من الخادم. يمكنك المحاولة مرة أخرى.',
      en: 'Could not read a valid response from the server. Please try again.',
    },
  },
};

const KNOWN_DETAIL_TRANSLATIONS = [
  ['invalid credentials', 'اسم المستخدم أو كلمة المرور غير صحيحة.', 'Invalid username or password.'],
  ['incorrect username or password', 'اسم المستخدم أو كلمة المرور غير صحيحة.', 'Invalid username or password.'],
  ['username already', 'اسم المستخدم مسجل مسبقاً.', 'This username is already registered.'],
  ['email already', 'البريد الإلكتروني مسجل مسبقاً.', 'This email address is already registered.'],
  ['report not found', 'التقرير المطلوب غير موجود.', 'The requested report was not found.'],
  ['conversation not found', 'المحادثة المطلوبة غير موجودة.', 'The requested conversation was not found.'],
  ['access denied', 'ليست لديك صلاحية الوصول إلى هذا العنصر.', 'You do not have permission to access this resource.'],
  ['unsupported file', 'صيغة الملف غير مدعومة. الصيغ المقبولة: PDF, PNG, JPG, JPEG, WEBP.', 'Unsupported file format. Accepted formats: PDF, PNG, JPG, JPEG, WEBP.'],
  ['exceeds maximum size', 'حجم الملف يتجاوز الحد الأقصى المسموح (20 ميجابايت).', 'File size exceeds the 20 MB maximum limit.'],
  ['file is empty', 'الملف المختار فارغ.', 'The selected file is empty.'],
  ['authentication required', 'يرجى تسجيل الدخول للمتابعة.', 'Please sign in to continue.'],
  ['invalid or expired', 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.', 'Session expired. Please sign in again.'],
];

function localizePlainDetail(rawText, statusCode) {
  const lower = String(rawText || '').toLowerCase();
  for (const [needle, ar, en] of KNOWN_DETAIL_TRANSLATIONS) {
    if (lower.includes(needle)) {
      return { ar, en };
    }
  }
  if (statusCode === 401) {
    return { ar: 'يرجى التحقق من بيانات الدخول والمحاولة مجدداً.', en: 'Authentication failed. Please check your credentials.' };
  }
  if (statusCode === 403) {
    return { ar: 'غير مصرح بتنفيذ هذا الإجراء.', en: 'You are not authorized to perform this action.' };
  }
  if (statusCode === 404) {
    return { ar: 'العنصر المطلوب غير موجود.', en: 'The requested item was not found.' };
  }
  if (statusCode === 422 || statusCode === 400) {
    return { ar: 'البيانات المدخلة غير صالحة. يرجى المراجعة والمحاولة مرة أخرى.', en: rawText || 'Invalid input provided. Please check and try again.' };
  }
  return {
    ar: 'حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة مرة أخرى.',
    en: rawText || `Request failed (${statusCode})`,
  };
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const backendStatusListeners = new Set();
export function subscribeBackendStatus(fn) {
  backendStatusListeners.add(fn);
  return () => backendStatusListeners.delete(fn);
}

function notifyBackendStatus(reachable) {
  backendStatusListeners.forEach((fn) => {
    try {
      fn(reachable);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export class ApiError extends Error {
  constructor(message, status, data = null, errorInfo = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errorInfo = errorInfo;
  }
}

export function extractErrorInfo(errOrData) {
  if (!errOrData) return null;
  const candidate = errOrData.errorInfo || errOrData.detail || errOrData;
  if (candidate && typeof candidate === 'object' && candidate.message && typeof candidate.message === 'object') {
    return candidate;
  }
  return null;
}

export function getFriendlyErrorMessage(errOrData, lang = 'en') {
  const info = extractErrorInfo(errOrData);
  if (info && info.message) {
    return info.message[lang] || info.message.en || info.message.ar;
  }
  if (errOrData instanceof ApiError && errOrData.status === 0) {
    return BILINGUAL_FALLBACK_ERRORS.backend_unavailable.message[lang] || BILINGUAL_FALLBACK_ERRORS.backend_unavailable.message.en;
  }
  if (typeof errOrData === 'string') {
    const hasArabic = /[\u0600-\u06FF]/.test(errOrData);
    if (lang === 'ar' && !hasArabic) {
      return localizePlainDetail(errOrData, 400).ar;
    }
    return errOrData;
  }
  return lang === 'ar'
    ? 'حدث خطأ ما. يرجى المحاولة لاحقاً.'
    : 'Something went wrong. Please try again later.';
}

function makeStructuredApiError(template, statusCode = 0, rawData = null) {
  const info = {
    category: template.category,
    retryable: template.retryable,
    retry_after_seconds: null,
    message: { ...template.message },
  };
  return new ApiError(info.message[activeClientLang] || info.message.en, statusCode, rawData, info);
}

function parseErrorPayload(data, statusCode, wasJsonResponse = true) {
  const detail = data && typeof data === 'object' ? data.detail : null;
  if (detail && typeof detail === 'object' && detail.message) {
    const msg =
      detail.message[activeClientLang] ||
      detail.message.en ||
      detail.message.ar ||
      `Request failed (${statusCode})`;
    return { message: msg, errorInfo: detail };
  }

  // Non-JSON 500/502/503/504 (commonly returned by Vite dev proxy when FastAPI backend is down)
  if (!wasJsonResponse && (statusCode === 500 || statusCode === 502 || statusCode === 503)) {
    return {
      message: BILINGUAL_FALLBACK_ERRORS.backend_unavailable.message[activeClientLang],
      errorInfo: { ...BILINGUAL_FALLBACK_ERRORS.backend_unavailable },
      isBackendDown: true,
    };
  }
  if (!wasJsonResponse && statusCode === 504) {
    return {
      message: BILINGUAL_FALLBACK_ERRORS.request_timeout.message[activeClientLang],
      errorInfo: { ...BILINGUAL_FALLBACK_ERRORS.request_timeout },
    };
  }

  const rawText =
    (typeof detail === 'string' && detail) ||
    (data && typeof data === 'object' && typeof data.message === 'string' && data.message) ||
    (typeof data === 'string' && data) ||
    '';

  const localized = localizePlainDetail(rawText, statusCode);
  return {
    message: localized[activeClientLang] || localized.en,
    errorInfo: {
      category: statusCode >= 500 ? 'service_unavailable' : 'validation_error',
      retryable: statusCode >= 500,
      message: localized,
    },
  };
}

let onUnauthorizedCallback = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorizedCallback = fn;
}

async function request(path, options = {}) {
  const { timeoutMs = API_TIMEOUTS.DEFAULT_MS, ...fetchOpts } = options;
  const token = getStoredToken();
  const headers = { ...(fetchOpts.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = fetchOpts.body instanceof FormData;
  let body = fetchOpts.body;
  if (!isFormData && body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(path, {
      ...fetchOpts,
      body,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      if (path.includes('/api/health')) {
        notifyBackendStatus(false);
        throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.backend_unavailable, 0);
      }
      throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.client_abort_timeout, 504);
    }
    notifyBackendStatus(false);
    throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.backend_unavailable, 0);
  }
  clearTimeout(timeoutId);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let data = null;
  if (isJson) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (response.ok && isJson) {
    notifyBackendStatus(true);
  }

  if (
    response.status === 401 &&
    !path.includes('/api/auth/login') &&
    !path.includes('/api/auth/register')
  ) {
    setStoredToken(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  if (!response.ok) {
    const parsed = parseErrorPayload(data, response.status, isJson);
    if (parsed.isBackendDown) {
      notifyBackendStatus(false);
    }
    throw new ApiError(parsed.message, response.status, data, parsed.errorInfo);
  }

  // Health endpoint must specifically return FastAPI JSON payload
  if (path.includes('/api/health') && (!isJson || !data || data.status !== 'ok')) {
    notifyBackendStatus(false);
    throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.backend_unavailable, response.status);
  }

  return data;
}

export function uploadFormDataWithProgress(
  path,
  formData,
  onProgress,
  { timeoutMs = API_TIMEOUTS.UPLOAD_MS, onUploadComplete = null, isUploadOnly = true } = {}
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.timeout = timeoutMs;

    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.upload.onload = () => {
      if (onUploadComplete) {
        onUploadComplete();
      }
    };

    xhr.onload = () => {
      const ct = xhr.getResponseHeader('content-type') || '';
      const isJson = ct.includes('application/json');
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText || null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && isJson) {
        notifyBackendStatus(true);
        resolve(data);
      } else {
        if (xhr.status === 401 && onUnauthorizedCallback) {
          setStoredToken(null);
          onUnauthorizedCallback();
        }
        const parsed = parseErrorPayload(data, xhr.status, isJson);
        if (parsed.isBackendDown) {
          notifyBackendStatus(false);
        }
        reject(new ApiError(parsed.message, xhr.status, data, parsed.errorInfo));
      }
    };

    xhr.ontimeout = () => {
      reject(
        makeStructuredApiError(
          isUploadOnly ? BILINGUAL_FALLBACK_ERRORS.upload_timeout : BILINGUAL_FALLBACK_ERRORS.client_abort_timeout,
          504
        )
      );
    };

    xhr.onerror = () => {
      notifyBackendStatus(false);
      reject(makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.backend_unavailable, 0));
    };

    xhr.send(formData);
  });
}

export function uploadFileWithProgress(path, file, onProgress, opts = {}) {
  const formData = new FormData();
  formData.append('file', file);
  return uploadFormDataWithProgress(path, formData, onProgress, opts);
}

export async function fetchAuthorizedBlob(path, extraHeaders = {}) {
  const token = getStoredToken();
  const headers = { ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.UPLOAD_MS);

  let response;
  try {
    response = await fetch(path, { headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.client_abort_timeout, 504);
    }
    notifyBackendStatus(false);
    throw makeStructuredApiError(BILINGUAL_FALLBACK_ERRORS.backend_unavailable, 0);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const ct = response.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    let data = null;
    if (isJson) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }
    const parsed = parseErrorPayload(data, response.status, isJson);
    throw new ApiError(parsed.message, response.status, data, parsed.errorInfo);
  }
  return response.blob();
}

export const api = {
  // System (strict 3s connectivity timeout)
  health: () => request('/api/health', { timeoutMs: API_TIMEOUTS.HEALTH_MS }),

  // Auth
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  me: () => request('/api/auth/me', { timeoutMs: API_TIMEOUTS.HEALTH_MS }),
  updateLanguage: (language) =>
    request('/api/auth/language', { method: 'PUT', body: { language } }),

  // Patient
  getPatientProfile: () => request('/api/patient/profile'),
  updatePatientProfile: (body) =>
    request('/api/patient/profile', { method: 'PUT', body }),
  addCondition: (body) =>
    request('/api/patient/conditions', { method: 'POST', body }),
  deleteCondition: (id) =>
    request(`/api/patient/conditions/${id}`, { method: 'DELETE' }),
  addMedication: (body) =>
    request('/api/patient/medications', { method: 'POST', body }),
  deleteMedication: (id) =>
    request(`/api/patient/medications/${id}`, { method: 'DELETE' }),
  addAllergy: (body) =>
    request('/api/patient/allergies', { method: 'POST', body }),
  deleteAllergy: (id) =>
    request(`/api/patient/allergies/${id}`, { method: 'DELETE' }),
  addVital: (body) =>
    request('/api/patient/vitals', { method: 'POST', body }),
  deleteVital: (id) =>
    request(`/api/patient/vitals/${id}`, { method: 'DELETE' }),
  listDoctors: () => request('/api/patient/doctors'),
  shareWithDoctor: (doctorId) =>
    request('/api/patient/share', { method: 'POST', body: { doctor_id: doctorId } }),
  revokeDoctorShare: (doctorId) =>
    request(`/api/patient/share/${doctorId}`, { method: 'DELETE' }),

  // Reports (30s upload deadline, 90s+3s analyze deadline)
  uploadReport: (file, onProgress) =>
    uploadFileWithProgress('/api/reports/upload', file, onProgress, {
      timeoutMs: API_TIMEOUTS.UPLOAD_MS,
      isUploadOnly: true,
    }),
  analyzeReport: (reportId, language) =>
    request(`/api/reports/${reportId}/analyze`, {
      method: 'POST',
      body: { language },
      timeoutMs: API_TIMEOUTS.REPORT_ANALYZE_MS,
    }),
  listReports: () => request('/api/reports'),
  getReport: (id) => request(`/api/reports/${id}`),
  deleteReport: (id) =>
    request(`/api/reports/${id}`, { method: 'DELETE' }),
  fetchReportBlob: (id) => fetchAuthorizedBlob(`/api/reports/${id}/file`),

  // Chat (45s+3s deadline)
  listConversations: () => request('/api/chat/conversations'),
  createConversation: (title) =>
    request('/api/chat/conversations', { method: 'POST', body: { title } }),
  getConversation: (id) => request(`/api/chat/conversations/${id}`),
  deleteConversation: (id) =>
    request(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (conversationId, content, language) =>
    request(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content, language },
      timeoutMs: API_TIMEOUTS.CHAT_MS,
    }),

  // Doctor & Verification
  getDoctorProfile: () => request('/api/doctor/profile'),
  updateDoctorProfile: (body) =>
    request('/api/doctor/profile', { method: 'PUT', body }),
  submitDoctorVerification: (formData, onProgress) =>
    uploadFormDataWithProgress('/api/doctor/verification', formData, onProgress, {
      timeoutMs: API_TIMEOUTS.UPLOAD_MS,
      isUploadOnly: true,
    }),
  fetchDoctorVerificationBlob: () => fetchAuthorizedBlob('/api/doctor/verification/file'),
  listSharedPatients: () => request('/api/doctor/patients'),
  getPatientDetail: (patientId) => request(`/api/doctor/patients/${patientId}`),

  // Appointments
  listAppointments: () => request('/api/appointments'),
  createAppointment: (body) =>
    request('/api/appointments', { method: 'POST', body }),
  updateAppointment: (id, body) =>
    request(`/api/appointments/${id}`, { method: 'PUT', body }),
  deleteAppointment: (id) =>
    request(`/api/appointments/${id}`, { method: 'DELETE' }),

  // Clinical Knowledge (Specialties, Guidelines, References, Surgical Tips)
  getClinicalBundle: () => request('/api/clinical/bundle'),
  listSpecialties: () => request('/api/clinical/specialties'),
  listGuidelines: () => request('/api/clinical/guidelines'),
  listReferences: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.specialty_id) qs.set('specialty_id', params.specialty_id);
    if (params.guideline) qs.set('guideline', params.guideline);
    if (params.q) qs.set('q', params.q);
    return request(`/api/clinical/references?${qs.toString()}`);
  },
  listSurgicalTips: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.specialty_id) qs.set('specialty_id', params.specialty_id);
    if (params.q) qs.set('q', params.q);
    if (params.bookmarked_only) qs.set('bookmarked_only', 'true');
    return request(`/api/clinical/surgical-tips?${qs.toString()}`);
  },
  toggleTipBookmark: (tipId) =>
    request(`/api/clinical/surgical-tips/${tipId}/bookmark`, { method: 'POST' }),

  // Consultant Mentor Mode
  getMentorSamples: () => request('/api/mentor/samples'),
  getMentorHistory: () => request('/api/mentor/history'),
  analyzeMentorReport: (file, reportType, language, onProgress, onUploadComplete) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('report_type', reportType || 'auto');
    fd.append('language', language || 'en');
    return uploadFormDataWithProgress('/api/mentor/analyze', fd, onProgress, {
      timeoutMs: API_TIMEOUTS.MENTOR_ANALYZE_MS,
      onUploadComplete,
      isUploadOnly: false,
    });
  },

  // Doctor Forum
  listForumPosts: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.specialty_id) qs.set('specialty_id', params.specialty_id);
    if (params.q) qs.set('q', params.q);
    return request(`/api/forum/posts?${qs.toString()}`);
  },
  createForumPost: (body) =>
    request('/api/forum/posts', { method: 'POST', body }),
  updateForumPost: (id, body) =>
    request(`/api/forum/posts/${id}`, { method: 'PUT', body }),
  deleteForumPost: (id) =>
    request(`/api/forum/posts/${id}`, { method: 'DELETE' }),
  addForumComment: (postId, body) =>
    request(`/api/forum/posts/${postId}/comments`, { method: 'POST', body }),
  toggleForumUpvote: (postId) =>
    request(`/api/forum/posts/${postId}/upvote`, { method: 'POST' }),

  // Patient Community
  listCommunityPosts: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.channel_id) qs.set('channel_id', params.channel_id);
    if (params.post_type) qs.set('post_type', params.post_type);
    if (params.q) qs.set('q', params.q);
    return request(`/api/community/posts?${qs.toString()}`);
  },
  createCommunityPost: (body) =>
    request('/api/community/posts', { method: 'POST', body }),
  updateCommunityPost: (id, body) =>
    request(`/api/community/posts/${id}`, { method: 'PUT', body }),
  deleteCommunityPost: (id) =>
    request(`/api/community/posts/${id}`, { method: 'DELETE' }),
  addCommunityComment: (postId, body) =>
    request(`/api/community/posts/${postId}/comments`, { method: 'POST', body }),
  toggleCommunityLike: (postId) =>
    request(`/api/community/posts/${postId}/like`, { method: 'POST' }),
  reportCommunityPost: (postId, reason) =>
    request(`/api/community/posts/${postId}/report`, { method: 'POST', body: { reason } }),

  // Temporary QR Record Sharing
  listQrTokens: () => request('/api/qr/tokens'),
  createQrToken: (body) =>
    request('/api/qr/tokens', { method: 'POST', body }),
  revokeQrToken: (id) =>
    request(`/api/qr/tokens/${id}`, { method: 'DELETE' }),
  redeemQrToken: (token) =>
    request('/api/qr/access', { method: 'POST', body: { token } }),
  fetchQrReportBlob: (reportId, qrToken) =>
    fetchAuthorizedBlob(`/api/qr/reports/${reportId}/file`, {
      'X-QR-Token': qrToken,
    }),
};
