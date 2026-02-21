import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  Brain,
  Printer,
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

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
    description:
      'Estudio detallado pieza por pieza para visualizar lesiones periapicales, nivel óseo y morfología radicular con máxima nitidez.',
    image: '/images/services/servicio01.jpg',
    features: [
      'Evaluación periodontal',
      'Detección de caries',
      'Control de tratamientos',
    ],
  },
  {
    id: 'panoramica',
    category: 'diagnostico',
    title: 'Panorámica Digital',
    subtitle: 'Visión integral maxilofacial',
    description:
      'Panorama completo de estructuras dentarias, maxilares y senos paranasales en una sola toma con mínima radiación.',
    image: '/images/services/servicio02.jpg',
    features: ['Ortodoncia inicial', 'Cirugía de terceros molares', 'Evaluación general'],
  },
  {
    id: 'atm',
    category: 'diagnostico',
    title: 'Estudio de ATM',
    subtitle: 'Articulación Temporomandibular',
    description:
      'Análisis dinámico de apertura y cierre para detectar disfunciones articulares y anomalías estructurales.',
    image: '/images/services/servicio03.jpg',
    features: ['Análisis de cóndilos', 'Disfunción articular', 'Apertura y cierre'],
  },

  // TOMOGRAFÍA
  {
    id: 'cbct-full',
    category: 'tomografia',
    title: 'Cone Beam Full 3D',
    subtitle: 'Reconstrucción volumétrica total',
    description:
      'Tecnología Planmeca ProMax 3D para obtener volúmenes precisos con la menor dosis de radiación del mercado (Ultra Low Dose).',
    image: '/images/services/servicio08.jpg',
    features: ['Implantología guiada', 'Endodoncia compleja', 'Cirugía maxilofacial'],
  },
  {
    id: 'cbct-sect',
    category: 'tomografia',
    title: 'Tomografía Sectorizada',
    subtitle: 'Foco en la región de interés',
    description:
      'Estudios de alta resolución (Endo Mode) centrados en áreas específicas para diagnósticos endodónticos milimétricos.',
    image: '/images/services/servicio05.jpg',
    features: ['Resolución 75µm', 'Conductos calcificados', 'Fracturas radiculares'],
  },

  // CEFALOMETRÍA
  {
    id: 'lat-frente',
    category: 'cefalometria',
    title: 'Trazados Cefalométricos',
    subtitle: 'Análisis ortodóntico digital',
    description:
      'Telerradiografías laterales y frontales con trazados computarizados exactos para planificación de tratamientos.',
    image: '/images/services/servicio06.jpg',
    features: ['Ricketts, Björk-Jarabak', 'McNamara', 'Steiner'],
  },
  {
    id: 'carpal',
    category: 'cefalometria',
    title: 'Carpal / Edad Ósea',
    subtitle: 'Estudio de maduración',
    description:
      'Evaluación de estadios de crecimiento óseo fundamental para ortopedia y ortodoncia en pacientes en desarrollo.',
    image: '/images/services/servicio04.jpg',
    features: [
      'Predicción de crecimiento',
      'Picos de maduración',
      'Planificación ortopédica',
    ],
  },

  // DIGITAL
  {
    id: 'modelos-3d',
    category: 'digital',
    title: 'Escaneo Intraoral 3D',
    subtitle: 'Adiós a la impresión con pasta',
    description:
      'Digitalización de arcadas dentarias para archivos STL universales, listos para alineadores o prótesis.',
    image: '/images/services/servicio09.jpg',
    features: ['Archivos STL/PLY', 'Sin náuseas', 'Máxima precisión'],
  },
  {
    id: 'impresion-3d',
    category: 'digital',
    title: 'Biomodelos 3D',
    subtitle: 'Tangibilización de diagnósticos',
    description:
      'Impresión de biomodelos óseos y guías quirúrgicas para planificación pre-operatoria compleja.',
    image: '/images/services/servicio07.jpg',
    features: ['Planificación quirúrgica', 'Didáctica paciente', 'Guías de implante'],
  },
];

export function ServicesSection() {
  const [activeService, setActiveService] = useState(services[0]);
  const [activeCategory, setActiveCategory] = useState('diagnostico');

  const filteredServices = services.filter((s) => s.category === activeCategory);

  return (
    <section
      id="servicios"
      className="relative overflow-hidden bg-slate-950 py-24 lg:py-32"
    >
      {/* ══ BACKGROUND EFFECTS (DARK TECH) ══ */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black_70%,transparent_100%)]" />
      <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-corporate/10 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* HEADER */}
        <div className="mb-12 max-w-2xl">
          <Badge
            variant="default"
            className="mb-6 border border-cyan-400/20 bg-white/10 text-cyan-400 backdrop-blur-md"
          >
            <Scan size={14} className="text-cyan-400" />
            Catálogo de Estudios
          </Badge>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-black tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-7xl"
          >
            Alta Complejidad{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Diagnóstica
            </span>
          </motion.h2>
        </div>

        {/* FILTROS DE CATEGORÍA ELEGANTES */}
        <div className="mb-12 flex flex-wrap gap-4">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all duration-300',
                  isSelected
                    ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
                    : 'border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon
                  size={16}
                  className={cn('transition-transform', isSelected ? 'scale-110' : '')}
                />
                {cat.label}
                {isSelected && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* DISEÑO DE LISTA COMPACTA FILTRADA */}
        <div className="mx-auto flex min-h-[600px] w-full max-w-[1600px] items-start justify-center px-4 pb-12 pt-0">
          <motion.div
            layout
            className="flex w-full max-w-7xl flex-wrap justify-center gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service) => {
                const isActive = activeService.id === service.id;
                const categoryData = categories.find((c) => c.id === service.category);
                const Icon = categoryData?.icon || Activity;

                return (
                  <motion.div
                    layout
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{
                      opacity: { duration: 0.2 },
                      layout: {
                        duration: 0.4,
                        type: 'spring',
                        bounce: 0,
                        damping: 25,
                        stiffness: 120,
                      },
                    }}
                    onMouseEnter={() => setActiveService(service)}
                    className={cn(
                      'group relative w-full overflow-hidden rounded-[2rem] border bg-slate-950/50 backdrop-blur-sm transition-all duration-300',
                      // En mobile y tablet, 1 columna o 2 columnas segun breakpoint
                      'md:w-[calc(50%-2rem)]',

                      // En Desktop (lg), lógica adaptativa pero más suave
                      // Si son 3 => ancho 33.33%
                      // Si son 2 => ancho 45% (no 50% para que no sean GIGANTES) y centradas
                      filteredServices.length === 3
                        ? 'lg:w-[calc(33.333%-2rem)]'
                        : 'lg:w-[calc(45%-2rem)] lg:max-w-[550px]',

                      isActive
                        ? 'border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.1)] ring-1 ring-cyan-400/30'
                        : 'border-white/5 hover:border-white/10'
                    )}
                  >
                    <div className="flex h-full flex-col">
                      {/* Lado Imagen (Top siempre para consistencia visual en grid) */}
                      <div className="relative h-60 w-full shrink-0 overflow-hidden">
                        <img
                          src={service.image}
                          alt={service.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                        {/* Categoría Badge flotante */}
                        <div className="absolute left-4 top-4 z-10">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 backdrop-blur-md">
                            <Icon size={12} />
                            {categoryData?.label}
                          </span>
                        </div>
                      </div>

                      {/* Lado Contenido */}
                      <div className="flex flex-1 flex-col p-6 pt-6">
                        <div className="mb-auto">
                          <h3
                            className={cn(
                              'mb-2 text-2xl font-black tracking-tight text-white transition-colors',
                              isActive ? 'text-cyan-400' : 'group-hover:text-cyan-200'
                            )}
                          >
                            {service.title}
                          </h3>
                          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                            {service.subtitle}
                          </p>
                          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-400">
                            {service.description}
                          </p>
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                          <ul className="space-y-2">
                            {service.features.slice(0, 3).map((feature, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2 text-xs font-semibold text-slate-300"
                              >
                                <div
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-colors',
                                    isActive
                                      ? 'bg-cyan-400'
                                      : 'bg-slate-600 group-hover:bg-cyan-500'
                                  )}
                                />
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
