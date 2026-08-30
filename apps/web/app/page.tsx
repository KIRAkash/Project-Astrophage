import { LandingNav } from '@/components/landing/landing-nav';
import { HeroSection } from '@/components/landing/hero-section';
import { InteractiveCosmicViewport } from '@/components/landing/interactive-cosmic-viewport';
import { ProblemSection } from '@/components/landing/problem-section';
import { ArchitectureSection } from '@/components/landing/architecture-section';
import { RoutingSection } from '@/components/landing/routing-section';
import { SynthesisSection } from '@/components/landing/synthesis-section';
import { IntegrationsSection } from '@/components/landing/integrations-section';
import { ScaleSection } from '@/components/landing/scale-stats';
import { TestimonialSection } from '@/components/landing/testimonial';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/footer';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#040711] text-white selection:bg-cyan/30 selection:text-cyan-light font-sans overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <div id="interactive-mesh">
        <InteractiveCosmicViewport />
      </div>
      <ProblemSection />
      <ArchitectureSection />
      <RoutingSection />
      <SynthesisSection />
      <IntegrationsSection />
      <ScaleSection />
      <TestimonialSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
