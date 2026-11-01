import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  title,
  subtitle,
  action,
}) => {
  return (
    <div
      className={`rounded-2xl transition-all ${
        glow ? 'glass-panel-glow' : 'glass-panel'
      } p-5 md:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-bold text-slate-100 text-base sm:text-lg">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
