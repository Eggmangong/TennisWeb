'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';

function LoginRegisterPageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const initialTab = (search.get('tab') === 'register' ? 'register' : 'login') as 'login' | 'register';
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Keep URL in sync when tab changes (without full navigation)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(search.entries()));
    params.set('tab', tab);
    router.replace(`/login/register?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const isLogin = tab === 'login';

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login / Register</h1>

      <div className="mb-4 inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border rounded-l-md ${isLogin ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setTab('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border rounded-r-md ${!isLogin ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          onClick={() => setTab('register')}
        >
          Register
        </button>
      </div>

      {isLogin ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}

export default function LoginRegisterPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-10">Loading…</div>}>
      <LoginRegisterPageInner />
    </Suspense>
  );
}
