"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Mic, Volume2, Save, Loader2, Languages } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAppStore } from '@/store/useAppStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      preferred_language: user?.preferred_language || 'en-IN',
      voice_mode_enabled: user?.voice_mode_enabled || false,
      voice_agent_enabled: user?.voice_agent_enabled || false,
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await api.patch('/users/me/preferences', data);
      
      if (response.data && response.data.success) {
        setUser({
          ...user!,
          ...response.data.data
        });
        toast.success("Preferences updated successfully.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.message || "Failed to update preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 h-full custom-scrollbar overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Account Settings</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm">
          Manage your accessibility preferences and AI voice assistant settings.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
        
        {/* Language Preferences */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <Languages className="text-[var(--color-primary)]" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1 font-serif">Language Preferences</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-4">
                Choose the language you prefer the AI voice agent to speak and listen in. Supported options include English, Hindi, and Marathi.
              </p>
              
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">Primary Language</label>
                <select
                  {...register('preferred_language')}
                  className="w-full h-11 px-3.5 rounded-md ghost-input text-white outline-none appearance-none"
                >
                  <option value="en-IN" className="bg-[#121A20]">English (India)</option>
                  <option value="hi-IN" className="bg-[#121A20]">Hindi (India)</option>
                  <option value="mr-IN" className="bg-[#121A20]">Marathi (India)</option>
                </select>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Text-to-Speech (TTS) */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center shrink-0">
              <Volume2 className="text-[var(--color-success)]" size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">Screen Reader & TTS</h3>
                  <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mt-1 pr-6">
                    Automatically read aloud low-confidence fields when reviewing uploaded forms. Helps visually impaired clerks or instances with blurry scans.
                  </p>
                </div>
                {/* Custom Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('voice_mode_enabled')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-[var(--color-surface-highest)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* AI Voice Agent (STT + LLM) */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center shrink-0">
              <Mic className="text-[var(--color-warning)]" size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">AI Voice Assistant</h3>
                  <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mt-1 pr-6">
                    Enable the microphone button during document review. You can talk to the AI to correct fields (e.g., "Change the middle name to Kumar") or ask questions about the form context.
                  </p>
                </div>
                {/* Custom Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('voice_agent_enabled')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-[var(--color-surface-highest)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-end pt-4">
          <Button variant="primary" type="submit" isLoading={loading}>
            <Save size={16} className="mr-2" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
