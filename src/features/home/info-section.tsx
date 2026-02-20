import { Search, Zap, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Sección de Features/Información
 */
export function InfoSection() {
  const features = [
    {
      title: 'EXCELENCIA PROFESIONAL',
      description:
        'Personal capacitado y en constante formación para diagnósticos de alta complejidad.',
      icon: Search,
      accent: 'from-corporate to-blue-400',
      glow: 'group-hover:shadow-corporate/25',
    },
    {
      title: 'ATENCIÓN PERSONALIZADA',
      description:
        'Compromiso total con el paciente y el colega profesional en cada consulta.',
      icon: Zap,
      accent: 'from-amber-500 to-orange-400',
      glow: 'group-hover:shadow-amber-500/25',
    },
    {
      title: 'TECNOLOGÍA AVANZADA',
      description:
        'Equipamiento Planmeca de última generación para diagnósticos precisos y sin espera.',
      icon: Shield,
      accent: 'from-emerald-500 to-cyan-400',
      glow: 'group-hover:shadow-emerald-500/25',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-32">
      {/* Línea separadora top */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-40 [background-size:40px_40px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* ENCABEZADO DE SECCIÓN - STORYTELLING */}
        <div className="mx-auto mb-16 max-w-3xl text-center lg:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-corporate" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Nuestros Pilares
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-5xl font-black tracking-tighter text-slate-900 lg:text-7xl"
          >
            Compromiso con la <br className="hidden md:block" />
            <span className="text-corporate">excelencia diagnóstica</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg font-medium text-slate-500"
          >
            Combinamos tecnología de vanguardia con un equipo humano altamente capacitado
            para brindar resultados precisos y confiables.
          </motion.p>
        </div>

        {/* GRID DE CARDS */}
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`gradient-border group relative cursor-pointer overflow-hidden rounded-3xl bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${feature.glow}`}
              >
                {/* Gradiente de fondo sutil en hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                {/* Ícono con gradiente */}
                <div
                  className={`relative mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={22} className="text-white" />
                </div>

                <h5 className="relative mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-corporate">
                  {feature.title}
                </h5>

                <p className="relative mb-6 text-lg font-bold leading-snug tracking-tight text-slate-800">
                  {feature.description}
                </p>

                <div className="relative flex items-center gap-2 text-xs font-black text-slate-400 transition-all duration-300 group-hover:gap-3 group-hover:text-corporate">
                  DESCUBRIR <ChevronRight size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
