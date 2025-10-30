'use client';

import { useState } from 'react';
import { login } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginForm() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { setToken } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tokens = await login(formData);
      await setToken(tokens.access);
      setMessage('Login successful! Redirecting...');
      setTimeout(() => router.push('/'), 500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Login failed';
      setMessage(String(detail));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="username"
        placeholder="Username"
        value={formData.username}
        onChange={handleChange}
        className="block w-full border rounded px-3 py-2"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        className="block w-full border rounded px-3 py-2"
      />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
        Login
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  );
}
