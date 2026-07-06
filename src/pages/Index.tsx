import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/sections/HeroSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { ConsultationsSection } from '@/components/sections/ConsultationsSection';
import { SpecialistsSection } from '@/components/sections/SpecialistsSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { CTASection } from '@/components/sections/CTASection';
import { Footer } from '@/components/layout/Footer';
import { QuickLogoutButton } from '@/components/layout/QuickLogoutButton';
import { SEO } from '@/components/SEO';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="نفسي - منصة الصحة النفسية | كورسات واستشارات نفسية"
        description="منصة نفسي المتخصصة في الصحة النفسية - كورسات مسجلة، جلسات مباشرة، استشارات فردية مع خبراء معتمدين. ابدأ رحلتك نحو حياة أفضل."
        path="/"
      />
      <Navbar />
      <main>
        <HeroSection />
        <CoursesSection />
        <ConsultationsSection />
        <SpecialistsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
      <QuickLogoutButton />
    </div>
  );
};

export default Index;
