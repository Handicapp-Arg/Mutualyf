import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

import { Badge } from '@/components/ui';
import { siteConfig } from '@/config/site';

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

  return (
    <section
      id="contacto"
      className="relative overflow-hidden bg-slate-900 py-24 lg:py-32"
    >
      {/* Background Pattern - Dark Mode Tech */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />

      {/* Orbs sutiles */}
      <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-[100px]" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge
            variant="outline"
            className="mb-6 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
          >
            <MessageCircle size={14} className="mr-2 text-cyan-400" />
            Estamos para ayudarte
          </Badge>

          <h2 className="mb-6 text-2xl font-black tracking-tighter text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Contacto y{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Ubicación
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Visitanos en nuestro centro o contactanos por cualquiera de nuestros canales
            digitales.
          </p>
        </div>

        {/* Grid Principal */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna 1: Info Rápida */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* WhatsApp - Highlighted */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-white shadow-2xl backdrop-blur-sm transition-all hover:translate-y-[-4px] hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl transition-transform group-hover:scale-150" />

              <div className="relative z-10">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30">
                  <MessageCircle size={24} />
                </div>

                <h3 className="text-lg font-bold">Turnos por WhatsApp</h3>
                <p className="mt-2 text-slate-400">Respuesta inmediata</p>
                <div className="mt-4 text-2xl font-black tracking-tight">
                  {siteConfig.contact.whatsappDisplay}
                </div>

                <button
                  onClick={handleWhatsApp}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 text-sm font-bold uppercase tracking-wide transition-all hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                >
                  Enviar Mensaje <ExternalLink size={16} />
                </button>
              </div>
            </div>

            {/* Teléfonos y Mail */}
            <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Teléfonos Fijos</h4>
                  <div className="mt-1 flex flex-col gap-1">
                    <a
                      href={`tel:${siteConfig.contact.phone}`}
                      className="font-medium text-slate-400 transition-colors hover:text-cyan-400"
                    >
                      {siteConfig.contact.phone}
                    </a>
                    <a
                      href={`tel:${siteConfig.contact.phoneSecondary}`}
                      className="font-medium text-slate-400 transition-colors hover:text-cyan-400"
                    >
                      {siteConfig.contact.phoneSecondary}
                    </a>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Email</h4>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="mt-1 block font-medium text-slate-400 transition-colors hover:text-cyan-400"
                  >
                    {siteConfig.contact.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Columna 2: Ubicación y Horarios */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Mapa Large */}
            <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:h-[400px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.291703274296!2d-60.65288282346914!3d-32.94318997359461!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95b7ab40c6a85073%3A0x3344601441865c36!2sBalcarce%201001%2C%20S2000%20Rosario%2C%20Santa%20Fe!5e0!3m2!1ses-419!2sar!4v1708453956384!5m2!1ses-419!2sar"
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter: 'invert(90%) hue-rotate(180deg) contrast(90%)',
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa de Ubicación CIOR"
                className="opacity-80 transition-all duration-500 hover:opacity-100 hover:filter-none"
              />
            </div>

            {/* Info bajo mapa */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Dirección Texto */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md transition-all hover:bg-white/10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <MapPin size={20} />
                  </div>
                  <h3 className="font-bold text-white">Ubicación</h3>
                </div>
                <p className="text-lg font-medium text-white">
                  {siteConfig.locations[0].address}
                </p>
                <p className="text-slate-400">
                  {siteConfig.locations[0].postalCode} {siteConfig.locations[0].city},{' '}
                  {siteConfig.locations[0].province}
                </p>
              </div>

              {/* Horarios */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md transition-all hover:bg-white/10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Clock size={20} />
                  </div>
                  <h3 className="font-bold text-white">Horarios</h3>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {siteConfig.schedule.weekdays}
                    </p>
                    <p className="text-2xl font-black text-cyan-400">
                      {siteConfig.schedule.hours}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-bold uppercase text-green-400">
                      Abierto
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
