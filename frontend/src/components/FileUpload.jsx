import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLang } from '../context/LangContext';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function FileUpload({
  onFileSelected,
  uploading = false,
  progress = 0,
  disabled = false,
  uploadedReport = null,
}) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [localSelectedName, setLocalSelectedName] = useState('');

  const isLocked = disabled || uploading;

  const validateAndEmit = (file) => {
    setError('');
    if (!file || isLocked) return;

    const lower = file.name.toLowerCase();
    const validExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!validExt) {
      setError(t.reports.unsupportedFileError);
      return;
    }

    if (file.size === 0) {
      setError(t.reports.emptyFileError);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(t.reports.maxSizeError);
      return;
    }

    setLocalSelectedName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (isLocked) return;
    const file = e.dataTransfer.files?.[0];
    validateAndEmit(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    validateAndEmit(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => !isLocked && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isLocked
            ? 'border-slate-200 bg-slate-100/70 opacity-65 cursor-not-allowed'
            : dragging
            ? 'border-primary-500 bg-primary-50 cursor-pointer'
            : 'border-slate-300 bg-slate-50/70 hover:border-primary-400 hover:bg-primary-50/40 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleChange}
          disabled={isLocked}
          className="hidden"
        />

        <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mb-3">
          <Upload className="w-6 h-6" />
        </div>

        <p className="text-sm font-medium text-slate-800">{t.reports.dropHint}</p>
        <p className="text-xs text-slate-500 mt-1">{t.reports.maxSizeHint}</p>

        {/* Neutral local selection notice (never claims file is uploaded until backend confirms an ID) */}
        {localSelectedName && !error && !uploadedReport?.id && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>
              {t.reports.selectedLocalHint} {localSelectedName}
            </span>
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-primary-700">
            <span>{t.reports.uploading}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!uploading && uploadedReport?.id && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            {t.reports.uploadSuccess}: {uploadedReport.original_filename} (#{uploadedReport.id})
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
