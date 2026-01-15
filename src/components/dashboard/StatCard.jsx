import React from 'react';
import Card from '../common/Card';

/**
 * StatCard - Displays a statistic with icon, title, value, and optional subtitle
 *
 * @param {Object} props
 * @param {React.Component} props.icon - Icon component from lucide-react
 * @param {string} props.iconColor - Tailwind color class for icon (e.g., 'text-blue-400')
 * @param {string} props.title - Card title
 * @param {string} props.titleColor - Tailwind color class for title
 * @param {string|number} props.value - Main statistic value to display
 * @param {string} props.valueColor - Tailwind color class for value (optional)
 * @param {string} props.subtitle - Optional subtitle text
 * @param {string} props.variant - Card variant (info, success, warning, danger)
 * @param {string} props.className - Additional CSS classes
 */
const StatCard = ({
  icon: Icon,
  iconColor = 'text-blue-400',
  title,
  titleColor = 'text-blue-400',
  value,
  valueColor = 'text-white',
  subtitle,
  variant = 'info',
  className = ''
}) => {
  return (
    <Card variant={variant} padding="default" className={className}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={iconColor} size={28} />
        <h3 className={`text-base md:text-lg font-semibold ${titleColor}`}>{title}</h3>
      </div>
      <p className={`text-3xl md:text-4xl font-bold ${valueColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
};

export default StatCard;
