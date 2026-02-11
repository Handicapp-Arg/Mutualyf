import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Camera, Scan, Brain, Printer } from 'lucide-react';

const categories = [
  { id: 'diagnostico', label: 'Diagnóstico 2D/3D', icon: Camera },
  { id: 'tomografia', label: 'Tomografía', icon: Scan },
  { id: 'cefalometria', label: 'Cefalometría', icon: Brain },
  { id: 'digital', label: 'Digital 3D', icon: Printer },
];

const services = [
  {
    id: 1,
    category: 'diagnostico',
    title: 'Radiografía Seriada',
    description: 'Imágenes periapicales de alta precisión para diagnóstico detallado.',
    image: '/images/services/servicio01.jpg',
    features: ['Nivel óseo', 'Morfología radicular', 'Lesiones periapicales'],
  },
  {
    id: 2,
    category: 'diagnostico',
    title: 'Panorámica Digital',
    description: 'Vista completa de estructuras dentarias y anatómicas.',
    image: '/images/services/servicio02.jpg',
    features: ['Rutina estándar', 'Baja radiación', 'Resultados inmediatos'],
  },
  {
    id: 3,
    category: 'diagnostico',
    title: 'Radiografía ATM',
    description: 'Estudio de articulaciones temporo-mandibulares.',
    image: '/images/services/servicio03.jpg',
    features: ['Oclusión', 'Apertura máxima', 'Análisis óseo'],
  },
  {
    id: 4,
    category: 'diagnostico',
    title: 'Radiografía Carpal',
    description: 'Estimación de edad ósea para ortodoncia y odontopediatría.',
    image: '/images/services/servicio04.jpg',
    features: ['Edad ósea', 'Planificación ortodoncia', 'Odontopediatría'],
  },
  {
    id: 5,
    category: 'cefalometria',
    title: 'Telerradiografía Lateral',
    description: 'Esencial para diagnóstico ortodóntico y cirugía ortognática.',
    image: '/images/services/servicio05.jpg',
    features: [
      'Diagnóstico ortodóntico',
      'Cirugía ortognática',
      'Análisis cefalométrico',
    ],
  },
  {
    id: 6,
    category: 'cefalometria',
    title: 'Telerradiografía Frontal',
    description: 'Estudio de asimetrías faciales y senos paranasales.',
    image: '/images/services/servicio06.jpg',
    features: ['Asimetrías faciales', 'Senos paranasales', 'Vista frontal'],
  },
  {
    id: 7,
    category: 'cefalometria',
    title: 'Estudios Cefalométricos',
    description: 'Análisis computarizado con precisión milimétrica.',
    image: '/images/services/servicio07.jpg',
    features: ['Medidas precisas', 'Puntos anatómicos', 'Software especializado'],
  },
  {
    id: 8,
    category: 'tomografia',
    title: 'Tomografía Cone Beam',
    description: 'Reconstrucción 3D con mínima radiación.',
    image: '/images/services/servicio08.jpg',
    features: ['Alta complejidad', 'Menor radiación', 'Reconstrucción 3D'],
    highlight: true,
  },
  {
    id: 9,
    category: 'digital',
    title: 'Digitalización 3D',
    description: 'Modelos digitales e impresiones 3D de alta precisión.',
    image: '/images/services/servicio09.jpg',
    features: ['Almacenamiento digital', 'Evolución 3D', 'Impresión inmediata'],
  },
];

export function ServicesSection() {
  const [activeCategory, setActiveCategory] = useState('diagnostico');

  const filteredServices = services.filter((s) => s.category === activeCategory);

  return (
    <section className="relative overflow-hidden bg-white py-20 lg:py-28">
      {/* Header */}
      <div className="container mx-auto mb-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="info" className="mb-4">
            Nuestros Estudios
          </Badge>
          <h2 className="mb-6 bg-gradient-to-r from-slate-900 via-corporate to-slate-900 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Alta Complejidad Diagnóstica
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-slate-600">
            Tecnología de vanguardia para diagnósticos precisos
          </p>
        </motion.div>
      </div>

      {/* Category Tabs */}
      <div className="container mx-auto mb-12 px-4">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat, index) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  relative flex items-center gap-2 rounded-xl px-6 py-3
                  font-medium transition-all duration-300
                  ${
                    isActive
                      ? 'scale-105 bg-corporate text-white shadow-lg shadow-corporate/25'
                      : 'bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:text-corporate'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {cat.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="container mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredServices.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

interface ServiceCardProps {
  service: (typeof services)[0];
  index: number;
}

function ServiceCard({ service, index }: ServiceCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative h-full overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-corporate/10">
        {service.highlight && (
          <div className="absolute right-4 top-4 z-10">
            <Badge className="bg-gradient-to-r from-corporate to-blue-600 text-white shadow-lg">
              Destacado
            </Badge>
          </div>
        )}

        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-slate-100">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          )}
          <img
            src={service.image}
            alt={service.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`
              h-full w-full object-cover transition-all duration-500
              ${imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
              group-hover:scale-110
            `}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="mb-2 text-xl font-bold text-slate-900 transition-colors group-hover:text-corporate">
            {service.title}
          </h3>
          <p className="mb-4 line-clamp-2 text-sm text-slate-600">
            {service.description}
          </p>

          {/* Features */}
          <ul className="space-y-2">
            {service.features.map((feature, i) => (
              <li key={i} className="flex items-center text-sm text-slate-500">
                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-corporate" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
