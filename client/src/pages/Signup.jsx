import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupHeader from '../components/auth/SignupHeader';
import SEO from '../components/common/SEO';
import SignupForm from '../components/auth/SignupForm';
import SignupFooter from '../components/auth/SignupFooter';
import authService from '../services/authService';
import PageTransition from '../components/common/PageTransition';
import AuthSideBanner from '../components/auth/AuthSideBanner';
import { useToast } from '../context/ToastContext';
import logo from '../assets/logo-round.jpg';

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { success, error: showError } = useToast();

  const handleSignup = async (data) => {
    setIsLoading(true);
    try {
      const response = await authService.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      const debugOtp = response?.data?.debug_otp;
      if (debugOtp) {
        success(`Registration successful! Your verification code is: ${debugOtp}`);
      } else {
        success('Registration successful! Check your email for the verification code.');
      }
      navigate(`/otp-verification?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(
        typeof detail === 'string'
          ? detail
          : 'Registration failed. Please try again.'
      );
      console.error("Signup failed:", err);
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
      <SEO title="Sign Up" description="Create your BidSense account to start managing RFPs." />

      {/* --- Left Section: Brand / Info Panel (Desktop Only) --- */}
      <AuthSideBanner />

      {/* --- Right Section: Signup Form Card --- */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black min-h-screen lg:min-h-0">
        <div className="w-full max-w-xl">

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
          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-5 sm:p-6 lg:p-8">
            {/* --- Header --- */}
            <SignupHeader />

            {!isLoading ? (
              <SignupForm
                onSubmit={handleSignup}
                isLoading={isLoading}
              />
            ) : (
              /* --- Success View --- */
              <div className="text-center py-6 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/20">
                  <svg className="w-8 h-8 text-emerald-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Creating your account…</h3>
                <p className="text-gray-400 mb-8">Redirecting you to email verification.</p>
              </div>
            )}

            {/* --- Footer --- */}
            <SignupFooter />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Signup;
