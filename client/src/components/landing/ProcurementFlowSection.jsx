import React from 'react';
import FlowHeader from './FlowHeader';
import FlowCardGrid from './FlowCardGrid';
import FlowCard from './FlowCard';
import useScrollReveal from '../../hooks/useScrollReveal';

const ProcurementFlowSection = () => {
    const { ref, hasAnimated } = useScrollReveal(0.1);

    // Card Data
    const cards = [
        {
            title: "Secure Login",
            description: "Log in securely via SSO and access your role-based procurement workspace instantly.",
            stepNumber: "01",
            animationType: "fade-up",
            visual: (
                <div className="flex w-full max-w-[240px] justify-center">
                <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 transform transition-transform group-hover:scale-105 duration-500">
                    <div className="h-2 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-8 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"></div>
                        <div className="h-8 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="mt-4 h-8 bg-indigo-600 rounded-lg w-full flex items-center justify-center">
                        <div className="h-2 w-16 bg-white/30 rounded"></div>
                    </div>
                    <div className="mt-2 flex justify-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-green-500"></div>
                        <span className="text-[8px] text-gray-400 font-bold uppercase">SSO Secured</span>
                    </div>
                </div>
                </div>
            )
        },
        {
            title: "Create & Customize RFPs",
            description: "Build specific RFPs using structured templates tailored to your industry (IT, SaaS, Gov).",
            stepNumber: "02",
            animationType: "slide-right",
            visual: (
                <div className="relative w-full max-w-[260px] h-32 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-2 transform group-hover:rotate-1 transition-transform duration-500">
                    <div className="flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="space-y-1.5 opacity-60">
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-blue-50 text-blue-600 rounded">IT</span>
                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-50 text-amber-600 rounded">SaaS</span>
                    </div>
                </div>
            )
        },
        {
            title: "Invite Vendors Seamlessly",
            description: "Invite vendors securely, manage submissions, and track response status in real-time.",
            stepNumber: "03",
            animationType: "slide-left",
            visual: (
                <div className="flex -space-x-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 shadow-md flex items-center justify-center relative group-hover:-translate-y-2 transition-transform duration-300" style={{ transitionDelay: `${i * 100}ms` }}>
                            <img
                                src={`https://api.dicebear.com/9.x/initials/svg?seed=${i + 10}&backgroundColor=6366f1&fontColor=ffffff&fontWeight=600`}
                                alt="avatar"
                                className="w-full h-full rounded-full"
                            />
                            {i === 3 && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-md z-10">
                        +12
                    </div>
                </div>
            )
        },
        {
            title: "AI-Powered Analysis",
            description: "BidSense AI compares proposals instantly, scores risks, and highlights the best options.",
            stepNumber: "04",
            animationType: "scale-in",
            visual: (
                <div className="w-full max-w-[240px]">
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">BidSense Score</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">92<span className="text-sm text-gray-400">/100</span></span>
                    </div>
                    {/* Score Bar 1 */}
                    <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full w-[92%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-width-grow"></div>
                    </div>
                    {/* Score Bar 2 */}
                    <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden opacity-60">
                        <div className="absolute top-0 left-0 h-full w-[65%] bg-gray-400 rounded-full"></div>
                    </div>
                    {/* Score Bar 3 */}
                    <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden opacity-40">
                        <div className="absolute top-0 left-0 h-full w-[40%] bg-gray-400 rounded-full"></div>
                    </div>

                    <div className="mt-2 flex gap-2">
                        <span className="px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                            AI Rec
                        </span>
                    </div>
                </div>
                </div>
            )
        },
        {
            title: "Confident Decisions",
            description: "Make data-backed decisions with full audit history, compliance tracking, and automated export.",
            stepNumber: "05",
            animationType: "progress",
            visual: (
                <div className="flex w-full max-w-[220px] justify-center">
                <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${i <= 2 ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    {i <= 2 && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded flex-1">
                                    <div className={`h-full rounded ${i <= 2 ? 'bg-gray-300 dark:bg-gray-600' : 'bg-transparent'} w-2/3`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400">Audit Log</span>
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
                </div>
            )
        }
    ];

    return (
        <section ref={ref} className="py-24 bg-black relative overflow-hidden">
            {/* Background Decoration */}
            <div className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 transition-opacity duration-1000 ${hasAnimated ? 'opacity-40' : 'opacity-0'}`}>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
                <div className={`transition-all duration-700 ${hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <FlowHeader />
                </div>

                <div className={`transition-all duration-700 delay-200 ${hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <FlowCardGrid>
                        {cards.map((card, idx) => (
                            <FlowCard
                                key={idx}
                                {...card}
                            />
                        ))}
                    </FlowCardGrid>
                </div>
            </div>
        </section>
    );
};

export default ProcurementFlowSection;
