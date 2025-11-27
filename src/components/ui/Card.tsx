import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <section className={`rounded-2xl border border-white/10 bg-ravr-panel/70 p-6 shadow-xl backdrop-blur ${className}`}>
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-white/90">{title}</h2>
      )}
      {children}
    </section>
  );
};
