import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Brain, Printer, Activity, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

// Categorías con íconos actualizados
const categories = [
  { id: 'diagnostico', label: 'Diagnóstico 2D', icon: Activity },
  { id: 'tomografia', label: 'Tomografía 3D', icon: Scan },
  { id: 'cefalometria', label: 'Cefalometría', icon: Brain },
  { id: 'digital', label: 'Modelos Digitales', icon: Printer },
];

const services = [
  // DIAGNÓSTICO
  {
    id: 'rx-seriada',
    category: 'diagnostico',
    title: 'Radiografía Seriada',
    subtitle: 'Periapicales de alta precisión',
    description: 'Estudio detallado pieza por pieza para visualizar lesiones periapicales, nivel óseo y morfología radicular con máxima nitidez.',
    image: '/images/services/servicio01.jpg',
    features: ['Evaluación periodontal', 'Detección de caries', 'Control de tratamientos'],
  },
  {
    id: 'panoramica',
    category: 'diagnostico',
    title: 'Panorámica Digital',
    subtitle: 'Visión integral maxilofacial',
    description: 'Panorama completo de estructuras dentarias, maxilares y senos paranasales en una sola toma con mínima radiación.',
    image: '/images/services/servicio02.jpg',
    features: ['Ortodoncia inicial', 'Cirugía de terceros molares', 'Evaluación general'],
  },
  {
    id: 'atm',
    category: 'diagnostico',
    title: 'Estudio de ATM',
    subtitle: 'Articulación Temporomandibular',
    description: 'Análisis dinámico de apertura y cierre para detectar disfunciones articulares y anomalías estructurales.',
    image: '/images/services/servicio03.jpg',
    features: ['Análisis de cóndilos', 'Disfunción articular', 'Apertura y cierre'],
  },
  
  // TOMOGRAFÍA
  {
    id: 'cbct-full',
    category: 'tomografia',
    title: 'Cone Beam Full 3D',
    subtitle: 'Reconstrucción volumétrica total',
    description: 'Tecnología Planmeca ProMax 3D para obtener volúmenes precisos con la menor dosis de radiación del mercado (Ultra Low Dose).',
    image: '/images/services/servicio08.jpg',
    features: ['Implantología guiada', 'Endodoncia compleja', 'Cirugía maxilofacial'],
  },
  {
    id: 'cbct-sect',
    category: 'tomografia',
    title: 'Tomografía Sectorizada',
    subtitle: 'Foco en la región de interés',
    description: 'Estudios de alta resolución (Endo Mode) centrados en áreas específicas para diagnósticos endodónticos milimétricos.',
    image: '/images/services/servicio05.jpg', 
    features: ['Resolución 75µm', 'Conductos calcificados', 'Fracturas radiculares'],
  },

  // CEFALOMETRÍA
  {
    id: 'lat-frente',
    category: 'cefalometria',
    title: 'Trazados Cefalométricos',
    subtitle: 'Análisis ortodóntico digital',
    description: 'Telerradiografías laterales y frontales con trazados computarizados exactos para planificación de tratamientos.',
    image: '/images/services/servicio06.jpg',
    features: ['Ricketts, Björk-Jarabak', 'McNamara', 'Steiner'],
  },
  {
    id: 'carpal',
    category: 'cefalometria',
    title: 'Carpal / Edad Ósea',
    subtitle: 'Estudio de maduración',
    description: 'Evaluación de estadios de crecimiento óseo fundamental para ortopedia y ortodoncia en pacientes en desarrollo.',
    image: '/images/services/servicio04.jpg',
    features: ['Predicción de crecimiento', 'Picos de maduración', 'Planificación ortopédica'],
  },

  // DIGITAL
  {
    id: 'modelos-3d',
    category: 'digital',
    title: 'Escaneo Intraoral 3D',
    subtitle: 'Adiós a la impresión con pasta',
    description: 'Digitalización de arcadas dentarias para archivos STL universales, listos para alineadores o prótesis.',
    image: '/images/services/servicio09.jpg',
    features: ['Archivos STL/PLY', 'Sin náuseas', 'Máxima precisión'],
  },
  {
    id: 'impresion-3d',
    category: 'digital',
    title: 'Biomodelos 3D',
    subtitle: 'Tangibilización de diagnósticos',
    description: 'Impresión de biomodelos óseos y guías quirúrgicas para planificación pre-operatoria compleja.',
    image: '/images/services/servicio07.jpg',
    features: ['Planificación quirúrgica', 'Didáctica paciente', 'Guías de implante'],
  },
];

export function ServicesSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = window.innerWidth > 1024 ? 424 : 344; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="servicios" className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
      
      {/* ══ BACKGROUND EFFECTS (TECH LIGHT) ══ */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black_70%,transparent_100%)]" />
      <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-corporate/5 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        
        {/* HEADER & CONTROLS */}
        <div className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Badge variant="default" className="mb-6 bg-white text-corporate shadow-sm border border-corporate/10">
              <Scan size={14} className="text-corporate" />
              Catálogo de Estudios
            </Badge>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black tracking-tighter text-slate-900 lg:text-7xl"
            >
              Alta Complejidad <span className="bg-gradient-to-r from-corporate to-cyan-500 bg-clip-text text-transparent">Diagnóstica</span>
            </motion.h2>
          </div>

          {/* CONTROLES DEL CARRUSEL */}
          <div className="flex gap-3 pb-2">
            <button 
              onClick={() => scroll('left')}
              className="group flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:border-corporate hover:bg-corporate hover:text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              aria-label="Anterior"
            >
              <ChevronLeft size={24} className="text-slate-600 transition-colors group-hover:text-white" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="group flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:border-corporate hover:bg-corporate hover:text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              aria-label="Siguiente"
            >
              <ChevronRight size={24} className="text-slate-600 transition-colors group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* CARRUSEL HORIZONTAL MODERNO */}
        <div className="relative -mx-6 px-6">
          {/* Contenedor con scroll horizontal */}
          <div 
            ref={scrollContainerRef}
            className="scrollbar-hide flex gap-6 overflow-x-auto scroll-smooth pb-12 pt-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {services.map((service, index) => {
              const categoryData = categories.find(c => c.id === service.category);
              const Icon = categoryData?.icon || Activity;
              
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className="group relative shrink-0 snap-start overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(14,165,233,0.3)] hover:border-corporate/30 w-[320px] md:w-[360px] lg:w-[400px]"
                >
                  {/* Imagen con efecto Tech/Luces */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
                    />
                    
                    {/* Luces/Glow sobre la imagen */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                    <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-corporate/40 blur-[40px] transition-all duration-700 group-hover:bg-cyan-400/60 group-hover:blur-[50px]" />
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-[40px] transition-all duration-700 group-hover:bg-corporate/40 group-hover:blur-[50px]" />
                    
                    {/* Icono de categoría flotante (Tech Style) */}
                    <div className="absolute left-5 top-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:scale-110 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                        <Icon size={22} className="text-white" />
                      </div>
                    </div>

                    {/* Badge de categoría */}
                    <div className="absolute bottom-5 left-5">
                      <span className="rounded-lg bg-corporate/90 border border-corporate-light/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_10px_rgba(14,165,233,0.4)] backdrop-blur-md">
                        {categoryData?.label}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="relative p-6 lg:p-8">
                    <h3 className="mb-2 text-2xl font-black text-slate-900 transition-colors group-hover:text-corporate">
                      {service.title}
                    </h3>
                    
                    <p className="mb-4 text-xs font-bold uppercase tracking-widest text-cyan-600">
                      {service.subtitle}
                    </p>

                    <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {service.description}
                    </p>

                    {/* Features */}
                    <ul className="mb-8 space-y-3">
                      {service.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 border border-cyan-200">
                            <div className="h-1.5 w-1.5 rounded-full bg-corporate shadow-[0_0_5px_rgba(14,165,233,0.8)]" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Tech */}
                    <button className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:shadow-[0_0_20px_rgba(15,23,42,0.3)]">
                      <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)]">
                        <div className="relative h-full w-8 bg-white/20" />
                      </div>
                      <span className="relative z-10">Ver detalles técnicos</span>
                      <ChevronRight size={18} className="relative z-10 transition-transform group-hover/btn:translate-x-1 text-cyan-400" />
                    </button>
                  </div>

                  {/* Borde sutil animado */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-slate-200/50 transition-all duration-500 group-hover:ring-cyan-400/50" />
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
