import { Header, Footer } from '@/components/layout';
import { NexusBot } from '@/features/nexus-bot';
import { HeroSection, InfoSection } from '@/features/home';

/**
 * Página Principal de CIOR
 */
export function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FDFDFD] font-sans text-slate-900 selection:bg-corporate/10">
      <Header />
      
      <main>
        <HeroSection />
        <InfoSection />
      </main>

      <Footer />
      
      <NexusBot />
    </div>
  );
}
