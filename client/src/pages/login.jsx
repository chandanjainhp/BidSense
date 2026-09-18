import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import PageTransition from '../components/common/PageTransition';
import SEO from '../components/common/SEO';
import AuthSideBanner from '../components/auth/AuthSideBanner';
import LoginHeader from '../components/auth/LoginHeader';
import LoginForm from '../components/auth/LoginForm';
import LoginFooter from '../components/auth/LoginFooter';
import { useToast } from '../context/ToastContext';
import logo from '../assets/logo-round.jpg';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { success, error: showError } = useToast();

  const handleLogin = async (data) => {
    setIsLoading(true);
    try {
      await authService.login(data.email, data.password);
      success('Login successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      showError('Invalid email or password. Please try again.');
      console.error("Login failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Automated RFP creation",
    "Vendor & proposal management",
    "AI-driven comparison & scoring",
    "Data-backed procurement decisions"
  ];

  return (
    <PageTransition className="min-h-screen bg-black flex flex-col lg:flex-row font-sans">
      <SEO title="Login" description="Sign in to your BidSense account." />

      {/* --- Left Section: Brand / Info Panel (Desktop Only) --- */}
      <AuthSideBanner />

      {/* --- Right Section: Login Form Card --- */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-black min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">

          {/* --- Mobile Branding Header (Visible only on mobile) --- */}
          <div className="lg:hidden text-center mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img src={logo} alt="BidSense Logo" className="w-12 h-12 rounded-full border-2 border-gray-700" />
              <span className="text-2xl font-bold text-white tracking-tight">BidSense</span>
            </div>

            {/* Welcome Text */}
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to <span className="text-indigo-400">BidSense</span>
            </h1>
            <p className="text-gray-400 mb-6">
              AI-powered RFP Management & Intelligent Bid Scoring.
            </p>

            {/* Features List */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-gray-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* --- Form Card --- */}
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-6 sm:p-8 lg:p-10">

            <LoginHeader />

            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

            <LoginFooter />

          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
