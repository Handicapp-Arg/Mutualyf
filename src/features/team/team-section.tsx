import { useState } from 'react';
import { Award, GraduationCap, Heart } from 'lucide-react';

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
 * Diseño ultra moderno 2026 con cards interactivas
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
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-32">
      {/* Background decorativo */}
      <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-blue-100/30 blur-[120px]" />
      <div className="absolute bottom-20 right-0 h-96 w-96 rounded-full bg-cyan-100/30 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <Badge variant="info" className="mb-6">
            <Heart size={14} className="text-blue-400" />
            Excelencia Profesional
          </Badge>

          <h2 className="mb-6 text-5xl font-black tracking-tighter text-slate-900 lg:text-7xl">
            Nuestro <span className="text-corporate">Equipo Médico</span>
          </h2>

          <p className="mx-auto max-w-2xl text-xl font-medium text-slate-600">
            Profesionales altamente capacitados con tecnología de vanguardia para tu
            diagnóstico preciso.
          </p>
        </div>

        {/* Team Grid Ultra Moderno */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member, index) => (
            <div
              key={index}
              onMouseEnter={() => setHoveredMember(index)}
              onMouseLeave={() => setHoveredMember(null)}
              className={cn(
                'group relative overflow-hidden rounded-[3rem] bg-white p-8 shadow-lg transition-all duration-500',
                hoveredMember === index
                  ? 'scale-105 shadow-2xl shadow-corporate/20'
                  : 'hover:shadow-xl',
                member.highlight && 'ring-2 ring-corporate/20'
              )}
            >
              {/* Badge de destacado */}
              {member.highlight && (
                <div className="absolute right-6 top-6 z-10">
                  <div className="flex items-center gap-2 rounded-full bg-corporate px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                    <Award size={12} />
                    Director
                  </div>
                </div>
              )}

              {/* Imagen con efecto moderno */}
              <div className="relative mb-6 overflow-hidden rounded-[2rem]">
                {/* Overlay gradient */}
                <div
                  className={cn(
                    'absolute inset-0 z-10 bg-gradient-to-t from-corporate/80 via-corporate/20 to-transparent transition-opacity duration-500',
                    hoveredMember === index ? 'opacity-100' : 'opacity-0'
                  )}
                />

                {/* Foto */}
                <img
                  src={member.image}
                  alt={member.name}
                  className={cn(
                    'h-80 w-full object-cover transition-all duration-700',
                    hoveredMember === index
                      ? 'scale-110 grayscale-0'
                      : 'scale-100 grayscale-[0.3]'
                  )}
                />

                {/* Info overlay en hover */}
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 z-20 p-6 transition-all duration-500',
                    hoveredMember === index
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  )}
                >
                  <div className="flex items-center gap-2 text-white">
                    <GraduationCap size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Credenciales
                    </span>
                  </div>
                  {member.credentials.map((credential, i) => (
                    <div key={i} className="mt-2 text-xs font-bold text-white/90">
                      • {credential}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info del profesional */}
              <div className="space-y-3">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  {member.name}
                </h3>

                <div className="space-y-1">
                  <div className="text-sm font-black uppercase tracking-widest text-corporate">
                    {member.role}
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    {member.specialty}
                  </div>
                </div>

                {/* Credentials badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {member.credentials.map((credential, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold text-slate-600"
                    >
                      {credential}
                    </span>
                  ))}
                </div>
              </div>

              {/* Decoración de esquina */}
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-corporate/10 to-transparent blur-2xl transition-all duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="mx-auto max-w-3xl rounded-[3rem] bg-gradient-to-br from-corporate to-blue-900 p-12 shadow-2xl">
            <h3 className="mb-4 text-3xl font-black text-white">
              ¿Querés atención personalizada?
            </h3>
            <p className="mb-8 text-lg font-medium text-white/90">
              Nuestro equipo está disponible para resolver todas tus consultas sobre
              diagnóstico por imágenes.
            </p>
            <button className="rounded-2xl bg-white px-10 py-4 text-sm font-black uppercase tracking-widest text-corporate shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-95">
              Contactar al Equipo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
