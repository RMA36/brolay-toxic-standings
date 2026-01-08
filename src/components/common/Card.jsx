import React from 'react';

const Card = ({ 
  children, 
  title,
  subtitle,
  className = '',
  headerAction,
  variant = 'default',
  padding = 'default'
}) => {
  const variants = {
    default: 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/20',
    highlighted: 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/50 shadow-lg shadow-yellow-500/10',
    success: 'bg-gradient-to-br from-green-900/20 to-gray-900 border-green-500/30',
    danger: 'bg-gradient-to-br from-red-900/20 to-gray-900 border-red-500/30',
    warning: 'bg-gradient-to-br from-yellow-900/20 to-gray-900 border-yellow-500/30',
    info: 'bg-gradient-to-br from-blue-900/20 to-gray-900 border-blue-500/30'
  };

  const paddings = {
    none: '',
    small: 'p-3 md:p-4',
    default: 'p-4 md:p-6',
    large: 'p-6 md:p-8'
  };

  return (
    <div className={`rounded-xl shadow-xl border ${variants[variant]} ${paddings[padding]} ${className}`}>
      {(title || headerAction) && (
        <div className="flex justify-between items-start mb-4">
          <div>
            {title && (
              <h3 className="text-lg md:text-xl font-bold text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div>
              {headerAction}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
