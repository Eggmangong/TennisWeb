import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <LoginForm />
    </div>
  );
}