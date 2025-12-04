import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Consolidated into /login/register with tabs; keep compatibility by redirecting
  redirect('/login/register?tab=login');
}