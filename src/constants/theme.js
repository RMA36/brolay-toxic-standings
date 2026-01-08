// Theme colors and styles centralized for easy maintenance
export const colors = {
  // Primary colors
  primary: {
    gold: '#FFD700',
    goldHover: '#FFC700',
    goldLight: 'rgba(255, 215, 0, 0.1)',
    goldBorder: 'rgba(255, 215, 0, 0.2)',
  },
  
  // Background colors
  background: {
    dark: '#1a1a1a',
    darker: '#0f0f0f',
    card: '#1f1f1f',
    cardGradient: 'linear-gradient(to bottom right, #1f2937, #111827)',
    hover: '#2a2a2a',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    muted: '#6b7280',
  },
  
  // Status colors
  status: {
    win: '#10b981',
    winLight: 'rgba(16, 185, 129, 0.1)',
    loss: '#ef4444',
    lossLight: 'rgba(239, 68, 68, 0.1)',
    push: '#f59e0b',
    pushLight: 'rgba(245, 158, 11, 0.1)',
    pending: '#6b7280',
    pendingLight: 'rgba(107, 114, 128, 0.1)',
  },
  
  // Border colors
  border: {
    default: 'rgba(255, 215, 0, 0.2)',
    hover: 'rgba(255, 215, 0, 0.4)',
    light: 'rgba(255, 255, 255, 0.1)',
  },
};

export const inputStyle = {
  backgroundColor: '#1a1a1a',
  color: '#fff',
  borderColor: colors.border.default,
};

export const buttonStyles = {
  primary: `bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold px-4 py-2 rounded-lg transition-all duration-200 shadow-lg`,
  secondary: `bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-all duration-200`,
  danger: `bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-all duration-200`,
  ghost: `text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-1 rounded transition-colors duration-200`,
};

export const cardStyles = {
  base: `bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-yellow-500/20`,
  hover: `hover:border-yellow-500/40 transition-all duration-200`,
};
