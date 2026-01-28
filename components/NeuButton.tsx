import React from 'react';

export interface NeuButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

export const NeuButton: React.FC<NeuButtonProps> = ({ className = '', active, children, ...props }) => {
  return (
    <button
      className={`neu-btn transition-all ${active ? 'active' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};