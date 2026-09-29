import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import Footer from '../components/landing/Footer';
import PricingHeader from '../components/pricing/PricingHeader';
import PricingCards from '../components/pricing/PricingCards';
import FeatureTable from '../components/pricing/FeatureTable';
import FaqSection from '../components/pricing/FaqSection';
import CTASection from '../components/landing/CTASection';
import SEO from '../components/common/SEO';
import PageTransition from '../components/common/PageTransition';

const PricingPage = () => {
    return (
        <PageTransition className="min-h-screen font-sans bg-white dark:bg-black selection:bg-indigo-500 selection:text-white">
            <SEO
                title="Pricing Plans"
                description="Flexible pricing for procurement teams of all sizes. Start your free trial today."
            />
            <LandingNavbar />
            <main>
                <PricingHeader />
                <PricingCards />
                <FeatureTable />
                <FaqSection />
                <CTASection />
            </main>
            <Footer />
        </PageTransition>
    );
};

export default PricingPage;
