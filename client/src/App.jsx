import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Login from './pages/login';
import Signup from './pages/Signup';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ForgotPassword from './pages/ForgotPassword';
import OtpVerification from './pages/OtpVerification';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import RfpListGallery from './pages/RfpListGallery';
import RfpEditorPage from './pages/RfpEditorPage';
import HistoryPage from './pages/HistoryPage';
import ProposalInboxPage from './pages/ProposalInboxPage';
import ProposalComparisonPage from './pages/ProposalComparisonPage';
import NotificationCenter from './pages/NotificationCenter';
import SettingsPage from './pages/SettingsPage';
import VendorManagementPage from './pages/VendorManagementPage';
import AddVendorPage from './pages/AddVendorPage';
import SendRfpPage from './pages/SendRfpPage';
import CreateRfpPage from './pages/CreateRfpPage';
import RfpAnalyticsPage from './pages/RfpAnalyticsPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
// Footer pages
import FeaturesPage from './pages/FeaturesPage';
import EnterprisePage from './pages/EnterprisePage';
import SecurityPage from './pages/SecurityPage';
import AboutPage from './pages/AboutPage';
import CareersPage from './pages/CareersPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import DocumentationPage from './pages/DocumentationPage';
import GuidesPage from './pages/GuidesPage';
import SupportPage from './pages/SupportPage';
import ApiReferencePage from './pages/ApiReferencePage';

// Vendor marketplace feature
import VendorLayout from './features/vendor/components/VendorLayout';
import VendorRoute from './features/vendor/components/VendorRoute';
import VendorRegistration from './features/vendor/pages/VendorRegistration';
import VendorDashboard from './features/vendor/pages/VendorDashboard';
import VendorProfilePage from './features/vendor/pages/VendorProfile';
import VendorProducts from './features/vendor/pages/VendorProducts';
import ProductForm from './features/vendor/pages/ProductForm';
import VendorServices from './features/vendor/pages/VendorServices';
import ServiceForm from './features/vendor/pages/ServiceForm';
import BulkSales from './features/vendor/pages/BulkSales';
import VendorInquiries from './features/vendor/pages/VendorInquiries';
import VendorQuotations from './features/vendor/pages/VendorQuotations';
import VendorOrders from './features/vendor/pages/VendorOrders';
import MarketplacePage from './features/vendor/pages/MarketplacePage';
import VendorStorePage from './features/vendor/pages/VendorStorePage';

// Inner component to handle routing logic that depends on useLocation
const AppContent = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth Routes (No Layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OtpVerification />} />

        {/* Vendor Registration (no vendor guard — this is how you become one) */}
        <Route path="/vendor/register" element={<VendorRegistration />} />

        {/* Main Application Routes (Wrapped in Layout) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/rfps" element={<RfpListGallery />} />
          <Route path="/rfps/create" element={<CreateRfpPage />} />
          <Route path="/rfps/analytics" element={<RfpAnalyticsPage />} />
          <Route path="/rfps/editor" element={<RfpEditorPage />} />
          <Route path="/rfps/send" element={<SendRfpPage />} />
          <Route path="/rfps/history" element={<HistoryPage />} />
          <Route path="/proposals" element={<ProposalInboxPage />} />
          <Route path="/proposals/compare" element={<ProposalComparisonPage />} />
          <Route path="/vendors" element={<VendorManagementPage />} />
          <Route path="/vendors/add" element={<AddVendorPage />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Vendor Studio (protected — requires a vendor profile) */}
        <Route element={<VendorRoute><VendorLayout /></VendorRoute>}>
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/profile" element={<VendorProfilePage />} />
          <Route path="/vendor/products" element={<VendorProducts />} />
          <Route path="/vendor/products/new" element={<ProductForm mode="create" />} />
          <Route path="/vendor/products/:id/edit" element={<ProductForm mode="edit" />} />
          <Route path="/vendor/services" element={<VendorServices />} />
          <Route path="/vendor/services/new" element={<ServiceForm mode="create" />} />
          <Route path="/vendor/services/:id/edit" element={<ServiceForm mode="edit" />} />
          <Route path="/vendor/bulk-sales" element={<BulkSales />} />
          <Route path="/vendor/inquiries" element={<VendorInquiries />} />
          <Route path="/vendor/quotations" element={<VendorQuotations />} />
          <Route path="/vendor/orders" element={<VendorOrders />} />
        </Route>

        {/* Public marketplace (no auth) */}
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:vendorId" element={<VendorStorePage />} />

        {/* Public Routes (No Layout) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* Product Pages */}
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/security" element={<SecurityPage />} />

        {/* Company Pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Resources Pages */}
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/api" element={<ApiReferencePage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;