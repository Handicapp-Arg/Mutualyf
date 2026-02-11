import { ChevronRight, Sparkles } from 'lucide-react';

import { Badge, Button } from '@/components/ui';

/**
 * Hero Section - Sección principal de CIOR
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-32 lg:pb-32 lg:pt-52">
      {/* Decoraciones de fondo */}
      <div className="absolute right-0 top-0 -z-10 h-full w-1/2 rounded-l-[150px] bg-corporate/5" />
      <div className="absolute left-20 top-20 -z-10 h-72 w-72 rounded-full bg-blue-100/30 blur-[100px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        {/* Contenido */}
        <div className="space-y-8">
          <Badge variant="info">
            <Sparkles size={14} className="text-blue-400" />
            Inteligencia en Diagnóstico
          </Badge>

          <h1 className="text-6xl font-black leading-[0.9] tracking-tighter text-slate-900 lg:text-8xl">
            El futuro de tu <br />
            <span className="text-corporate">salud dental.</span>
          </h1>

          <p className="max-w-lg text-xl font-medium leading-relaxed text-slate-500">
            Centro de excelencia en imágenes odontológicas con tecnología de
            escaneo volumétrico 3D.
          </p>

          <div className="flex flex-col gap-5 sm:flex-row">
            <Button size="lg">
              VER ESTUDIOS <ChevronRight size={18} />
            </Button>
            <Button variant="secondary" size="lg">
              NUESTRAS SEDES
            </Button>
          </div>
        </div>

        {/* Imagen */}
        <div className="group relative">
          <div className="scan-effect relative z-10 aspect-square overflow-hidden rounded-[4rem] border-[15px] border-white shadow-2xl lg:h-[600px]">
            <img
              src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=1000"
              className="h-full w-full object-cover grayscale-[0.2] transition-all duration-1000 group-hover:grayscale-0"
              alt="Scanner Dental CIOR"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-corporate/40 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
