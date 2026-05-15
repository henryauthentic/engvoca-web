import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import DemoSection from "@/components/DemoSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Home() {
  return (
    <div className="bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-white min-h-screen selection:bg-primary-500/30 transition-colors duration-500 relative">
      <AnimatedBackground />
      <Header />
      <main className="flex-1 overflow-hidden">
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
