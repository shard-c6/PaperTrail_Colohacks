"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { api } from '@/lib/api';
import PasswordStrengthBar from '@/components/auth/PasswordStrengthBar';
import { useAppStore } from '@/store/useAppStore';

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address."),
  preferredLanguage: z.enum(["en-IN", "hi-IN", "mr-IN"]),
  password: z.string()
    .max(12, "Password must be 12 characters or fewer.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number.")
    .refine((val) => (val.match(/[^A-Za-z0-9]/g) || []).length === 1, {
      message: "Include exactly one special character."
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser, setRole } = useAppStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange'
  });

  const passwordValue = watch('password') || '';

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      let token = "";
      const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-key";
      
      if (!isMock) {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        token = await userCredential.user.getIdToken();
        // Sign out immediately so they have to log in again on the /login page
        await auth.signOut();
      } else {
        token = data.email.includes('admin') ? 'test_admin_token' : 'test_clerk_token';
        await new Promise(r => setTimeout(r, 600)); // Simulate network request for UX
      }
      
      const response = await api.post('/auth/register', {
        name: data.fullName,
        email: data.email,
        preferred_language: data.preferredLanguage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.uid) {
        toast.success('Account created successfully. Please sign in.');
        router.push('/login');
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Cannot connect to backend server. Is it running on port 8000?');
      } else {
        toast.error(error.response?.data?.detail || error.message || 'Failed to create account. Please contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-serif font-bold text-[var(--color-on-bg)] mb-6 text-center">Create Account</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Full Name</label>
          <input
            {...register('fullName')}
            type="text"
            className="w-full h-11 px-3.5 rounded-md ghost-input text-[var(--color-on-bg)] outline-none"
            placeholder="Ramesh Kumar"
            disabled={loading}
          />
          {errors.fullName && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.fullName.message}</p>}
        </div>

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

        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Preferred Spoken Language</label>
          <select
            {...register('preferredLanguage')}
            className="w-full h-11 px-3.5 rounded-md ghost-input text-[var(--color-on-bg)] outline-none appearance-none"
            disabled={loading}
          >
            <option value="en-IN" className="bg-[var(--color-surface-low)]">English (India)</option>
            <option value="hi-IN" className="bg-[var(--color-surface-low)]">Hindi (India)</option>
            <option value="mr-IN" className="bg-[var(--color-surface-low)]">Marathi (India)</option>
          </select>
          {errors.preferredLanguage && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.preferredLanguage.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Create Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="w-full h-11 px-3.5 pr-10 rounded-md ghost-input text-[var(--color-on-bg)] outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordStrengthBar password={passwordValue} />
          {errors.password && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Confirm Password</label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              className="w-full h-11 px-3.5 pr-10 rounded-md ghost-input text-[var(--color-on-bg)] outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)]"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.confirmPassword.message}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[var(--color-on-surface)] text-[var(--color-surface)] font-semibold rounded-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign Up'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-on-surface-variant)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
