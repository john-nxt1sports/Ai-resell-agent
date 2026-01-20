import LandingNav from "@/components/landing/LandingNav";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <LandingNav />
      <div className="pt-20">
        <PricingSection />
        <CTASection />
      </div>
      <Footer />
    </main>
  );
}
