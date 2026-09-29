import React from 'react';

const ProfileSettings = ({ profile }) => {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 border-4 border-white dark:border-gray-800 shadow-xl flex items-center justify-center text-white text-3xl font-black">
                        MR
                    </div>
                    <button className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Information</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your photo and personal details.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Full Name</label>
                    <input
                        type="text"
                        defaultValue={profile.fullName}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Work Email</label>
                    <input
                        type="email"
                        defaultValue={profile.email}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium opacity-80"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Job Role</label>
                    <input
                        type="text"
                        defaultValue={profile.role}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Timezone</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all font-medium text-gray-700 dark:text-gray-300">
                        <option>{profile.timezone}</option>
                        <option>(GMT+00:00) UTC</option>
                    </select>
                </div>
            </div>

            <div className="mt-10 flex justify-end">
                <button className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default ProfileSettings;
