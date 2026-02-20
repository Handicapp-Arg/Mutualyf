import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, Award } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const technologies = [
  {
    id: 1,
    name: 'Tomógrafo Planmeca 3D Classic',
    category: 'Tomografía CBCT',
    description: 'Gold Standard en imagenología dental 3D con tecnología de Haz Cónico.',
    image: '/images/technology/planmeca-promax-3d-classic.jpg',
    specs: ['Resolución 5.0 lp/mm', 'Volúmenes 5x8 a 13x14 cm', 'Sensor Dimax 4'],
    highlight: 'Líder mundial',
    origin: 'Finlandia',
  },
  {
    id: 2,
    name: 'Planmeca ProMax 3D Mid',
    category: 'Sistema Todo-en-Uno',
    description:
      'Combina CBCT 3D, fotografía 3D, cefalometría y panorámicas en un solo equipo.',
    image: '/images/technology/pmx3d_mid_half.jpg',
    specs: ['Múltiples volúmenes', 'Endodoncia/Implantología', 'Cirugía maxilofacial'],
    highlight: 'Versatilidad',
  },
  {
    id: 3,
    name: 'Fotografía 3D ProFace',
    category: 'Imaging Facial',
    description: 'Fotografía facial 3D integrada con visualización de tejidos blandos.',
    image: '/images/technology/5_rxs.jpg',
    specs: ['Sin radiación', 'Planificación estética', 'Integración CBCT'],
    highlight: 'Innovación',
  },
  {
    id: 4,
    name: 'Ortopantomógrafo ProMax S3',
    category: 'Radiografía Panorámica',
    description: 'Posicionamiento láser triple haz con autoenfoque inteligente.',
    image: '/images/technology/pmx83h1_sky_half.jpg',
    specs: ['Autoenfoque', 'Entrada lateral', 'Láser triple haz'],
    highlight: 'Precisión',
  },
  {
    id: 5,
    name: 'VistaScan Mini (DÜRR)',
    category: 'Radiovisografía',
    description: 'Digitalización rápida de placas radiográficas con tecnología PCS.',
    image: '/images/technology/vistascan_mini_eindruecken_ddrw.png',
    specs: ['Formatos 0-4', 'Detecta ISO 06', 'Lesiones D1'],
    highlight: 'Velocidad',
  },
  {
    id: 6,
    name: 'NemoCeph 2D',
    category: 'Software Cefalométrico',
    description: 'Líder mundial en trazado cefalométrico y predicciones de crecimiento.',
    image: '/images/technology/nemoceph-2d.jpg',
    specs: ['VTO quirúrgico', 'Morphing tejidos', 'Predicciones'],
    highlight: 'Análisis',
  },
  {
    id: 7,
    name: 'NemoScan',
    category: 'Planificación Implantes',
    description: 'Software 3D para planificación quirúrgica y generación de guías.',
    image: '/images/technology/nemoscan-screenshot.jpg',
    specs: ['Visualización 3D', 'Guías quirúrgicas', 'Impresión 3D'],
    highlight: 'Precisión',
  },
  {
    id: 8,
    name: 'Impresora 3D Stratasys',
    category: 'PolyJet',
    description: 'Impresión 3D de ultra precisión para modelos médicos y guías.',
    image: '/images/technology/3DPrinters.png',
    specs: ['Precisión 0.1mm', 'Múltiples materiales', 'Acabado suave'],
    highlight: 'Fabricación',
  },
  {
    id: 9,
    name: 'Escáner Emerald S',
    category: 'Intraoral',
    description: 'Escaneo digital de alta velocidad con colores realistas.',
    image: '/images/technology/planmeca-emerald-s.jpg',
    specs: ['Ultra rápido', 'Color real', 'Arcos completos'],
    highlight: 'Tecnología',
  },
];

export function TechnologySection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-28">
      {/* Background Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50" />

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <Badge variant="default" className="mb-4">
            Innovación Digital
          </Badge>
          <h2 className="text-5xl font-black tracking-tighter text-slate-900 lg:text-7xl">
            Tecnología de <span className="text-corporate">Vanguardia</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Equipamiento de última generación para garantizar diagnósticos precisos y
            tratamientos exitosos.
          </p>
        </motion.div>

        {/* Video Showcase - Máquinas en acción */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mb-20"
        >
          <div className="group relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
            <video
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              src="/images/hero2.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
            
            {/* Overlay gradiente mejorado */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
            
            {/* Badge flotante premium */}
            <div className="absolute bottom-8 left-8">
              <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-xl transition-all hover:bg-white/20">
                <Award className="text-corporate" size={20} strokeWidth={2.5} />
                <span className="text-sm font-bold uppercase tracking-wider text-white">
                  Equipamiento Planmeca
                </span>
              </div>
            </div>

            {/* Borde sutil interno */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
          </div>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative">
          <div className="overflow-hidden px-2" ref={emblaRef}>
            <div className="-ml-4 flex touch-pan-y py-4">
              {technologies.map((tech) => (
                <div
                  key={tech.id}
                  className="flex min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="group relative h-full overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={tech.image}
                        alt={tech.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute right-4 top-4">
                        <Badge className="bg-corporate/90 text-white backdrop-blur-sm">
                          {tech.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="mb-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-corporate">
                        {tech.name}
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-slate-600">
                        {tech.description}
                      </p>

                      <div className="mb-4 space-y-2">
                        {tech.specs.map((spec, idx) => (
                          <div
                            key={idx}
                            className="flex items-center text-xs text-slate-500"
                          >
                            <ChevronRight size={12} className="mr-1 text-corporate" />
                            {spec}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-corporate">
                          <Award size={16} />
                          {tech.highlight}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <button
            className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-corporate hover:text-white disabled:opacity-50 lg:-left-12"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-all hover:bg-corporate hover:text-white disabled:opacity-50 lg:-right-12"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Siguiente"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Dots Navigation */}
        <div className="mt-10 flex justify-center gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                index === selectedIndex
                  ? 'w-8 bg-corporate'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Ir a diapositiva ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
