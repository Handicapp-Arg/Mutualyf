import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
      navigate('/portal/conversations', { replace: true });
    } catch {
      // Error ya se maneja en el store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-corporate/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-corporate/[0.04] blur-3xl" />
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-corporate/60 via-corporate to-corporate/60" />
      </div>

      {/* Volver */}
      <Link
        to="/"
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-corporate"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
          {/* Header con logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="/images/logo/logo-mutualyf.png"
              alt="Mutual Luz y Fuerza"
              className="mb-5 h-16 w-auto"
            />
            <h1 className="text-xl font-bold text-slate-800">Panel de Administracion</h1>
            <p className="mt-1 text-sm text-slate-400">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-600">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all focus:border-corporate focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-600">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all focus:border-corporate focus:bg-white focus:outline-none focus:ring-2 focus:ring-corporate/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-corporate px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-corporate/25 transition-all hover:shadow-xl hover:shadow-corporate/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* Acceso rápido demo */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-center text-xs font-medium text-slate-400">Acceso rápido</p>
            <button
              type="button"
              onClick={() => { setEmail('admin@mutualyf.com'); setPassword('123456'); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-100"
            >
              <span className="block font-semibold text-slate-700">Administrador</span>
              <span className="text-xs text-slate-400">admin@mutualyf.com</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs font-medium text-slate-300">
          &copy; {new Date().getFullYear()} Mutual Luz y Fuerza
        </p>
      </div>
    </div>
  );
}
