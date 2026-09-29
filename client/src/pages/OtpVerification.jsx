import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OtpHeader from '../components/auth/OtpHeader';
import OtpInputGroup from '../components/auth/OtpInputGroup';
import OtpTimer from '../components/auth/OtpTimer';
import OtpActions from '../components/auth/OtpActions';
import OtpFooter from '../components/auth/OtpFooter';
import authService from '../services/authService';
import { useToast } from '../context/ToastContext';

const OtpVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'user@company.com';
  const { success, error: showError } = useToast();

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!searchParams.get('email')) {
      // No email in query — nothing to verify against
      showError('Missing verification email. Please sign up again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otp.join(''));
      success('Email verified! Welcome to BidSense.');
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(typeof detail === 'string' ? detail : 'Invalid or expired code. Please try again.');
      console.error('OTP verification failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.resendOtp(email);
      success('A new verification code has been sent.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(typeof detail === 'string' ? detail : 'Failed to resend code. Please try again.');
      console.error('OTP resend failed:', err);
    } finally {
      setIsResending(false);
    }
  };

  const isFormValid = !otp.some(v => v === "");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">

        {/* --- Card Container --- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 md:p-10 text-center">

          <OtpHeader email={email} />

          {/* OTP Input Form */}
          <form onSubmit={handleVerify} className="space-y-8">

            <OtpInputGroup otp={otp} setOtp={setOtp} />

            {/* Timer & Resend Section */}
            <OtpTimer onResend={handleResend} isResending={isResending} />

            {/* Action Buttons */}
            <OtpActions isLoading={isLoading} isDisabled={!isFormValid || isLoading} />

          </form>
        </div>

        <OtpFooter />
      </div>
    </div>
  );
};

export default OtpVerification;
