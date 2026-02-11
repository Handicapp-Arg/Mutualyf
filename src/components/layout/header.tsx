import { useState } from 'react';
import { Activity, ChevronDown, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { useScrolled } from '@/hooks';
import { cn } from '@/lib/utils';

import { MobileMenu } from './mobile-menu';
import { NavDropdown } from './nav-dropdown';

/**
 * Header principal de CIOR
 * Implementa navegación responsiva con glass morphism
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolled = useScrolled(50);

  const services = [
    {
      title: 'Tomografía 3D',
      desc: 'Precisión volumétrica Cone Beam.',
      href: '#tomografia',
    },
    {
      title: 'Panorámica HD',
      desc: 'Visión completa en un solo escaneo.',
      href: '#panoramica',
    },
    {
      title: 'Alineadores Invisibles',
      desc: 'Ortodoncia estética de alta gama.',
      href: '#alineadores',
    },
    {
      title: 'Impresiones 3D',
      desc: 'Modelado digital de alta resolución.',
      href: '#impresiones',
    },
  ];

  const patientLinks = [
    { title: 'Obras Sociales', href: '#obras-sociales' },
    { title: 'Resultados Online', href: '#resultados' },
    { title: 'Preparación', href: '#preparacion' },
  ];

  return (
    <nav
      className={cn(
        'fixed z-[60] w-full transition-all duration-500',
        scrolled
          ? 'glass-morphism py-3 shadow-sm'
          : 'bg-transparent py-6'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="group flex cursor-pointer items-center gap-3">
          <div className="flex h-12 w-12 transform items-center justify-center rounded-2xl bg-corporate shadow-lg shadow-corporate/30 transition-all group-hover:rotate-6">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-corporate">
              {siteConfig.name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Imágenes
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-10 lg:flex">
          <a
            href="#"
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-corporate"
          >
            Inicio
          </a>

          <NavDropdown
            trigger={
              <button className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-corporate">
                Estudios <ChevronDown size={14} />
              </button>
            }
            items={services}
            className="w-72"
          />

          <NavDropdown
            trigger={
              <button className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-corporate">
                Pacientes <ChevronDown size={14} />
              </button>
            }
            items={patientLinks}
            className="w-56"
          />

          <a
            href="#profesionales"
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-corporate"
          >
            Profesionales
          </a>
          <a
            href="#contacto"
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-corporate"
          >
            Contacto
          </a>
        </div>

        {/* CTA Button */}
        <Button className="hidden lg:block" size="md">
          PORTAL PACIENTE
        </Button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-corporate lg:hidden"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        services={services}
        patientLinks={patientLinks}
      />
    </nav>
  );
}
