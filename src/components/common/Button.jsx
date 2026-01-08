import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const baseStyles = 'font-semibold rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 focus:ring-yellow-500 disabled:bg-yellow-700 disabled:text-gray-500',
    secondary: 'bg-gray-700 text-yellow-500 hover:bg-gray-600 focus:ring-gray-500 disabled:bg-gray-800 disabled:text-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 disabled:bg-red-800 disabled:text-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-500 focus:ring-green-500 disabled:bg-green-800 disabled:text-gray-400',
    ghost: 'bg-transparent text-yellow-500 hover:bg-gray-800 focus:ring-gray-500 disabled:text-gray-600'
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
