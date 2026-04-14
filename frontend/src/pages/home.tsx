import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { NexusBot } from '@/features/nexus-bot';

/**
 * Pagina Principal - Mutual Luz y Fuerza Demo
 */
export function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-white to-corporate/[0.06] font-sans text-slate-900">
      {/* Franja superior */}
      <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-corporate/80 via-corporate to-corporate/80" />

      {/* Bloque rojo decorativo lateral */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-corporate/[0.06] blur-3xl" />
        <div className="absolute -left-60 bottom-0 h-[350px] w-[350px] rounded-full bg-corporate/[0.04] blur-3xl" />
        <div className="absolute bottom-20 right-20 h-[250px] w-[250px] rounded-full bg-corporate/[0.05] blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <img
          src="/images/logo/logo-mutualyf.png"
          alt="Mutual Luz y Fuerza"
          className="h-10 w-auto sm:h-12"
        />
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-corporate/20 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-corporate shadow-sm transition-all hover:bg-corporate hover:text-white hover:shadow-md active:scale-95"
        >
          <LogIn size={14} />
          Ingresar
        </Link>
      </header>

      {/* Contenido centrado */}
      <main className="relative flex min-h-[calc(100vh-160px)] flex-col items-center justify-center px-6">
        {/* Acento rojo detras del titulo */}
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-corporate/[0.07] blur-3xl" />

        <h1 className="relative mb-3 text-center text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl md:text-5xl">
          Mutual <span className="text-corporate">Luz y Fuerza</span>
        </h1>

        <div className="mb-8 h-1 w-16 rounded-full bg-corporate/40" />

        <p className="mb-10 max-w-md text-center text-base font-medium text-slate-400 sm:text-lg">
          Plataforma de asistencia virtual
        </p>

        {/* Badge demo */}
        <div className="inline-flex items-center gap-2 rounded-full bg-corporate/10 px-5 py-2.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-corporate" />
          <span className="text-xs font-bold uppercase tracking-widest text-corporate">
            Demo en vivo
          </span>
        </div>
      </main>

      {/* Footer con franja */}
      <footer className="absolute bottom-0 w-full border-t border-corporate/10 bg-corporate/[0.02] py-5 text-center">
        <p className="text-xs font-medium tracking-wider text-slate-400">
          &copy; {new Date().getFullYear()} Mutual Luz y Fuerza
        </p>
      </footer>

      <NexusBot />
    </div>
  );
}
