import { X } from 'lucide-react';
import { Button } from '@/components/ui';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  services: Array<{ title: string; desc: string; href: string }>;
}

/**
 * Menú móvil fullscreen
 */
export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-white lg:hidden">
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Header con botón de cerrar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <img src="/images/logo/logo.png" alt="CIOR Logo" className="h-12 w-auto" />
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar menú"
          >
            <X size={28} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1 p-6">
          <a
            href="#servicios"
            onClick={onClose}
            className="block rounded-lg px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-100"
          >
            Estudios
          </a>

          <a
            href="#tecnologia"
            onClick={onClose}
            className="block rounded-lg px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-100"
          >
            Tecnología
          </a>

          <a
            href="#equipo"
            onClick={onClose}
            className="block rounded-lg px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-100"
          >
            Profesionales
          </a>

          <a
            href="#contacto"
            onClick={onClose}
            className="block rounded-lg px-4 py-3 text-lg font-bold text-slate-800 hover:bg-slate-100"
          >
            Contacto
          </a>
        </div>

        {/* CTA */}
        <div className="pb-safe mt-auto border-t border-slate-200 p-4">
          <a href="/admin">
            <Button className="w-full" size="lg">
              ADMIN PORTAL
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
