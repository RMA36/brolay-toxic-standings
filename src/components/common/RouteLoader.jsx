import React from 'react';
import { Loader } from 'lucide-react';

/**
 * RouteLoader - Lightweight loading fallback for Suspense boundaries
 * Used during lazy-loaded route transitions
 */
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader className="animate-spin text-yellow-400" size={32} />
  </div>
);

export default RouteLoader;
