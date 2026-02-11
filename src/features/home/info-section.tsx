import { Search, Zap, Clock, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui';

/**
 * Sección de Features/Información
 */
export function InfoSection() {
  const features = [
    {
      title: 'EXCELENCIA PROFESIONAL',
      description: 'Personal capacitado y especializado promoviendo educación continua.',
      icon: Search,
      color: 'text-blue-500',
    },
    {
      title: 'ATENCIÓN PERSONALIZADA',
      description: 'Compromiso con el paciente y el colega profesional.',
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      title: 'TECNOLOGÍA AVANZADA',
      description: 'Equipamiento de última generación para diagnósticos precisos.',
      icon: Clock,
      color: 'text-green-500',
    },
  ];

  return (
    <section className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="group cursor-pointer duration-500 hover:shadow-2xl"
            >
              <div
                className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 shadow-sm transition-all group-hover:bg-corporate group-hover:text-white ${feature.color}`}
              >
                <Icon size={24} />
              </div>

              <h5 className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-corporate">
                {feature.title}
              </h5>

              <p className="mb-4 text-xl font-black leading-tight tracking-tighter text-slate-800">
                {feature.description}
              </p>

              <div className="flex items-center gap-2 text-xs font-black text-slate-400 transition-all group-hover:text-corporate">
                DESCUBRIR <ChevronRight size={14} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
