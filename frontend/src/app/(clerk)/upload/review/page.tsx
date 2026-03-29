"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  Save, Pencil, RotateCcw, FileCheck2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ExtractedField {
  key: string;
  field_name?: string;
  label?: string;
  value: string;
  confidence: number;
  uncertain?: boolean;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

type ViewStage = 'review' | 'summary';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function confBadge(c: number) {
  const pct = Math.round(c * 100);
  if (pct >= 85) return { label: `${pct}%`, className: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30' };
  if (pct >= 70) return { label: `${pct}%`, className: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/30' };
  return { label: `${pct}%`, className: 'bg-[var(--color-error)]/15 text-[var(--color-error)] border-[var(--color-error)]/30' };
}

function getBBoxStyle(box?: ExtractedField['bounding_box']) {
  if (!box) return { display: 'none' };
  return {
    left:   `${box.x * 100}%`,
    top:    `${box.y * 100}%`,
    width:  `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ReviewPage() {
  const router = useRouter();
  const {
    sessionId, cleanedImageUrl, originalImageUrl,
    extractedFields, originalExtractedFields,
    templateSchema, templateName, templateConfidence,
    setPipelineData, user,
  } = useAppStore();

  const voiceModeEnabled = user?.voice_mode_enabled || false;
  const preferredLang    = user?.preferred_language || 'en-IN';

  // Working copy of fields the user may edit
  const [fields, setFields]       = useState<ExtractedField[]>([]);
  const [origFields, setOrigFields] = useState<ExtractedField[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [stage, setStage]         = useState<ViewStage>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      toast.error('Session expired.');
      router.push('/upload');
      return;
    }

    const ef = extractedFields || [];
    const of = originalExtractedFields || ef;
    setFields(ef.map(f => ({ ...f, key: f.key || f.field_name || '' })));
    setOrigFields(of.map(f => ({ ...f, key: f.key || f.field_name || '' })));

    // TTS
    if (voiceModeEnabled && 'speechSynthesis' in window) {
      const uncertain = ef.filter(f => (f.confidence ?? 1) < 0.75);
      const msg = uncertain.length
        ? `Please review ${uncertain.length} low-confidence fields.`
        : 'Document extracted. Please review before submitting.';
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = preferredLang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Field editing ──
  const updateField = (key: string, value: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, value } : f));
  };

  const resetField = (key: string) => {
    const orig = origFields.find(f => f.key === key);
    if (orig) setFields(prev => prev.map(f => f.key === key ? { ...f, value: orig.value } : f));
  };

  // ── Save draft ──
  const onSaveDraft = async () => {
    try {
      await api.post(`/pipeline/save-draft/${sessionId}`, {
        fields: fields.map(f => ({ field_name: f.key, value: f.value }))
      });
      toast.success('Draft saved.');
    } catch {
      toast.error('Could not save draft.');
    }
  };

  // ── Submit → move to summary view ──
  const onConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/pipeline/submit/${sessionId}`, {
        fields: fields.map(f => ({ field_name: f.key, final_value: f.value }))
      });
      // persist final state in store so summary page can render diffs
      setPipelineData({ extractedFields: fields });
      setStage('summary');
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uncertainFields = fields.filter(f => (f.confidence ?? 1) < 0.75);

  // ──────────────────────────────────────────
  // STAGE: REVIEW (split view)
  // ──────────────────────────────────────────
  if (stage === 'review') {
    return (
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[var(--color-bg)]">

        {/* ── LEFT: Cleaned Image with bbox overlays ── */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-on-bg)] font-serif">Cleaned Document</h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Fields highlighted on image</p>
            </div>
            {templateName && (
              <div className="text-right">
                <p className="text-xs text-[var(--color-on-surface-variant)]">{templateName}</p>
                <p className="text-xs font-mono" style={{ color: (templateConfidence ?? 0) >= 0.85 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {Math.round((templateConfidence ?? 0) * 100)}% match
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            <div className="relative inline-block w-full max-w-md shadow-2xl">
              {/* Document background */}
              {cleanedImageUrl ? (
                <img src={cleanedImageUrl} alt="Cleaned" className="w-full rounded" />
              ) : (
                <div className="w-full aspect-[1/1.414] bg-[#F0EEE8] rounded relative">
                  {/* Placeholder document lines */}
                  {[0.12, 0.20, 0.28, 0.38, 0.48, 0.58, 0.68].map((y, i) => (
                    <div key={i} className="absolute h-[1px] bg-gray-300 left-8 right-8" style={{ top: `${y * 100}%` }} />
                  ))}
                </div>
              )}

              {/* Field overlays */}
              {fields.map(field => {
                const isActive   = activeKey === field.key;
                const isUncertain = (field.confidence ?? 1) < 0.75;
                return (
                  <motion.div
                    key={field.key}
                    onClick={() => setActiveKey(field.key)}
                    className="absolute cursor-pointer rounded-[3px] border-2 transition-all"
                    style={{
                      ...getBBoxStyle(field.bounding_box),
                      borderColor: isActive
                        ? 'var(--color-primary)'
                        : isUncertain ? 'var(--color-warning)' : 'var(--color-success)',
                      backgroundColor: isActive
                        ? 'rgba(var(--color-primary-rgb,99,102,241),0.18)'
                        : isUncertain ? 'rgba(234,179,8,0.10)' : 'rgba(34,197,94,0.08)',
                      boxShadow: isActive ? '0 0 12px var(--color-primary-bg)' : undefined,
                      zIndex: isActive ? 10 : 1,
                    }}
                    animate={{ scale: isActive ? 1.02 : 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Tooltip */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-7 left-0 bg-[var(--color-primary)] text-[var(--color-on-bg)] text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow-lg z-20"
                        >
                          {field.label || field.key}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Digital Form ── */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-[var(--color-bg)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-on-bg)] font-serif">Data Verification</h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {uncertainFields.length > 0
                  ? `${uncertainFields.length} field${uncertainFields.length > 1 ? 's' : ''} need${uncertainFields.length === 1 ? 's' : ''} review`
                  : 'All fields extracted with high confidence'}
              </p>
            </div>
            <Button variant="secondary" size="sm" className="h-8" onClick={onSaveDraft}>
              <Save size={14} className="mr-1.5" /> Save Draft
            </Button>
          </div>

          {/* Alert Banner */}
          {uncertainFields.length > 0 && (
            <div className="mx-5 mt-4 flex items-start gap-3 p-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 text-sm text-[var(--color-warning)] shrink-0">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Fields highlighted in <strong>yellow</strong> have confidence below 75%. Please verify and correct them before submitting.</span>
            </div>
          )}

          {/* Fields */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar pb-24">
            {(templateSchema?.length ? templateSchema : fields).map((schemaField: any) => {
              const fieldKey    = schemaField.field_name || schemaField.key || schemaField.label;
              const ocrField    = fields.find(f => f.key === fieldKey);
              const isUncertain = ocrField ? (ocrField.confidence ?? 1) < 0.75 : true;
              const isActive    = activeKey === fieldKey;
              const origField   = origFields.find(f => f.key === fieldKey);
              const isEdited    = origField && ocrField && origField.value !== ocrField.value;
              const badge       = ocrField ? confBadge(ocrField.confidence) : null;

              return (
                <motion.div
                  key={fieldKey}
                  layout
                  onClick={() => setActiveKey(fieldKey)}
                  onFocus={() => setActiveKey(fieldKey)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    isActive
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface-high)] shadow-[0_0_0_1px_var(--color-primary-bg)]'
                      : isUncertain
                        ? 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5'
                        : 'border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)] hover:border-[var(--color-on-surface-variant)]/30'
                  }`}
                >
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider flex items-center gap-1.5">
                      {isUncertain ? (
                        <AlertTriangle size={12} className="text-[var(--color-warning)]" />
                      ) : (
                        <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                      )}
                      {schemaField.label || fieldKey}
                    </label>
                    <div className="flex items-center gap-2">
                      {isEdited && (
                        <button
                          onClick={e => { e.stopPropagation(); resetField(fieldKey); }}
                          className="text-[10px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-surface-high)] border border-[var(--color-ghost-border)]"
                        >
                          <RotateCcw size={9} /> Reset
                        </button>
                      )}
                      {badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={ocrField?.value ?? ''}
                      onChange={e => updateField(fieldKey, e.target.value)}
                      onFocus={() => setActiveKey(fieldKey)}
                      placeholder={isUncertain ? '⚠ Uncertain — please fill in' : 'No data extracted'}
                      className={`w-full h-10 px-3 pr-8 rounded text-sm text-[var(--color-on-bg)] outline-none transition-all ghost-input
                        ${isActive ? 'bg-[var(--color-surface)] ring-1 ring-[var(--color-primary)]' : 'bg-[var(--color-surface-lowest)]'}
                        ${isUncertain && !isActive ? 'bg-[var(--color-warning)]/5 placeholder:text-[var(--color-warning)]/60' : ''}
                      `}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isActive ? (
                        <Pencil size={13} className="text-[var(--color-primary)]/60" />
                      ) : isUncertain ? (
                        <XCircle size={13} className="text-[var(--color-warning)]/60" />
                      ) : (
                        <CheckCircle2 size={13} className="text-[var(--color-success)]/40" />
                      )}
                    </div>
                  </div>

                  {/* Edited pill */}
                  {isEdited && (
                    <p className="text-[10px] text-[var(--color-primary)] mt-1.5">
                      ✏ Edited from: &quot;{origField?.value || '(empty)'}&quot;
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Action bar */}
          <div className="shrink-0 px-5 py-4 bg-[var(--color-surface)] border-t border-[var(--color-ghost-border)] flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => router.push('/upload')} className="text-[var(--color-on-surface-variant)]">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirmSubmit}
              isLoading={isSubmitting}
              className="flex-1 max-w-xs"
            >
              <FileCheck2 size={16} className="mr-2" />
              Confirm &amp; Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────
  // STAGE: SUMMARY (3-panel view)
  // ──────────────────────────────────────────
  const editedFields = fields.filter((f) => {
    const orig = origFields.find(o => o.key === f.key);
    return orig && orig.value !== f.value;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)] overflow-auto">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[var(--color-ghost-border)] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--color-on-bg)] flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-[var(--color-success)]" />
            </span>
            Submission Complete
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            {templateName} — reviewed and submitted to the records database.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/records')}>
          Go to Records <ArrowRight size={15} className="ml-2" />
        </Button>
      </div>

      {/* 3-Panel Comparison */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-ghost-border)] overflow-auto">

        {/* Panel 1: Original Image */}
        <div className="flex flex-col bg-[var(--color-surface-lowest)]">
          <div className="px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0">
            <span className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest">Original Scan</span>
          </div>
          <div className="flex-1 flex items-start justify-center p-5 overflow-auto">
            {originalImageUrl ? (
              <img src={originalImageUrl} alt="Original" className="max-w-full rounded shadow-md opacity-80" />
            ) : (
              <div className="w-full aspect-[1/1.414] rounded-md border border-dashed border-[var(--color-ghost-border)] flex items-center justify-center text-[var(--color-on-surface-variant)] text-xs">
                Original image unavailable
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Extracted form (before edits) */}
        <div className="flex flex-col bg-[var(--color-bg)]">
          <div className="px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0">
            <span className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-widest">OCR Extracted (Before)</span>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-3">
            {origFields.map(field => {
              const isUncertain = (field.confidence ?? 1) < 0.75;
              return (
                <div key={field.key} className={`p-3 rounded-lg border ${isUncertain ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5' : 'border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1 flex items-center gap-1">
                    {isUncertain && <AlertTriangle size={9} className="text-[var(--color-warning)]" />}
                    {field.label || field.key}
                  </p>
                  <p className={`text-sm ${isUncertain ? 'text-[var(--color-warning)]' : 'text-[var(--color-on-bg)]'}`}>
                    {field.value || <span className="text-[var(--color-on-surface-variant)] italic">—</span>}
                  </p>
                  {isUncertain && (
                    <p className="text-[10px] text-[var(--color-warning)]/70 mt-0.5">{Math.round((field.confidence ?? 0) * 100)}% confidence</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3: Final Form (after edits) */}
        <div className="flex flex-col bg-[var(--color-bg)]">
          <div className="px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0 flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-success)] uppercase tracking-widest">Final Verified Form</span>
            {editedFields.length > 0 && (
              <span className="text-[10px] bg-[var(--color-primary)]/15 text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20">
                {editedFields.length} correction{editedFields.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-3">
            {fields.map(field => {
              const orig      = origFields.find(o => o.key === field.key);
              const wasEdited = orig && orig.value !== field.value;
              return (
                <div key={field.key} className={`p-3 rounded-lg border transition-colors ${wasEdited ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : 'border-[var(--color-success)]/20 bg-[var(--color-success)]/3'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1 flex items-center gap-1">
                    {wasEdited ? <Pencil size={9} className="text-[var(--color-primary)]" /> : <CheckCircle2 size={9} className="text-[var(--color-success)]" />}
                    {field.label || field.key}
                    {wasEdited && <span className="ml-auto text-[var(--color-primary)] text-[9px] font-normal normal-case tracking-normal">edited</span>}
                  </p>
                  <p className="text-sm text-[var(--color-on-bg)]">
                    {field.value || <span className="text-[var(--color-on-surface-variant)] italic">—</span>}
                  </p>
                  {wasEdited && orig && (
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5 line-through">
                      was: {orig.value || '(empty)'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="shrink-0 px-8 py-4 border-t border-[var(--color-ghost-border)] bg-[var(--color-surface)] flex items-center gap-6 flex-wrap">
        <Stat label="Total Fields" value={fields.length} />
        <Stat label="Auto-Extracted" value={fields.length - editedFields.length} color="var(--color-success)" />
        <Stat label="Manually Corrected" value={editedFields.length} color="var(--color-primary)" />
        <Stat label="Template" value={templateName || '—'} />
        <Stat label="Confidence" value={`${Math.round((templateConfidence ?? 0) * 100)}%`}
          color={(templateConfidence ?? 0) >= 0.85 ? 'var(--color-success)' : 'var(--color-warning)'} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-[var(--color-on-bg)] mt-0.5" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}
