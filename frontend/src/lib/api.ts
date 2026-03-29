import axios from 'axios';
import { auth } from './firebase';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (e) {
      // Ignored: fallback to dev token if token fetching fails
    }
  }
  
  // Dev Bypass Fallback
  if (typeof window !== 'undefined') {
    const devToken = localStorage.getItem('dev_token');
    if (devToken) {
      config.headers.Authorization = `Bearer ${devToken}`;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const user = auth.currentUser;
      if (user) {
        try {
          // Force refresh
          const token = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, sign out
          await auth.signOut();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
