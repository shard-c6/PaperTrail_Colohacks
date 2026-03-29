"use client";

import { useState } from 'react';
import { User, Lock, Mail, Building, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import PasswordStrengthBar from '@/components/auth/PasswordStrengthBar';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';

// Password Schema matching signup rules
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .max(12, "Password must be 12 characters or fewer.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number.")
    .refine((val) => (val.match(/[^A-Za-z0-9]/g) || []).length === 1, {
      message: "Include exactly one special character."
    }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

// Mock data for templates
const mockTemplates = [
  { id: 'TPL-882', name: 'Birth Registration Form A', submitted: '2026-03-27', status: 'approved' },
  { id: 'TPL-883', name: 'Vehicle Tax Return', submitted: '2026-03-28', status: 'pending' },
  { id: 'TPL-884', name: 'Passport App Page 2', submitted: '2026-03-25', status: 'rejected', reason: 'Bounding boxes for the signature field overlap with the date field. Please redraw the annotations cleanly.' },
];

export default function ProfilePage() {
  const { user, role, setUser } = useAppStore();
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [savingPrefs, setSavingPrefs] = useState(false);
  
  // Local state for prefs
  const [prefs, setPrefs] = useState({
    preferred_language: user?.preferred_language || 'en-IN',
    voice_mode_enabled: user?.voice_mode_enabled || false,
    voice_agent_enabled: user?.voice_agent_enabled || false,
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordValue = watch('newPassword') || '';

  const onChangePassword = async (data: PasswordForm) => {
    // Simulate Firebase reauthenticateWithCredential & updatePassword
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Password updated successfully.');
    setPasswordModalOpen(false);
    reset();
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const response = await api.patch('/users/me/preferences', prefs);
      if (response.data.success) {
        toast.success("Preferences updated successfully");
        if (user) {
          setUser({
            ...user,
            ...response.data.data
          });
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail?.message || "Failed to update preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'approved') return <span className="bg-[var(--color-success-bg)]/10 text-[var(--color-success)] px-3 py-1 rounded-full text-xs font-bold uppercase">Approved</span>;
    if (status === 'pending') return <span className="bg-[var(--color-warning-bg)]/10 text-[var(--color-warning)] px-3 py-1 rounded-full text-xs font-bold uppercase">Pending</span>;
    return <span className="bg-[var(--color-error-container)]/20 text-[var(--color-error)] px-3 py-1 rounded-full text-xs font-bold uppercase">Rejected</span>;
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
      <h1 className="text-3xl font-serif font-bold text-white mb-6">User Dashboard</h1>

      {/* Profile Card */}
      <GlassCard className="flex flex-col md:flex-row items-start md:items-center gap-6 p-8">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary-container)] border-2 border-[var(--color-primary)] text-[var(--color-primary)] flex items-center justify-center text-3xl font-bold font-mono shrink-0">
          {initials}
        </div>
        
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold text-white">{user?.name || 'User Profile'}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
              <User size={16} />
              <span className="font-mono">{user?.uid || 'USR-0000'}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
              <Mail size={16} />
              <span>{user?.email || 'email@gov.in'}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
              <Building size={16} />
              <span>Dept. of Revenue</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
              <div className="w-4 h-4 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center border border-[var(--color-primary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></div>
              </div>
              <span className="uppercase text-[var(--color-primary)] font-bold text-xs">{role || 'clerk'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 w-full md:w-auto">
          <Button variant="secondary" onClick={() => setPasswordModalOpen(true)} className="w-full md:w-auto">
            <Lock size={16} className="mr-2" /> Change Password
          </Button>
        </div>
      </GlassCard>

      {/* Voice & Accessibility Preferences */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-serif font-bold text-white">Voice & Accessibility</h3>
          <Button variant="primary" size="sm" onClick={handleSavePreferences} isLoading={savingPrefs}>
            Save Preferences
          </Button>
        </div>

        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">Preferred Application Language</label>
                <select 
                  value={prefs.preferred_language}
                  onChange={(e) => setPrefs(prev => ({ ...prev, preferred_language: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-md ghost-input text-white outline-none appearance-none"
                >
                  <option value="en-IN" className="bg-[#121A20]">English (India)</option>
                  <option value="hi-IN" className="bg-[#121A20]">Hindi (India)</option>
                  <option value="mr-IN" className="bg-[#121A20]">Marathi (India)</option>
                </select>
                <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">This affects translation labels, playback voice modules, and the AI agent language base.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    id="voiceModeToggle"
                    className="w-4 h-4 accent-[var(--color-primary)] rounded"
                    checked={prefs.voice_mode_enabled}
                    onChange={(e) => setPrefs(prev => ({ ...prev, voice_mode_enabled: e.target.checked }))}
                  />
                </div>
                <div>
                  <label htmlFor="voiceModeToggle" className="block text-sm font-medium text-white cursor-pointer mb-1">Text-to-Speech (TTS) Announcements</label>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">If enabled, the verification page will automatically read aloud required focus points or validation anomalies.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    id="voiceAgentToggle"
                    className="w-4 h-4 accent-[var(--color-primary)] rounded"
                    checked={prefs.voice_agent_enabled}
                    onChange={(e) => setPrefs(prev => ({ ...prev, voice_agent_enabled: e.target.checked }))}
                  />
                </div>
                <div>
                  <label htmlFor="voiceAgentToggle" className="block text-sm font-medium text-white cursor-pointer mb-1">Enable AI Voice Agent</label>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Activates the microphone button in the verifier. Ask questions about the current record, and the assistant will reply in your preferred language.</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Templates Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-serif font-bold text-white">My Template Submissions</h3>
          <Button variant="primary" size="sm" onClick={() => toast('Template Wizard launching soon!')}>
            <Plus size={16} className="mr-1" /> New Template
          </Button>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-ghost-border)]">
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Template ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Form Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-ghost-border)]">
                {mockTemplates.map((template) => (
                  <React.Fragment key={template.id}>
                    <tr className="hover:bg-[var(--color-surface-highest)]/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-white">{template.id}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">{template.name}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{template.submitted}</td>
                      <td className="px-6 py-4"><StatusBadge status={template.status} /></td>
                      <td className="px-6 py-4 text-right">
                        {template.status === 'rejected' ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => toggleRow(template.id)}>
                            {expandedRows[template.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </Button>
                        ) : (
                          <span className="text-[var(--color-on-surface-variant)] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedRows[template.id] && template.reason && (
                      <tr className="bg-[var(--color-error-container)]/10 border-l-2 border-l-[var(--color-error)]">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="flex flex-col text-sm">
                            <span className="font-bold text-[var(--color-error)] mb-1">Rejection Reason:</span>
                            <span className="text-[var(--color-error)]/90">{template.reason}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change Password">
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Current Password</label>
            <input
              {...register('currentPassword')}
              type="password"
              className="w-full h-11 px-3.5 rounded-md ghost-input text-white outline-none"
              placeholder="••••••••"
            />
            {errors.currentPassword && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.currentPassword.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">New Password</label>
            <input
              {...register('newPassword')}
              type="password"
              className="w-full h-11 px-3.5 rounded-md ghost-input text-white outline-none"
              placeholder="••••••••"
            />
            <PasswordStrengthBar password={newPasswordValue} />
            {errors.newPassword && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Confirm New Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className="w-full h-11 px-3.5 rounded-md ghost-input text-white outline-none"
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.confirmPassword.message}</p>}
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setPasswordModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
