"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      setSuccess(true);
    } catch (error: any) {
      // Showing success even if not found to prevent email enumeration attacks
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center py-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--color-success)] mb-4" />
        <h2 className="text-2xl font-serif font-bold text-[var(--color-on-bg)] mb-3">Email Sent</h2>
        <p className="text-[var(--color-on-surface-variant)] mb-6">
          Check your inbox. Follow the link to reset your password.
        </p>
        <Link 
          href="/login" 
          className="text-sm px-6 py-2 border border-[var(--color-ghost-border)] rounded-md hover:bg-white/5 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <Link href="/login" className="absolute -top-12 -left-4 p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] transition-colors">
        <ArrowLeft size={20} />
      </Link>
      
      <h2 className="text-2xl font-serif font-bold text-[var(--color-on-bg)] mb-2">Reset Password</h2>
      <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
        Enter the email address associated with your account. We'll send a reset link via Firebase.
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Email Address</label>
          <input
            {...register('email')}
            type="email"
            className="w-full h-11 px-3.5 rounded-md ghost-input text-[var(--color-on-bg)] outline-none"
            placeholder="clerk@gov.in"
            disabled={loading}
          />
          {errors.email && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.email.message}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[var(--color-on-surface)] text-[var(--color-surface)] font-semibold rounded-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Email'}
          </button>
        </div>
      </form>
    </div>
  );
}
