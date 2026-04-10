import { useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui';

/**
 * Hero Section  Video Background cinematográfico
 */
export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true; // Forzamos mute
      v.play().catch(() => {});
    }
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950">
      {/*  VIDEO BACKGROUND  */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-105 object-cover" // scale-105 para evitar bordes blancos
        src="/images/hero1.mp4"
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
      />

      {/*  OVERLAY MULTICAPA (Mejorado para legibilidad UI Senior)  */}

      {/* Capa base de oscurecimiento general para bajar el brillo del video */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Gradiente lateral izquierdo fuerte para el texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />

      {/* Gradiente superior para asegurar legibilidad del Navbar */}
      <div className="absolute left-0 right-0 top-0 z-10 h-40 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent" />

      {/* Gradiente inferior para transición suave */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

      {/* Tinte corporativo muy sutil para unificar tono */}
      <div className="absolute inset-0 bg-corporate/20 mix-blend-overlay" />

      {/* Grain Texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '200px',
        }}
      />

      {/*  CONTENIDO PRINCIPAL  */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-32 lg:pt-40">
        <div className="max-w-4xl space-y-10">
          {/* Tag superior */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
              Centro de Diagnóstico Digital
            </span>
          </motion.div>

          {/* Título principal - UI Senior: Typography Scale */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-black leading-[0.95] tracking-tighter text-white sm:text-6xl md:text-7xl lg:text-8xl"
          >
            Imágenes que <br className="hidden sm:block" />
            <span className="gradient-text pb-2">transforman</span> <br />
            diagnósticos.
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-xl text-lg font-medium leading-relaxed text-slate-300/90 md:text-xl"
          >
            Tecnología Planmeca de última generación y resultados inmediatos. La precisión
            que tu salud merece, sin esperas.
          </motion.p>

          {/* CTAs - Diseño Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col gap-5 sm:flex-row"
          >
            <a href="#servicios">
              <Button
                size="lg"
                className="group h-14 w-full gap-3 bg-white px-8 text-base text-slate-950 hover:bg-zinc-200 sm:w-auto"
              >
                Ver estudios disponibles
                <ChevronRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </a>
            <a href="#contacto">
              <Button
                variant="secondary"
                size="lg"
                className="h-14 w-full border border-white/20 bg-white/5 text-base text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 sm:w-auto"
              >
                Contactar ahora
              </Button>
            </a>
          </motion.div>
        </div>
      </div>

      {/*  SCROLL INDICATOR  */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 md:block"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
            Scroll
          </span>
          <div className="h-12 w-[1px] overflow-hidden bg-white/10">
            <div
              className="h-1/2 w-full bg-gradient-to-b from-transparent via-white to-transparent"
              style={{ animation: 'scroll-line 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
