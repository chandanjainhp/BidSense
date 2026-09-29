import React, { useState, useEffect } from 'react';

const OtpTimer = ({ onResend, isResending }) => {
    const [timer, setTimer] = useState(59);

    // Timer logic for the 'Resend' countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]); // Added dependency on timer if we want it to react (though empty [] works if just decrements, but here we might want to restart it)
    // Actually, simplified logic:

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);


    const handleResendClick = () => {
        setTimer(59);
        onResend();
    };

    return (
        <div className="text-sm">
            <p className="text-gray-500 dark:text-gray-400">
                Didn't receive the code?{' '}
                {timer > 0 ? (
                    <span className="text-indigo-600 font-semibold">Resend in {timer}s</span>
                ) : (
                    <button
                        type="button"
                        onClick={handleResendClick}
                        disabled={isResending}
                        className="text-indigo-600 font-bold hover:text-indigo-500 underline decoration-2 underline-offset-4 disabled:opacity-50"
                    >
                        {isResending ? "Sending..." : "Resend Code"}
                    </button>
                )}
            </p>
        </div>
    );
};

export default OtpTimer;
