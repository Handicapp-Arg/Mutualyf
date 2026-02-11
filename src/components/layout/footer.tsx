import { Activity } from 'lucide-react';

import { siteConfig } from '@/config/site';

/**
 * Footer de CIOR
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 pb-12 pt-24 text-white">
      <div className="mx-auto max-w-7xl space-y-12 px-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-blue-500" />
          <span className="text-3xl font-black tracking-tighter">
            {siteConfig.name}
          </span>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-12 text-[10px] font-black tracking-[0.4em] text-slate-600 md:flex-row">
          <span>
            © {currentYear} {siteConfig.name.toUpperCase()} IMÁGENES •
            INNOVACIÓN DIGITAL
          </span>
          <div className="flex gap-10">
            <a
              href="#terminos"
              className="cursor-pointer transition-colors hover:text-white"
            >
              TÉRMINOS
            </a>
            <a
              href="#privacidad"
              className="cursor-pointer transition-colors hover:text-white"
            >
              PRIVACIDAD
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
