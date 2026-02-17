import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: () => void;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'medium',
  onClick,
  title,
  description,
  headerAction
}) => {
  const paddingMap = {
    none: '',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-white/5 rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''} ${className}`}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-black text-brand-dark uppercase tracking-tight">{title}</h3>}
            {description && <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{description}</p>}
          </div>
          {headerAction && (
            <div className="flex items-center">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className={paddingMap[padding]}>
        {children}
      </div>
    </div>
  );
};

export default Card;
