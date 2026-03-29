import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'clerk' | 'admin' | null;

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
  preferred_language?: string;
  voice_mode_enabled?: boolean;
  voice_agent_enabled?: boolean;
}

interface AppState {
  user: UserProfile | null;
  role: Role;
  sessionId: string | null;
  cleanedImageUrl: string | null;
  extractedFields: any[] | null;
  templateSchema: any[] | null;
  setUser: (user: UserProfile | null) => void;
  setRole: (role: Role) => void;
  setSessionId: (id: string | null) => void;
  setPipelineData: (data: { cleanedImageUrl?: string; extractedFields?: any[]; templateSchema?: any[] }) => void;
  clearSession: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      sessionId: null,
      cleanedImageUrl: null,
      extractedFields: null,
      templateSchema: null,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setSessionId: (id) => set({ sessionId: id }),
      setPipelineData: (data) => set((state) => ({ ...state, ...data })),
      clearSession: () => set({ sessionId: null, cleanedImageUrl: null, extractedFields: null, templateSchema: null }),
      logout: () => set({ user: null, role: null, sessionId: null, cleanedImageUrl: null, extractedFields: null, templateSchema: null })
    }),
    {
      name: 'pt-state',
      partialize: (state) => ({ sessionId: state.sessionId, user: state.user, role: state.role, cleanedImageUrl: state.cleanedImageUrl, extractedFields: state.extractedFields, templateSchema: state.templateSchema }),
    }
  )
);
