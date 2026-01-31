import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function AccountSection() {
  const { t } = useLanguage();
  const account = t.dashboard.account;

  const avatarUrl =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCCOSly1xXsorGaxHniwiITOGL7QMBga4-lEcIOUTpBZnbOTMa3tfaCYfPxKhxuSRbeqTrwkkmTjfwdRUY1BMqRzZg0iNzOLV-mNjGEXUlY4JgNWaKMU4FyG_zHCe23F60tIZ4oZSm2VcQG8wVPZtAfYXEOuh09dMijop99F-Jaaq95ON3wtQbSjOxMm3MFIYvn8aaZLiEiLP_PshYsb_xTerUO4sz3kJ6WezoEE99VCHCnvSXTJ7V49V5A8YqurQMRX1fzI2E0jo0";

  return (
    <section className="flex-1 flex flex-col gap-8 min-w-0 overflow-y-auto custom-scrollbar px-4 pr-6 pt-2 pb-6 scroll-smooth">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-700 dark:text-white">{account.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{account.subtitle}</p>
        </div>

        <div className="neu-out p-6 lg:p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-700 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">id_card</span>
              {account.profileTitle}
            </h3>
            <button
              type="button"
              className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-primary dark:text-blue-400"
            >
              {account.saveChanges}
            </button>
          </div>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-4 shrink-0 w-full lg:w-auto">
              <div className="size-32 rounded-full neu-out p-1.5 relative group">
                <div
                  className="w-full h-full rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${avatarUrl}')` }}
                ></div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 neu-btn neu-btn-no-shadow size-10 rounded-full flex items-center justify-center text-primary dark:text-blue-400 dark:bg-[#121721]"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {account.memberSince}
                </p>
                <p className="text-sm font-bold dark:text-white">Sep 2023</p>
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">
                  {account.username}
                </label>
                <div className="neu-in px-4 py-3 rounded-xl flex items-center gap-3 dark:bg-[#121721]">
                  <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                  <input
                    className="bg-transparent border-none p-0 w-full text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 placeholder-gray-500"
                    type="text"
                    defaultValue="Alex M."
                  />
                  <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">
                  {account.email}
                </label>
                <div className="neu-in px-4 py-3 rounded-xl flex items-center gap-3 opacity-70 cursor-not-allowed dark:bg-[#121721]">
                  <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                  <input
                    className="bg-transparent border-none p-0 w-full text-sm font-bold text-gray-500 dark:text-gray-400 focus:ring-0"
                    type="email"
                    defaultValue="alex.market@example.com"
                    disabled
                  />
                  <span className="neu-btn px-2 py-0.5 rounded text-[10px] font-bold text-green-500">
                    VERIFIED
                  </span>
                </div>
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">
                  {account.connectedWallet}
                </label>
                <div className="neu-in px-4 py-3 rounded-xl flex items-center gap-3 justify-between dark:bg-[#121721] group hover:text-primary transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="material-symbols-outlined text-primary text-sm dark:text-blue-400">
                      account_balance_wallet
                    </span>
                    <span className="font-mono text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                      0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="neu-out p-6 lg:p-8 rounded-3xl flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-700 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">security</span>
              {account.securityTitle}
            </h3>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-4">
              <div className="size-10 rounded-full neu-in flex items-center justify-center shrink-0 text-primary dark:text-blue-400 dark:bg-[#121721]">
                <span className="material-symbols-outlined">phonelink_lock</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">{account.twoFactorTitle}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{account.twoFactorDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-green-500 uppercase tracking-wide">{account.enabled}</span>
              <div className="neu-toggle-wrapper">
                <input className="neu-toggle-checkbox" id="2fa-toggle" type="checkbox" defaultChecked />
                <label className="neu-toggle-label" htmlFor="2fa-toggle">
                  <div className="neu-toggle-btn"></div>
                </label>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-4">
              <div className="size-10 rounded-full neu-in flex items-center justify-center shrink-0 text-primary dark:text-blue-400 dark:bg-[#121721]">
                <span className="material-symbols-outlined">notifications_active</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">{account.loginNotificationsTitle}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{account.loginNotificationsDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="neu-toggle-wrapper">
                <input className="neu-toggle-checkbox" id="notify-toggle" type="checkbox" />
                <label className="neu-toggle-label" htmlFor="notify-toggle">
                  <div className="neu-toggle-btn"></div>
                </label>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">{account.activeSessions}</h4>
            <div className="space-y-4">
              <div className="neu-in p-4 rounded-xl flex items-center justify-between dark:bg-[#0f131b] border border-primary/20">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">laptop_mac</span>
                  <div>
                    <p className="font-bold text-sm text-gray-700 dark:text-white flex items-center gap-2">
                      MacBook Pro
                      <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-[10px] uppercase font-extrabold tracking-wider border border-green-500/20">
                        {account.current}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      San Francisco, US • Chrome • 192.168.1.1
                    </p>
                  </div>
                </div>
                <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </div>
              <div className="neu-in p-4 rounded-xl flex items-center justify-between dark:bg-[#121721] opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">smartphone</span>
                  <div>
                    <p className="font-bold text-sm text-gray-700 dark:text-white">iPhone 14 Pro</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      San Francisco, US • App • 2 hours ago
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="neu-btn px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  {account.revoke}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
