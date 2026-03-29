"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setSessionId, setPipelineData } = useAppStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
      } else {
        toast.error('Only image files are supported');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/pipeline/preprocess', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.session_id) {
        setPipelineData({ 
          originalImageUrl: response.data.original_image_url,
          cleanedImageUrl: response.data.cleaned_image_url 
        });
        setSessionId(response.data.session_id);
        toast.success('Document uploaded successfully');
        router.push('/upload/preprocess');
      } else {
        throw new Error('Upload failed: Invalid response from server');
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full pt-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[var(--color-on-bg)] mb-2">New Digitisation Session</h1>
        <p className="text-[var(--color-on-surface-variant)]">Upload a scanned government form to begin the OCR pipeline.</p>
      </div>

      <GlassCard className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[var(--color-ghost-border)] bg-[var(--color-surface-low)] min-h-[400px]">
        {file ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="w-24 h-24 rounded-2xl bg-[var(--color-surface-highest)] border border-[var(--color-ghost-border)] flex flex-col items-center justify-center text-[var(--color-primary)]">
              <FileImage size={40} />
            </div>
            <div className="w-full text-center truncate px-4">
              <p className="text-[var(--color-on-bg)] font-medium truncate" title={file.name}>{file.name}</p>
              <p className="text-sm text-[var(--color-on-surface-variant)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex w-full gap-3 mt-4">
              <Button variant="ghost" onClick={() => setFile(null)} className="flex-1" disabled={uploading}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpload} className="flex-1" isLoading={uploading}>
                Process
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className={`w-full h-full flex flex-col items-center justify-center transition-all ${isDragging ? 'scale-105' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-[var(--color-primary-container)] text-[var(--color-primary)]' : 'bg-[var(--color-surface-highest)] text-[var(--color-on-surface-variant)]'}`}>
              <UploadCloud size={32} />
            </div>
            <h3 className="text-xl font-bold font-serif text-[var(--color-on-bg)] mb-2">Drag & Drop Image</h3>
            <p className="text-[var(--color-on-surface-variant)] text-sm max-w-sm mb-8">
              Supports JPEG, PNG, TIFF up to 20MB. High resolution scans (300 DPI) recommended.
            </p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileSelect}
            />
          </div>
        )}
      </GlassCard>
    </div>
  );
}
