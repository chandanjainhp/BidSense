import React, { useEffect, useRef, useState } from 'react';

const FlowCard = ({ title, description, visual, animationType = 'fade-up', stepNumber }) => {
    const cardRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold: 0.2, // Trigger when 20% of card is visible
                rootMargin: '0px 0px -50px 0px'
            }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) observer.unobserve(cardRef.current);
        };
    }, []);

    const getAnimationClass = () => {
        if (!isVisible) return 'opacity-0 translate-y-10'; // Default hidden state

        switch (animationType) {
            case 'fade-up':
                return 'opacity-100 translate-y-0';
            case 'slide-right':
                return 'opacity-100 translate-x-0'; // Start was -translate-x-10
            case 'slide-left':
                return 'opacity-100 translate-x-0'; // Start was translate-x-10
            case 'scale-in':
                return 'opacity-100 scale-100'; // Start was scale-90
            case 'progress':
                return 'opacity-100 translate-y-0';
            default:
                return 'opacity-100 translate-y-0';
        }
    };

    const getInitialClass = () => {
        switch (animationType) {
            case 'fade-up': return 'translate-y-10';
            case 'slide-right': return '-translate-x-10';
            case 'slide-left': return 'translate-x-10';
            case 'scale-in': return 'scale-90';
            case 'progress': return 'translate-y-5';
            default: return 'translate-y-10';
        }
    };

    return (
        <div
            ref={cardRef}
            className={`
                group relative flex flex-col overflow-hidden rounded-2xl
                bg-white dark:bg-slate-900
                border border-slate-200 dark:border-slate-800
                shadow-sm hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/40
                hover:-translate-y-1
                transition-all duration-500 ease-out
                ${isVisible ? getAnimationClass() : `opacity-0 ${getInitialClass()}`}
            `}
        >
            {/* Gradient glow accent along the card top on hover */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-indigo-500/0 blur-3xl transition-colors duration-700 group-hover:bg-indigo-500/10"
            />

            {/* Step Number Badge */}
            <div className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {stepNumber}
            </div>

            <div className="relative z-10 flex h-full flex-col p-6">
                {/* Visual stage: dotted grid + inner card that lifts on hover */}
                <div className="relative mb-6 flex h-52 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    {/* Dotted-grid texture */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-60"
                        style={{ backgroundImage: 'radial-gradient(circle, rgb(0 0 0 / 0.07) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 hidden opacity-50 dark:block"
                        style={{ backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.09) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                    />

                    <div className="relative flex w-full justify-center transform transition-transform duration-500 ease-out group-hover:scale-[1.06] group-hover:-rotate-1">
                        {visual}
                    </div>
                </div>

                <div className="mt-auto">
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FlowCard;
