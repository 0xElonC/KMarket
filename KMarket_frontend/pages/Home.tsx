import React from 'react';
import { ArrowRight, PlayCircle, Sliders, Zap, ShieldCheck } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { FeatureCard } from '../components/FeatureCard';
import { NeuButton } from '../components/NeuButton';

export default function Home({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-12 max-w-6xl mx-auto pb-12 home-halo">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center text-center relative z-10 mt-8">
        <div className="neu-out p-8 md:p-16 w-full flex flex-col items-center gap-8 relative overflow-hidden rounded-3xl">
            {/* Background Blurs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full neu-in text-xs font-bold text-gray-400 uppercase tracking-widest border border-white/5">
                <span className="size-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                {t.home.live}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-100 leading-tight tracking-tight">
                {t.home.heroTitle}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">{t.home.heroSubtitle}</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl font-body leading-relaxed">
                {t.home.heroDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                <NeuButton 
                  onClick={() => onNavigate(Page.MARKETS)}
                  className="px-10 py-5 rounded-2xl text-lg font-bold text-primary flex items-center gap-3 hover:scale-105 transition-transform home-cta"
                >
                    {t.home.start}
                    <ArrowRight size={20} />
                </NeuButton>
                <button 
                  onClick={() => onNavigate(Page.HOW_IT_WORKS)}
                  className="px-8 py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-100 transition-colors flex items-center gap-2"
                >
                    <PlayCircle size={20} />
                    {t.home.how}
                </button>
            </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <FeatureCard 
            icon={<Sliders size={32} />}
            color="text-primary"
            title={t.home.rangeTitle}
            description={t.home.rangeDesc}
            visual={
                <div className="h-2 w-full neu-in rounded-full overflow-hidden flex border border-white/5 mt-4">
                    <div className="w-1/3 h-full bg-transparent"></div>
                    <div className="w-1/3 h-full bg-primary/20 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        <div className="w-full h-[2px] bg-primary shadow-[0_0_5px_#3B82F6]"></div>
                    </div>
                </div>
            }
          />
          <FeatureCard 
            icon={<Zap size={32} />}
            color="text-accent"
            title={t.home.oddsTitle}
            description={t.home.oddsDesc}
            visual={
                <div className="mt-4 w-full flex items-end gap-1 h-8">
                    <div className="flex-1 bg-gray-700 rounded-t-sm h-[40%]"></div>
                    <div className="flex-1 bg-gray-700 rounded-t-sm h-[60%]"></div>
                    <div className="flex-1 bg-accent rounded-t-sm h-[90%] shadow-[0_0_15px_rgba(245,158,11,0.3)]"></div>
                    <div className="flex-1 bg-gray-700 rounded-t-sm h-[50%]"></div>
                    <div className="flex-1 bg-gray-700 rounded-t-sm h-[30%]"></div>
                </div>
            }
          />
          <FeatureCard 
            icon={<ShieldCheck size={32} />}
            color="text-success"
            title={t.home.liqTitle}
            description={t.home.liqDesc}
            visual={
                <div className="mt-4 w-full flex items-center gap-2">
                    <ShieldCheck className="text-success" size={16} />
                    <span className="text-xs font-bold text-gray-500">{t.home.secure}</span>
                </div>
            }
          />
      </section>
    </div>
  );
}
