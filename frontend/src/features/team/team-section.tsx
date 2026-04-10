import { useState } from 'react';
import { Heart, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface TeamMember {
  name: string;
  role: string;
  specialty: string;
  image: string;
  credentials: string[];
  highlight?: boolean;
}

/**
 * Team Section - Sección del equipo médico CIOR
 * Diseño ultra moderno 2026 con cards interactivas y estilo Tech
 */
export function TeamSection() {
  const [hoveredMember, setHoveredMember] = useState<number | null>(null);

  const team: TeamMember[] = [
    {
      name: 'Dr. Andrés Ales',
      role: 'Director Médico',
      specialty: 'Especialista en Diagnóstico por Imágenes',
      image: '/images/team/staff-ales-andres.jpg',
      credentials: ['FAAOMR', 'Diplomado en Radiología Oral'],
      highlight: true,
    },
    {
      name: 'Dra. Carolina Ales',
      role: 'Especialista Senior',
      specialty: 'Radiología Odontológica Avanzada',
      image: '/images/team/staff-carolina-ales.jpg',
      credentials: ['Especialista en Imagenología 3D'],
    },
    {
      name: 'Dr. Álvaro Alonso',
      role: 'Radiólogo',
      specialty: 'Tomografía Cone Beam',
      image: '/images/team/staff-alvaro-alonso.jpg',
      credentials: ['Certificación Internacional CBCT'],
    },
    {
      name: 'Dra. Virginia Fattal Jaef',
      role: 'Especialista',
      specialty: 'Diagnóstico Digital',
      image: '/images/team/staff-virginia-fattal-jaef.jpg',
      credentials: ['Experta en Imagenología Digital'],
    },
    {
      name: 'Dra. Julieta Pozzi',
      role: 'Radióloga',
      specialty: 'Ortodoncia y Diagnóstico',
      image: '/images/team/staff-julieta-pozzi.jpg',
      credentials: ['Especialista en Ortodoncia Digital'],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-50 py-32">
      {/* ══ BACKGROUND EFFECTS (TECH LIGHT) ══ */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black_70%,transparent_100%)]" />
      <div className="absolute left-0 top-20 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-corporate/5 blur-[120px]" />
      <div className="absolute bottom-20 right-0 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-cyan-400/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <Badge
            variant="default"
            className="mb-6 border border-corporate/10 bg-white text-corporate shadow-sm"
          >
            <Heart size={14} className="text-corporate" />
            Excelencia Profesional
          </Badge>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl md:text-5xl lg:text-7xl"
          >
            Nuestro{' '}
            <span className="bg-gradient-to-r from-corporate to-cyan-500 bg-clip-text text-transparent">
              Equipo Médico
            </span>
          </motion.h2>

          <p className="mx-auto max-w-2xl text-base font-medium text-slate-600 sm:text-lg md:text-xl">
            Profesionales altamente capacitados con tecnología de vanguardia para tu
            diagnóstico preciso.
          </p>
        </div>

        {/* Team Grid Profesional y Uniforme */}
        <div className="flex flex-wrap justify-center gap-8">
          {team.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredMember(index)}
              onMouseLeave={() => setHoveredMember(null)}
              className="group relative flex w-full max-w-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-corporate/30 hover:shadow-[0_10px_40px_-10px_rgba(14,165,233,0.3)]"
            >
              {/* Imagen con efecto Escáner Tech */}
              <div className="relative h-80 w-full overflow-hidden bg-slate-900">
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
                />

                {/* Luces/Glow sobre la imagen */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />

                {/* Efecto Escáner (Línea que baja) */}
                <div className="absolute left-0 right-0 top-0 h-1 bg-cyan-400/80 opacity-0 shadow-[0_0_15px_rgba(34,211,238,1)] transition-all duration-1000 ease-in-out group-hover:translate-y-[320px] group-hover:opacity-100" />

                {/* Info overlay en hover (Credenciales) */}
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 z-20 p-6 transition-all duration-500',
                    hoveredMember === index
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  )}
                >
                  <div className="mb-3 flex items-center gap-2 text-cyan-400">
                    <Activity size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Especialización
                    </span>
                  </div>
                  {member.credentials.map((credential, i) => (
                    <div
                      key={i}
                      className="mt-1 flex items-center gap-2 text-xs font-bold text-white/90"
                    >
                      <div className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                      {credential}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info del profesional */}
              <div className="relative flex flex-1 flex-col p-6 lg:p-8">
                <div className="mb-4 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-600">
                    {member.role}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-corporate">
                    {member.name}
                  </h3>
                </div>

                <p className="mb-6 text-sm font-medium leading-relaxed text-slate-600">
                  {member.specialty}
                </p>

                {/* Credentials badges (Tech style) */}
                <div className="mt-auto flex flex-wrap gap-2">
                  {member.credentials.map((credential, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm"
                    >
                      {credential}
                    </span>
                  ))}
                </div>

                {/* Decoración de esquina animada */}
                <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-cyan-400/10 to-transparent blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:bg-corporate/10" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section Tech */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-12 shadow-2xl">
            {/* Luces de fondo del CTA */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-corporate/30 blur-[80px]" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-[80px]" />

            <div className="relative z-10">
              <h3 className="mb-4 text-3xl font-black text-white lg:text-4xl">
                ¿Querés atención personalizada?
              </h3>
              <p className="mx-auto mb-8 max-w-2xl text-lg font-medium text-slate-300">
                Nuestro equipo está disponible para resolver todas tus consultas sobre
                diagnóstico por imágenes.
              </p>

              <button className="group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-900 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)]">
                  <div className="relative h-full w-8 bg-slate-200/50" />
                </div>
                <span className="relative z-10">Contactar al Equipo</span>
                <ChevronRight
                  size={18}
                  className="relative z-10 text-corporate transition-transform group-hover/btn:translate-x-1"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
