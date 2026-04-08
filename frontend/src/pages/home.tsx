import { Header, Footer } from '@/components/layout';
import { NexusBot } from '@/features/nexus-bot';
import { HeroSection, InfoSection } from '@/features/home';
import { ServicesSection } from '@/features/services/services-section';
import { TechnologySection } from '@/features/technology/technology-section';
import { TeamSection } from '@/features/team';
import { ContactSection } from '@/features/contact';

/**
 * Página Principal de CIOR
 * Landing page moderna con smooth scroll y secciones organizadas
 */
export function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 selection:bg-corporate/10">
      <Header />

      <main id="inicio">
        {/* Hero */}
        <HeroSection />

        {/* About */}
        <InfoSection />

        {/* Servicios */}
        <section id="servicios">
          <ServicesSection />
        </section>

        {/* Tecnología */}
        <section id="tecnologia">
          <TechnologySection />
        </section>

        {/* Equipo Médico */}
        <section id="equipo">
          <TeamSection />
        </section>

        {/* Contacto */}
        <section id="contacto">
          <ContactSection />
        </section>
      </main>

      <Footer />

      <NexusBot />
    </div>
  );
}
