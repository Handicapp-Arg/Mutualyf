import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  services: Array<{ title: string; desc: string; href: string }>;
  patientLinks: Array<{ title: string; href: string }>;
}

/**
 * Menú móvil fullscreen
 */
export function MobileMenu({ isOpen, onClose, services }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-white lg:hidden">
      <div className="flex h-full flex-col overflow-y-auto p-6">
        {/* Navigation Links */}
        <div className="mt-20 space-y-6">
          <a
            href="#inicio"
            onClick={onClose}
            className="block text-2xl font-black text-slate-800"
          >
            Inicio
          </a>

          <div>
            <div className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
              Estudios
            </div>
            {services.map((service, index) => (
              <a
                key={index}
                href={service.href}
                onClick={onClose}
                className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800">{service.title}</div>
                  <div className="text-xs text-slate-500">{service.desc}</div>
                </div>
                <ChevronRight className="text-corporate" size={20} />
              </a>
            ))}
          </div>

          <a
            href="#tecnologia"
            onClick={onClose}
            className="block text-2xl font-black text-slate-800"
          >
            Tecnología
          </a>

          <a
            href="#equipo"
            onClick={onClose}
            className="block text-2xl font-black text-slate-800"
          >
            Equipo Médico
          </a>

          <a
            href="#contacto"
            onClick={onClose}
            className="block text-2xl font-black text-slate-800"
          >
            Contacto
          </a>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-8">
          <Button className="w-full" size="lg">
            PORTAL PACIENTE
          </Button>
        </div>
      </div>
    </div>
  );
}
