'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

export default function RegisterForm() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
  await api.post('/register/', formData);
  setMessage('Registration successful! Redirecting to login...');
  setTimeout(() => router.push('/login'), 800);
    } catch (err) {
      const error = err as AxiosError<any>;
      // Try to extract DRF serializer errors: { field: ["msg"], non_field_errors: ["msg"] }
      const data = error.response?.data;
      if (data) {
        const parts: string[] = [];
        Object.entries(data as Record<string, any>).forEach(([key, val]) => {
          const msgs = Array.isArray(val) ? val.join(', ') : String(val);
          parts.push(`${key}: ${msgs}`);
        });
        setMessage(`Registration failed: ${parts.join(' | ')}`);
      } else {
        setMessage(`Registration failed. ${error.message ?? ''}`);
      }
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
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
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
        Register
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  );
}