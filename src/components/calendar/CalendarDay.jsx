import React, { memo } from 'react';
import { formatCalendarDate, getPicksArray, getPickResult } from '../../utils/formatters';

/**
 * CalendarDay - Memoized calendar day cell component
 *
 * Renders a single day in the calendar view with:
 * - Color-coded background based on profit/loss
 * - Brolay count and win/loss record
 * - Today indicator ring
 * - Selection state
 * - And-1 skull emoji indicator
 */
const CalendarDay = memo(({
  day,
  currentYear,
  currentMonth,
  getBrolaysForDate,
  thresholds,
  selectedCalendarDate,
  setSelectedCalendarDate,
  todayET,
  isMobile
}) => {
  const dateStr = formatCalendarDate(currentYear, currentMonth, day);
  const dayBrolays = getBrolaysForDate(dateStr);
  const hasBrolays = dayBrolays.length > 0;
  const isSelected = selectedCalendarDate === dateStr;
  const isToday = todayET === new Date(dateStr + 'T00:00:00').toDateString();

  // Calculate day's financial performance
  let dayNetProfit = 0;
  let dayWins = 0;
  let dayLosses = 0;
  let dayAnd1s = 0;

  dayBrolays.forEach(parlay => {
    const picks = getPicksArray(parlay);
    const losers = picks.filter(p => getPickResult(p) === 'loss');
    const winners = picks.filter(p => getPickResult(p) === 'win');
    const pushes = picks.filter(p => getPickResult(p) === 'push');
    const won = losers.length === 0 && winners.length > 0 && pushes.length < picks.length;
    const and1 = losers.length === 1 && winners.length === picks.length - 1;

    if (won) {
      const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * picks.length);
      dayNetProfit += netProfit;
      dayWins++;
    } else if (losers.length > 0) {
      const totalRisk = parlay.betAmount * picks.length;
      dayNetProfit -= totalRisk;
      dayLosses++;
      if (and1) dayAnd1s++;
    }
  });

  // Determine color based on profit/loss using DYNAMIC thresholds
  let bgColorClass = 'bg-gray-800';
  let borderColorClass = 'border-gray-700';
  let hoverBorderClass = 'hover:border-yellow-500/50';

  if (hasBrolays && dayNetProfit !== 0) {
    if (dayNetProfit > 0) {
      // Green gradient based on dynamic profit thresholds
      if (dayNetProfit >= thresholds.profit.huge) {
        bgColorClass = 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-lg shadow-green-500/30';
        borderColorClass = 'border-green-300';
        hoverBorderClass = 'hover:border-green-200';
      } else if (dayNetProfit >= thresholds.profit.big) {
        bgColorClass = 'bg-gradient-to-br from-green-500 to-emerald-700';
        borderColorClass = 'border-green-400';
        hoverBorderClass = 'hover:border-green-300';
      } else if (dayNetProfit >= thresholds.profit.medium) {
        bgColorClass = 'bg-gradient-to-br from-green-600 to-green-800';
        borderColorClass = 'border-green-500';
        hoverBorderClass = 'hover:border-green-400';
      } else if (dayNetProfit >= thresholds.profit.small) {
        bgColorClass = 'bg-gradient-to-br from-green-700 to-green-900';
        borderColorClass = 'border-green-600';
        hoverBorderClass = 'hover:border-green-500';
      } else {
        bgColorClass = 'bg-gradient-to-br from-green-800 to-gray-800';
        borderColorClass = 'border-green-700';
        hoverBorderClass = 'hover:border-green-600';
      }
    } else {
      // Red gradient based on dynamic loss thresholds
      if (dayNetProfit <= thresholds.loss.huge) {
        bgColorClass = 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 shadow-lg shadow-red-500/30';
        borderColorClass = 'border-red-400';
        hoverBorderClass = 'hover:border-red-300';
      } else if (dayNetProfit <= thresholds.loss.big) {
        bgColorClass = 'bg-gradient-to-br from-red-600 to-red-800';
        borderColorClass = 'border-red-500';
        hoverBorderClass = 'hover:border-red-400';
      } else if (dayNetProfit <= thresholds.loss.medium) {
        bgColorClass = 'bg-gradient-to-br from-red-700 to-red-900';
        borderColorClass = 'border-red-600';
        hoverBorderClass = 'hover:border-red-500';
      } else if (dayNetProfit <= thresholds.loss.small) {
        bgColorClass = 'bg-gradient-to-br from-red-800 to-gray-800';
        borderColorClass = 'border-red-700';
        hoverBorderClass = 'hover:border-red-600';
      } else {
        bgColorClass = 'bg-gradient-to-br from-red-900 to-gray-800';
        borderColorClass = 'border-red-800';
        hoverBorderClass = 'hover:border-red-700';
      }
    }
  } else if (hasBrolays) {
    // Pending/no result yet
    bgColorClass = 'bg-gray-700';
    borderColorClass = 'border-gray-600';
  }

  // Emoji indicator - ONLY show skull for And-1s
  let emoji = '';
  if (dayAnd1s > 0) {
    emoji = '💀'; // Had and-1(s)
  }

  return (
    <button
      onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
      className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all ${
        isSelected
          ? 'bg-yellow-500/30 border-yellow-400 scale-105 shadow-lg shadow-yellow-500/50'
          : `${bgColorClass} ${borderColorClass} ${hoverBorderClass} hover:scale-105`
      } ${isToday ? 'ring-2 ring-blue-500' : ''} relative overflow-hidden`}
    >
      {/* Emoji indicator at top - only And-1 skull */}
      {emoji && (
        <div className="absolute top-0.5 right-0.5 text-xs md:text-sm">
          {emoji}
        </div>
      )}

      <div className={`text-lg font-bold ${
        hasBrolays ? 'text-white' : 'text-gray-500'
      }`}>
        {day}
      </div>

      {/* Desktop: Show all details */}
      {hasBrolays && !isMobile && (
        <div className="text-center mt-1">
          <div className="text-xs text-gray-200 font-semibold">
            {dayBrolays.length} {dayBrolays.length === 1 ? 'brolay' : 'brolays'}
          </div>
          {dayBrolays.length > 1 && (
            <div className="text-xs font-bold mt-0.5" style={{
              color: dayNetProfit > 0 ? '#4ade80' : dayNetProfit < 0 ? '#f87171' : '#fbbf24'
            }}>
              {dayWins}-{dayLosses}
            </div>
          )}
          {dayNetProfit !== 0 && (
            <div className={`text-xs font-bold mt-0.5 ${
              dayNetProfit > 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              {dayNetProfit > 0 ? '+' : ''}{dayNetProfit > 0 ? `$${dayNetProfit.toFixed(0)}` : `-$${Math.abs(dayNetProfit).toFixed(0)}`}
            </div>
          )}
        </div>
      )}

      {/* Mobile: Just show small dot indicator if has brolays */}
      {hasBrolays && isMobile && (
        <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
      )}
    </button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  // Only re-render if these specific props change
  return (
    prevProps.day === nextProps.day &&
    prevProps.currentYear === nextProps.currentYear &&
    prevProps.currentMonth === nextProps.currentMonth &&
    prevProps.selectedCalendarDate === nextProps.selectedCalendarDate &&
    prevProps.todayET === nextProps.todayET &&
    prevProps.isMobile === nextProps.isMobile &&
    // Deep compare thresholds object
    JSON.stringify(prevProps.thresholds) === JSON.stringify(nextProps.thresholds)
    // Note: getBrolaysForDate is a function so we can't easily compare it,
    // but it's stable across renders from useMemo
  );
});

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;
