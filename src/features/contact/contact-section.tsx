import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ExternalLink,
  Navigation,
} from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Contact Section - Sección de Contacto CIOR
 * Diseño ultra moderno 2026 con mapa interactivo
 */
export function ContactSection() {
  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/${siteConfig.contact.whatsapp}?text=Hola, quiero solicitar un turno`,
      '_blank'
    );
  };

  const handleMap = () => {
    const location = siteConfig.locations[0];
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`,
      '_blank'
    );
  };

  return (
    <section
      id="contacto"
      className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-corporate py-32"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Glowing orbs */}
      <div className="absolute left-20 top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-[150px]" />
      <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge variant="info" className="mb-6 border-white/20 bg-white/10">
            <MessageCircle size={14} className="text-cyan-400" />
            <span className="text-white">Estamos para ayudarte</span>
          </Badge>

          <h2 className="mb-6 text-5xl font-black tracking-tighter text-white lg:text-7xl">
            Contacto <span className="text-cyan-400">& Ubicación</span>
          </h2>

          <p className="mx-auto max-w-2xl text-xl font-medium text-white/80">
            Comunicate con nosotros para turnos, consultas o más información.
          </p>
        </div>

        {/* Grid de Info */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Columna Info */}
          <div className="space-y-6">
            {/* Card de Dirección */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/10">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-blue-500/20 to-transparent blur-3xl transition-all group-hover:scale-150" />

              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                  <MapPin size={28} />
                </div>

                <h3 className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-blue-400">
                  Dirección
                </h3>

                <p className="mb-1 text-2xl font-black text-white">
                  {siteConfig.locations[0].address}
                </p>
                <p className="mb-4 text-lg font-medium text-white/70">
                  {siteConfig.locations[0].postalCode}{' '}
                  {siteConfig.locations[0].city},{' '}
                  {siteConfig.locations[0].province}
                </p>

                <button
                  onClick={handleMap}
                  className="group/btn flex items-center gap-2 text-sm font-bold text-cyan-400 transition-all hover:gap-3"
                >
                  Ver en Google Maps
                  <Navigation size={16} className="transition-transform group-hover/btn:rotate-45" />
                </button>
              </div>
            </div>

            {/* Card de Teléfonos */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/10">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-green-500/20 to-transparent blur-3xl transition-all group-hover:scale-150" />

              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20 text-green-400">
                  <Phone size={28} />
                </div>

                <h3 className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-green-400">
                  Teléfonos
                </h3>

                <div className="space-y-3">
                  <a
                    href={`tel:${siteConfig.contact.phone}`}
                    className="block text-xl font-bold text-white transition-colors hover:text-green-400"
                  >
                    {siteConfig.contact.phone}
                  </a>
                  <a
                    href={`tel:${siteConfig.contact.phoneSecondary}`}
                    className="block text-xl font-bold text-white transition-colors hover:text-green-400"
                  >
                    {siteConfig.contact.phoneSecondary}
                  </a>
                </div>

                {/* WhatsApp CTA */}
                <button
                  onClick={handleWhatsApp}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-green-500 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-green-500/30 transition-all hover:scale-105 hover:bg-green-600 hover:shadow-xl active:scale-95"
                >
                  <MessageCircle size={20} />
                  Turnos por WhatsApp
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs">
                    {siteConfig.contact.whatsappDisplay}
                  </span>
                </button>
              </div>
            </div>

            {/* Card de Email */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-white/5 p-8 backdrop-blur-xl transition-all hover:bg-white/10">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-purple-500/20 to-transparent blur-3xl transition-all group-hover:scale-150" />

              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400">
                  <Mail size={28} />
                </div>

                <h3 className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-purple-400">
                  Email
                </h3>

                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="block text-xl font-bold text-white transition-colors hover:text-purple-400"
                >
                  {siteConfig.contact.email}
                </a>
              </div>
            </div>
          </div>

          {/* Columna Horarios + Mapa */}
          <div className="space-y-6">
            {/* Card de Horarios */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">
              <div className="absolute right-0 top-0 h-40 w-40 -translate-y-10 translate-x-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl transition-all group-hover:scale-150" />

              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
                  <Clock size={28} />
                </div>

                <h3 className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
                  Horarios de Atención
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-black text-white">
                        {siteConfig.schedule.weekdays}
                      </div>
                      <div className="text-3xl font-black text-cyan-400">
                        {siteConfig.schedule.hours}
                      </div>
                    </div>
                    <div className="rounded-full bg-green-500/20 px-4 py-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-green-400">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                        Abierto
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-white/70">Sábados</span>
                      <span className="font-black text-white/50">
                        {siteConfig.schedule.saturday}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="font-bold text-white/70">Domingos</span>
                      <span className="font-black text-white/50">
                        {siteConfig.schedule.sunday}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa placeholder con estilo moderno */}
            <div className="group relative overflow-hidden rounded-[3rem] bg-white/5 p-2 backdrop-blur-xl">
              <div
                onClick={handleMap}
                className="relative flex h-96 cursor-pointer items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-900 transition-all hover:scale-[0.98]"
              >
                {/* Placeholder con patrón */}
                <div className="absolute inset-0 opacity-20">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                      backgroundSize: '30px 30px',
                    }}
                  />
                </div>

                <div className="relative text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20">
                    <MapPin size={40} className="text-blue-400" />
                  </div>
                  <div className="text-xl font-black text-white">
                    Ver ubicación en Google Maps
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/60">
                    Balcarce 1001, Rosario
                  </div>
                  <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600">
                    Abrir Mapa
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="mt-12 text-center">
          <div className="mx-auto max-w-3xl rounded-[3rem] border border-white/10 bg-white/5 p-12 backdrop-blur-xl">
            <h3 className="mb-4 text-3xl font-black text-white">
              ¿Necesitás un turno?
            </h3>
            <p className="mb-8 text-lg font-medium text-white/80">
              Contactanos por WhatsApp y te respondemos al instante.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-green-500 px-10 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-green-500/30 transition-all hover:scale-105 hover:bg-green-600 active:scale-95"
              >
                <MessageCircle size={20} />
                WhatsApp Turnos
              </button>
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-white/20 bg-white/5 px-10 py-5 text-sm font-black uppercase tracking-widest text-white backdrop-blur-xl transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
              >
                <Phone size={20} />
                Llamar Ahora
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
