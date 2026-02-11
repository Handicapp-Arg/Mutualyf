import { ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import { Badge, Button } from '@/components/ui';

/**
 * Hero Section - Sección principal de CIOR
 * Diseño limpio y profesional de alto impacto.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pb-24 pt-40 lg:pb-32 lg:pt-56">
      {/* Decoraciones de fondo sutiles */}
      <div className="absolute right-0 top-0 -z-10 h-full w-1/2 rounded-l-[150px] bg-corporate/5" />
      <div className="absolute left-20 top-20 -z-10 h-72 w-72 rounded-full bg-blue-100/30 blur-[100px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        {/* Contenido - Texto */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="info">
              <Sparkles size={14} className="text-blue-400" />
              Alta Complejidad Diagnóstica
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-5xl font-black leading-[0.95] tracking-tighter text-slate-900 lg:text-7xl"
          >
            Centro de imágenes <span className="text-corporate">odontológicas</span>
            <br />y maxilofaciales
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-lg text-lg font-medium leading-relaxed text-slate-500"
          >
            Único en la región con tecnología Planmeca de última generación para diagnósticos dento-maxilo-faciales precisos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <a href="#servicios">
              <Button size="lg" className="w-full sm:w-auto">
                VER ESTUDIOS <ChevronRight size={18} />
              </Button>
            </a>
            <a href="#contact-section">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                SOLICITAR TURNO
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Imagen Estática - Profesional y Limpia */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-[500px] lg:max-w-none"
        >
          <div className="relative z-10 aspect-square overflow-hidden rounded-[3rem] shadow-2xl shadow-blue-900/10">
             {/* Imagen principal estática de alta calidad */}
            <img
              src="/images/technology/planmeca-promax-3d-classic.jpg"
              alt="Scanner Dental CIOR Planmeca"
              className="h-full w-full object-cover"
            />
            {/* Gradiente sutil para integración */}
            <div className="absolute inset-0 bg-gradient-to-t from-corporate/20 via-transparent to-transparent" />
          </div>
          
          {/* Elementos decorativos minimalistas detrás */}
          <div className="absolute -bottom-10 -right-10 -z-10 h-64 w-64 rounded-full bg-corporate/10 blur-3xl" />
          <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full border-2 border-corporate/20" />
        </motion.div>
      </div>
    </section>
  );
}
