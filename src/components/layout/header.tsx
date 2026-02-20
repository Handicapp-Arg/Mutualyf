import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui';
import { useScrolled } from '@/hooks';
import { cn } from '@/lib/utils';

import { MobileMenu } from './mobile-menu';

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

  const navLinks = [
    { title: 'Estudios', href: '#servicios' },
    { title: 'Tecnología', href: '#tecnologia' },
    { title: 'Profesionales', href: '#equipo' },
    { title: 'Contacto', href: '#contacto' },
  ];

  return (
    <>
      <nav
        className={cn(
          'fixed z-[60] w-full transition-all duration-500',
          scrolled
            ? 'glass-morphism border-b border-slate-200/50 bg-white/80 py-3 shadow-sm'
            : 'bg-gradient-to-b from-black/80 to-transparent py-6'
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
              className={cn(
                'h-14 w-auto transform transition-all duration-300 group-hover:scale-105',
                !scrolled && 'opacity-90 brightness-0 drop-shadow-md invert'
              )}
            />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.title}
                href={link.href}
                className={cn(
                  'text-[11px] font-black uppercase tracking-widest transition-colors duration-300',
                  scrolled
                    ? 'text-slate-500 hover:text-corporate'
                    : 'text-white/90 drop-shadow-sm hover:text-white'
                )}
              >
                {link.title}
              </a>
            ))}
          </div>

          {/* Admin Portal Button */}
          <Link to="/admin">
            <Button
              className={cn(
                'hidden lg:block',
                !scrolled &&
                  'border border-white/20 bg-white text-slate-900 shadow-none hover:bg-white/90'
              )}
              size="md"
              variant={scrolled ? 'primary' : 'secondary'}
            >
              ADMIN PORTAL
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              'p-2 transition-colors lg:hidden',
              scrolled ? 'text-corporate' : 'text-white'
            )}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        services={services}
      />
    </>
  );
}
