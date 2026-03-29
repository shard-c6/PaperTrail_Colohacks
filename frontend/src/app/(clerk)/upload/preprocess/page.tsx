"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, ScanText, CheckCircle2, AlertTriangle,
  Plus, RefreshCcw, Cpu, Zap, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PIPELINE_STEPS = [
  { key: 'deskew',   label: 'Deskewing & Rotation Fix',     icon: Cpu,        detail: 'Hough Line Transform ±15°' },
  { key: 'denoise',  label: 'Denoising & Contrast (CLAHE)', icon: Zap,        detail: 'Gaussian Blur + Adaptive Threshold' },
  { key: 'match',    label: 'Template Matching (HOG)',       icon: ScanText,   detail: 'Cosine Similarity against registered templates' },
  { key: 'llm',      label: 'AI Verification (DeepSeek)',   icon: ShieldCheck, detail: 'Multimodal LLM Fallback Classifier' },
];

export default function PreprocessPage() {
  const router = useRouter();
  const { sessionId, setPipelineData, setSessionId, originalImageUrl, cleanedImageUrl } = useAppStore();

  const [currentStep, setCurrentStep] = useState(-1);
  const [status, setStatus] = useState<'processing' | 'ready' | 'error'>('processing');
  const [templateNotFound, setTemplateNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [matchInfo, setMatchInfo] = useState<{ name: string; confidence: number } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      toast.error('No active session.');
      router.push('/upload');
      return;
    }

    const runPipeline = async () => {
      try {
        // Simulate step-by-step visual progress
        setCurrentStep(0); await delay(700);
        setCurrentStep(1); await delay(800);

        // Step: Match Template
        setCurrentStep(2);
        const matchRes = await api.post('/pipeline/match-template', { session_id: sessionId });
        const { template_name, confidence } = matchRes.data;
        setMatchInfo({ name: template_name, confidence });
        setPipelineData({ templateName: template_name, templateConfidence: confidence });

        setCurrentStep(3); await delay(600);

        // Step: Classify & Extract Schema
        const classifyRes = await api.get(`/pipeline/classify/${sessionId}`);
        const extractRes  = await api.post(`/pipeline/extract/${sessionId}`);

        // Normalise backend field_name → key for UI consistency
        const rawFields: any[] = extractRes.data?.fields || [];
        const fields = rawFields.map(f => ({
          ...f,
          key: f.field_name || f.key || '',
        }));
        const schemaFields: any[] = (classifyRes.data?.fields || []).map((f: any) => ({
          ...f,
          key: f.field_name || f.key || '',
        }));

        setPipelineData({
          templateSchema: schemaFields,
          extractedFields: fields,
          originalExtractedFields: JSON.parse(JSON.stringify(fields)), // deep clone snapshot
          cleanedImageUrl: matchRes.data?.cleaned_image_url || null,
        });

        setCurrentStep(4);
        setStatus('ready');
      } catch (error: any) {
        const msg =
          error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          'Pipeline failed.';

        if (
          msg.toLowerCase().includes('template') ||
          error.response?.status === 404 ||
          error.response?.status === 400
        ) {
          setErrorMessage(typeof msg === 'string' ? msg : 'Template has not been matched yet.');
          setTemplateNotFound(true);
        } else {
          toast.error(msg);
          router.push('/upload');
        }
      }
    };

    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleContinue = () => router.push('/upload/review');
  const handleRetry    = () => { setSessionId(null); router.push('/upload'); };
  const handleMakeTemplate = () => router.push('/templates/new');

  const confidencePct = matchInfo ? Math.round(matchInfo.confidence * 100) : 0;
  const confidenceColor =
    confidencePct >= 85 ? 'var(--color-success)' :
    confidencePct >= 70 ? 'var(--color-warning)' :
    'var(--color-error)';

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[var(--color-bg)]">

      {/* ── Left Panel: Image Comparison ── */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-ghost-border)] shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Image Pipeline</span>
        </div>
        <div className="flex-1 grid grid-rows-2 gap-0 overflow-hidden">
          {/* Original */}
          <div className="relative flex flex-col overflow-hidden border-b border-[var(--color-ghost-border)]">
            <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Original Upload</span>
              <span className="text-[10px] bg-[var(--color-surface-high)] text-[var(--color-on-surface-variant)] px-2 py-0.5 rounded-full">RAW</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
              {originalImageUrl ? (
                <img src={originalImageUrl} alt="Original" className="max-h-full max-w-full object-contain rounded shadow-md opacity-80" />
              ) : (
                <div className="w-full h-full rounded-md border border-[var(--color-ghost-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                  <div className="w-16 h-20 rounded border-2 border-dashed border-current opacity-30" />
                  <span className="text-xs">Original Scan</span>
                </div>
              )}
            </div>
          </div>

          {/* Cleaned */}
          <div className="relative flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">Cleaned Output</span>
              <span className="text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30">PROCESSED</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
              {cleanedImageUrl && status === 'ready' ? (
                <motion.img
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6 }}
                  src={cleanedImageUrl}
                  alt="Cleaned"
                  className="max-h-full max-w-full object-contain rounded shadow-md"
                />
              ) : (
                <div className="w-full h-full rounded-md border border-[var(--color-ghost-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                  {status === 'processing' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      className="text-[var(--color-primary)]"
                    >
                      <RefreshCw size={28} />
                    </motion.div>
                  ) : (
                    <div className="w-16 h-20 rounded border-2 border-dashed border-current opacity-30" />
                  )}
                  <span className="text-xs">
                    {status === 'processing' ? 'Processing...' : 'Cleaned Preview'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Pipeline Status ── */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-[var(--color-bg)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-ghost-border)] shrink-0">
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--color-on-bg)]">Processing Pipeline</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">AI-assisted document preprocessing engine</p>
          </div>
          <span className="text-xs font-mono text-[var(--color-on-surface-variant)] bg-[var(--color-surface-high)] px-2 py-1 rounded">
            {sessionId?.substring(0, 8)}...
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
          {/* Steps */}
          <div className="space-y-3">
            {PIPELINE_STEPS.map((step, i) => {
              const isDone    = currentStep > i;
              const isActive  = currentStep === i;
              const isPending = currentStep < i;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                    isDone   ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5' :
                    isActive ? 'border-[var(--color-primary)]/60 bg-[var(--color-primary)]/8 shadow-[0_0_20px_var(--color-primary-bg)]' :
                               'border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isDone   ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' :
                    isActive ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' :
                               'bg-[var(--color-surface-high)] text-[var(--color-on-surface-variant)]'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 size={18} />
                    ) : isActive ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                        <RefreshCw size={16} />
                      </motion.div>
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isDone ? 'text-[var(--color-success)]' : isActive ? 'text-[var(--color-on-bg)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {step.label}
                      </p>
                      {isDone && <CheckCircle2 size={14} className="text-[var(--color-success)] shrink-0" />}
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{step.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Result: Match Card */}
          <AnimatePresence>
            {matchInfo && status === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-5 rounded-xl border border-[var(--color-ghost-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Matched Template</p>
                    <p className="text-[var(--color-on-bg)] font-bold font-serif text-lg">{matchInfo.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-on-surface-variant)] mb-1">Confidence</p>
                    <p className="text-2xl font-bold font-mono" style={{ color: confidenceColor }}>{confidencePct}%</p>
                  </div>
                </div>
                {/* Confidence bar */}
                <div className="h-2 rounded-full bg-[var(--color-surface-high)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: confidenceColor, boxShadow: `0 0 10px ${confidenceColor}` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">
                  {confidencePct >= 85 ? '✓ High confidence match — safe to proceed.' :
                   confidencePct >= 70 ? '⚠ Moderate confidence — please verify all fields carefully.' :
                   '✗ Low confidence — consider retrying with a cleaner scan.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <AnimatePresence>
            {status === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <Button variant="primary" size="lg" onClick={handleContinue} className="w-full">
                  Proceed to Data Extraction & Review
                  <ChevronRight className="ml-2" size={18} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Template Not Found Modal ── */}
      <Modal isOpen={templateNotFound} onClose={() => {}} title="No Exact Match Found">
        <div className="space-y-5">
          <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
            The OCR pipeline could not match this upload to any registered template with high confidence.
            ({errorMessage}). What would you like to do?
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={handleMakeTemplate} className="w-full py-5 flex justify-between items-center">
              <span className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Plus size={18} /></div>
                <span className="flex flex-col items-start text-left">
                  <span className="font-bold">Submit New Template</span>
                  <span className="text-xs text-[var(--color-on-bg)]/60 font-normal">Use the interactive builder to draw fields</span>
                </span>
              </span>
              <ChevronRight size={16} className="opacity-60" />
            </Button>
            <Button variant="secondary" onClick={() => toast('Manual template selection coming soon.')} className="w-full py-4 justify-start">
              Select Template Manually...
            </Button>
            <Button variant="ghost" onClick={handleRetry} className="w-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)]">
              <RefreshCcw size={15} className="mr-2" /> Cancel &amp; Retry Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
