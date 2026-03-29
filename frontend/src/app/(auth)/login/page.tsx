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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser, setRole } = useAppStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      let token = "";
      const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-key";
      
      if (!isMock) {
        const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        token = await userCredential.user.getIdToken();
      } else {
        token = data.email.includes('admin') ? 'test_admin_token' : 'test_clerk_token';
        localStorage.setItem('dev_token', token);
        await new Promise(r => setTimeout(r, 600)); // Simulate network request for UX
      }
      
      // Get role from backend
      const response = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });

      if (response.data?.uid) {
        setUser(response.data);
        setRole(response.data.role);
        
        toast.success(`Welcome back, ${response.data.name}`);
        
        if (response.data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/upload');
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Cannot connect to backend server. Is it running on port 8000?');
      } else {
        toast.error(error.response?.data?.detail || error.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-serif font-bold text-[var(--color-on-bg)] mb-6 text-center">Welcome Back</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Email Address</label>
          <input
            {...register('email')}
            type="email"
            className="w-full h-11 px-3.5 rounded-md ghost-input text-[var(--color-on-bg)] w-full outline-none"
            placeholder="clerk@gov.in"
            disabled={loading}
          />
          {errors.email && <p className="mt-1 text-sm text-[var(--color-error)]">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">Password</label>
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
          <div className="flex justify-between items-center mt-1">
            {errors.password ? (
              <p className="text-sm text-[var(--color-error)]">{errors.password.message}</p>
            ) : <span />}
            <Link href="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline ghost-button p-0">
              Forgot Password?
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[var(--color-on-surface)] text-[var(--color-surface)] font-semibold rounded-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-on-surface-variant)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[var(--color-primary)] hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
