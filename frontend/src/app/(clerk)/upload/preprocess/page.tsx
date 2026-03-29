"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { RefreshCw, ScanText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function PreprocessPage() {
  const router = useRouter();
  const { sessionId, setPipelineData } = useAppStore();
  const [status, setStatus] = useState<'analyzing' | 'cleaning' | 'mapping' | 'ready'>('analyzing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      toast.error('No active session.');
      router.push('/upload');
      return;
    }

    const runPipeline = async () => {
      try {
        // Step 1: Match Template
        setStatus('analyzing');
        setProgress(25);
        await api.post('/pipeline/match-template', { session_id: sessionId });

        // Step 2: Classify & Extract Schema
        setStatus('mapping');
        setProgress(60);
        const classifyRes = await api.get(`/pipeline/classify/${sessionId}`);
        
        // Step 3: Extract data explicitly using OCR
        setStatus('cleaning');
        setProgress(85);
        const extractRes = await api.post(`/pipeline/extract/${sessionId}`);
        
        // Persist to store
        setPipelineData({
          templateSchema: classifyRes.data?.fields || [],
          extractedFields: extractRes.data?.fields || [],
        });

        setProgress(100);
        setStatus('ready');
      } catch (error: any) {
        toast.error(error.response?.data?.detail?.message || 'Pipeline failed. Please try again.');
        router.push('/upload');
      }
    };

    runPipeline();
  }, [sessionId, router, setPipelineData]);

  const handleContinue = () => {
    router.push('/upload/review');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full pt-12">
      <GlassCard className="w-full relative overflow-hidden flex flex-col items-center p-12 text-center shadow-2xl">
        
        {status !== 'ready' ? (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-20 h-20 bg-[var(--color-surface-high)] rounded-full border border-[var(--color-ghost-border)] flex items-center justify-center text-[var(--color-primary)] mb-8 shadow-inner"
          >
            <RefreshCw size={36} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full border border-[var(--color-success)] flex items-center justify-center mb-8 shadow-[0_0_20px_var(--color-success-bg)]"
          >
            <CheckCircle2 size={36} />
          </motion.div>
        )}

        <h2 className="text-2xl font-serif font-bold text-white mb-2">
          {status === 'analyzing' && 'Analyzing Document...'}
          {status === 'cleaning' && 'Enhancing Image Quality...'}
          {status === 'mapping' && 'Mapping Coordinates...'}
          {status === 'ready' && 'Document Ready'}
        </h2>
        
        <p className="text-[var(--color-on-surface-variant)] text-sm max-w-md mx-auto mb-10 h-10">
          {status === 'analyzing' && 'Running initial format and quality checks against accepted templates.'}
          {status === 'cleaning' && 'Applying deskew, noise reduction, and contrast enhancement.'}
          {status === 'mapping' && 'Generating relative bounding boxes [0.0 - 1.0] for field matching.'}
          {status === 'ready' && 'Pipeline preprocessing completed successfully. Image is optimized.'}
        </p>

        {/* Custom Progress Bar */}
        <div className="w-full h-2 rounded-full border border-[var(--color-ghost-border)] bg-[var(--color-surface-lowest)] overflow-hidden relative mb-8">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[var(--color-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "tween", ease: "easeInOut" }}
            style={{ 
              boxShadow: '0 0 10px var(--color-glow)'
            }}
          />
        </div>

        {status === 'ready' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button variant="primary" size="lg" onClick={handleContinue} className="px-10">
              Proceed to Review
              <ScanText className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </GlassCard>
    </div>
  );
}
