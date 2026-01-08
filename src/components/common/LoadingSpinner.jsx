import React from 'react';

const LoadingSpinner = ({ size = 'default', message = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-yellow-500 border-t-transparent rounded-full animate-spin`}></div>
      {message && <p className="mt-4 text-gray-300">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
