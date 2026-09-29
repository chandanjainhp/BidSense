import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import SEO from '../components/common/SEO';
import PageTransition from '../components/common/PageTransition';
import HeroSection from '../components/landing/HeroSection';
import ProcurementFlowSection from '../components/landing/ProcurementFlowSection';
import ProductPreviewSection from '../components/landing/ProductPreviewSection';
import MetricsSection from '../components/landing/MetricsSection';
import UseCasesSection from '../components/landing/UseCasesSection';
import WorkflowsSection from '../components/landing/WorkflowsSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import PricingCards from '../components/pricing/PricingCards';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
    return (
        <PageTransition className="min-h-screen font-sans bg-white dark:bg-black selection:bg-indigo-500 selection:text-white">
            <SEO
                title="AI-Powered RFP Management Platform"
                description="Streamline your procurement process with AI, automate proposal scoring, and manage vendors efficiently with BidSense."
            />
            <LandingNavbar />
            <main>
                <HeroSection />
                <ProcurementFlowSection />
                <ProductPreviewSection />
                <MetricsSection />
                <UseCasesSection />
                <WorkflowsSection />
                <TestimonialsSection />
                <PricingCards id="pricing" />
                <CTASection />
            </main>
            <Footer />
        </PageTransition>
    );
};

export default LandingPage;
