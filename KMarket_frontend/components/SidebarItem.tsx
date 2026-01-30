import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
}

export const SidebarItem = ({ icon, label, active, onClick, danger }: SidebarItemProps) => (
  <button 
    onClick={onClick}
    className={`
      w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-200
      ${active ? 'neu-in text-primary' : 'hover:neu-out text-gray-500 hover:text-gray-200'}
      ${danger ? 'hover:text-red-500' : ''}
    `}
  >
    <span className={active ? 'text-primary' : ''}>{icon}</span>
    <span className="font-bold hidden lg:block">{label}</span>
  </button>
);
