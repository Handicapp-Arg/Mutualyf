import { MapPin, Phone, Mail, Clock } from 'lucide-react';

import { siteConfig } from '@/config/site';

/**
 * Footer de CIOR
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 pb-12 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Main Footer Content */}
        <div className="grid gap-12 border-b border-white/5 pb-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <img src="/images/logo/logo.png" alt="CIOR" className="mb-6 h-12 w-auto" />
            <p className="mb-6 max-w-md text-sm font-medium text-white/70">
              {siteConfig.fullName}. Centro de excelencia en diagnóstico por imágenes
              odontológicas con tecnología de vanguardia.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-white/50">
              Contacto
            </h4>
            <div className="space-y-4">
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="flex items-center gap-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                <Phone size={16} className="text-blue-400" />
                {siteConfig.contact.phone}
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                <Mail size={16} className="text-blue-400" />
                {siteConfig.contact.email}
              </a>
            </div>
          </div>

          {/* Location & Hours */}
          <div>
            <h4 className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-white/50">
              Ubicación
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm font-medium text-white/80">
                <MapPin size={16} className="mt-0.5 text-blue-400" />
                <div>{siteConfig.locations[0].fullAddress}</div>
              </div>
              <div className="flex items-start gap-3 text-sm font-medium text-white/80">
                <Clock size={16} className="mt-0.5 text-blue-400" />
                <div>
                  <div>{siteConfig.schedule.weekdays}</div>
                  <div className="text-xs text-white/60">{siteConfig.schedule.hours}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col items-center justify-between gap-6 pt-8 text-xs text-slate-600 md:flex-row">
          <div className="font-bold tracking-wider">
            © {currentYear} {siteConfig.name.toUpperCase()} IMÁGENES • Rosario, Santa Fe
          </div>
          <div className="flex gap-8">
            <a href="#terminos" className="font-bold transition-colors hover:text-white">
              Términos
            </a>
            <a
              href="#privacidad"
              className="font-bold transition-colors hover:text-white"
            >
              Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
