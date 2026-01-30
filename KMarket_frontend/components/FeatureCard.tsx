import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  visual: React.ReactNode;
}

export const FeatureCard = ({ icon, title, description, color, visual }: FeatureCardProps) => (
    <div className="neu-out p-8 flex flex-col items-start gap-4 hover:-translate-y-2 transition-transform duration-300 cursor-default group border border-white/5 rounded-2xl">
        <div className={`neu-icon-wrap size-16 mb-2 ${color} group-hover:brightness-125`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed font-body">
            {description}
        </p>
        <div className="mt-auto pt-4 w-full">
            {visual}
        </div>
    </div>
);
