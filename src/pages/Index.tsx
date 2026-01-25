import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/sections/HeroSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { LiveSessionsSection } from '@/components/sections/LiveSessionsSection';
import { ConsultationsSection } from '@/components/sections/ConsultationsSection';
import { SpecialistsSection } from '@/components/sections/SpecialistsSection';
import { CertificatesSection } from '@/components/sections/CertificatesSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { CTASection } from '@/components/sections/CTASection';
import { Footer } from '@/components/layout/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <CoursesSection />
        <LiveSessionsSection />
        <ConsultationsSection />
        <SpecialistsSection />
        <CertificatesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
