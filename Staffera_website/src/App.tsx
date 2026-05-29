import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { USPBar } from '@/components/USPBar';
import { Services } from '@/components/Services';
import { Features } from '@/components/Features';
import { HowItWorks } from '@/components/HowItWorks';
import { AppDownloads } from '@/components/AppDownloads';
import { TrustSection } from '@/components/TrustSection';
import { Footer } from '@/components/Footer';

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fcf8ff] text-[#1b1b21]">
      <Navbar />
      <main>
        <Hero />
        <USPBar />
        <Services />
        <Features />
        <HowItWorks />
        <AppDownloads />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
}
