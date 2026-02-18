import { useState, useEffect } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';
import { useScrolled } from '@/hooks';
import { cn } from '@/lib/utils';

import { MobileMenu } from './mobile-menu';
import { NavDropdown } from './nav-dropdown';

/**
 * Header principal de CIOR
 * Implementa navegación responsiva con glass morphism y smooth scroll
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolled = useScrolled(50);

  // Smooth scroll handler
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement;
      if (target.hash && target.hash.startsWith('#')) {
        e.preventDefault();
        const element = document.querySelector(target.hash);
        if (element) {
          const offset = 80;
          const elementPosition =
            element.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth',
          });
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const services = [
    {
      title: 'Ver Todos los Estudios',
      desc: 'Explorar catálogo completo de diagnósticos.',
      href: '#servicios',
    },
    {
      title: 'Tomografías 3D',
      desc: 'Cone Beam de alta precisión.',
      href: '#servicios',
    },
    {
      title: 'Tecnología',
      desc: 'Equipamiento de vanguardia.',
      href: '#tecnologia',
    },
  ];

  const patientLinks = [
    { title: 'Equipo Médico', href: '#equipo' },
    { title: 'Contacto', href: '#contacto' },
  ];

  return (
    <nav
      className={cn(
        'fixed z-[60] w-full transition-all duration-500',
        scrolled ? 'glass-morphism py-3 shadow-sm' : 'bg-transparent py-6'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex cursor-pointer items-center gap-4"
        >
          <img
            src="/images/logo/logo.png"
            alt="CIOR Logo"
            className="h-14 w-auto transform transition-all duration-300 group-hover:scale-105"
          />
        </button>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-10 lg:flex">
          <a
            href="#inicio"
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

          <a
            href="#tecnologia"
            className="text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-corporate"
          >
            Tecnología
          </a>

          <a
            href="#equipo"
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

        {/* Admin Portal Button */}
        <Link to="/admin">
          <Button className="hidden lg:block" size="md">
            ADMIN PORTAL
          </Button>
        </Link>

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
