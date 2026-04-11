import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      await login(email, password);
      navigate('/portal/dashboard', { replace: true });
    } catch {
      // Error ya se maneja en el store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">CIOR</h1>
            <p className="mt-1 text-sm text-gray-400">Panel de Administración</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="admin@cior.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
