import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useBrolayContext } from '../../contexts/BrolayContext';
import { PLAYERS } from '../../constants/sports';
import Card from '../common/Card';
import Button from '../common/Button';
import { getPicksArray, getPickBigGuy, getPickResult } from '../../utils/formatters';

/**
 * WinRateTrendsChart - Interactive line chart showing win percentage trends over time
 *
 * Features:
 * - Multi-line chart with one line per player
 * - Configurable time periods (7d, 30d, 90d, YTD, All)
 * - Configurable granularity (Week, Month, Quarter, Year)
 * - Interactive tooltips with detailed stats
 * - 50% reference line for break-even
 */
const WinRateTrendsChart = ({ filteredParlays = [] }) => {
  const { isMobile } = useBrolayContext();
  const players = PLAYERS;

  // State for time period and granularity
  const [timePeriod, setTimePeriod] = useState('all'); // '7d', '30d', '90d', 'ytd', 'all'
  const [granularity, setGranularity] = useState('month'); // 'week', 'month', 'quarter', 'year'

  // Date grouping functions
  const getWeekKey = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  };

  const getMonthKey = (dateStr) => {
    return dateStr.substring(0, 7); // YYYY-MM
  };

  const getQuarterKey = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  const getYearKey = (dateStr) => {
    return dateStr.substring(0, 4); // YYYY
  };

  const getPeriodKey = (dateStr) => {
    switch (granularity) {
      case 'week':
        return getWeekKey(dateStr);
      case 'month':
        return getMonthKey(dateStr);
      case 'quarter':
        return getQuarterKey(dateStr);
      case 'year':
        return getYearKey(dateStr);
      default:
        return getMonthKey(dateStr);
    }
  };

  // Format period label for display
  const formatPeriodLabel = (periodKey) => {
    if (granularity === 'week') {
      const [year, week] = periodKey.split('-W');
      return `W${week} ${year}`;
    } else if (granularity === 'month') {
      const [year, month] = periodKey.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    } else if (granularity === 'quarter') {
      return periodKey; // Already formatted as "YYYY-Q#"
    } else {
      return periodKey; // Year
    }
  };

  // Filter parlays by time period
  const getDateCutoff = () => {
    const today = new Date();
    switch (timePeriod) {
      case '7d':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        return last7Days.toISOString().split('T')[0];
      case '30d':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        return last30Days.toISOString().split('T')[0];
      case '90d':
        const last90Days = new Date(today);
        last90Days.setDate(last90Days.getDate() - 90);
        return last90Days.toISOString().split('T')[0];
      case 'ytd':
        return `${today.getFullYear()}-01-01`;
      case 'all':
      default:
        return null;
    }
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    const dateCutoff = getDateCutoff();
    const periodData = {};

    // Filter by date cutoff
    const relevantParlays = dateCutoff
      ? filteredParlays.filter(p => p.date >= dateCutoff)
      : filteredParlays;

    // Initialize data structure for each player
    players.forEach(player => {
      periodData[player] = {};
    });

    // Collect picks by period and player
    relevantParlays.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const periodKey = getPeriodKey(parlay.date);

      picks.forEach(pick => {
        const bigGuy = getPickBigGuy(pick);
        const result = getPickResult(pick);
        if (!bigGuy || result === 'pending') return;

        // Ensure player exists in periodData
        if (!periodData[bigGuy]) {
          periodData[bigGuy] = {};
        }

        if (!periodData[bigGuy][periodKey]) {
          periodData[bigGuy][periodKey] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        periodData[bigGuy][periodKey].total++;
        if (result === 'win') periodData[bigGuy][periodKey].wins++;
        else if (result === 'loss') periodData[bigGuy][periodKey].losses++;
        else if (result === 'push') periodData[bigGuy][periodKey].pushes++;
      });
    });

    // Get all unique periods and sort them
    const allPeriods = new Set();
    players.forEach(player => {
      Object.keys(periodData[player]).forEach(period => allPeriods.add(period));
    });
    const sortedPeriods = Array.from(allPeriods).sort();

    // Build chart data array
    const data = sortedPeriods.map(period => {
      const dataPoint = {
        period: formatPeriodLabel(period),
        periodKey: period
      };

      players.forEach(player => {
        const stats = periodData[player][period];
        if (stats && stats.total > 0) {
          const adjustedWins = stats.wins + (stats.pushes * 0.5);
          dataPoint[player] = parseFloat(((adjustedWins / stats.total) * 100).toFixed(1));
          dataPoint[`${player}_stats`] = stats;
        } else {
          dataPoint[player] = null;
          dataPoint[`${player}_stats`] = null;
        }
      });

      return dataPoint;
    });

    return data;
  }, [filteredParlays, timePeriod, granularity, players]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => {
          const stats = entry.payload[`${entry.name}_stats`];
          if (!stats) return null;

          return (
            <div key={index} className="mb-1">
              <p className="font-semibold" style={{ color: entry.color }}>
                {entry.name}: {entry.value}%
              </p>
              <p className="text-xs text-gray-400">
                {stats.wins}-{stats.losses}
                {stats.pushes > 0 && `-${stats.pushes}`} ({stats.total} picks)
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Player colors
  const playerColors = {
    Management: '#3B82F6', // blue
    Labor: '#10B981', // green
    Operations: '#8B5CF6' // purple
  };

  const hasData = chartData.length > 0;

  return (
    <Card title="📈 Win Rate Trends" subtitle="Interactive performance trends over time">
      <div className="space-y-4">
        {/* Time Period Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Time Period</label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setTimePeriod('7d')}
              variant={timePeriod === '7d' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Last 7 Days
            </Button>
            <Button
              onClick={() => setTimePeriod('30d')}
              variant={timePeriod === '30d' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Last 30 Days
            </Button>
            <Button
              onClick={() => setTimePeriod('90d')}
              variant={timePeriod === '90d' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Last 90 Days
            </Button>
            <Button
              onClick={() => setTimePeriod('ytd')}
              variant={timePeriod === 'ytd' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              This Year
            </Button>
            <Button
              onClick={() => setTimePeriod('all')}
              variant={timePeriod === 'all' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              All Time
            </Button>
          </div>
        </div>

        {/* Granularity Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Granularity</label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setGranularity('week')}
              variant={granularity === 'week' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Week
            </Button>
            <Button
              onClick={() => setGranularity('month')}
              variant={granularity === 'month' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Month
            </Button>
            <Button
              onClick={() => setGranularity('quarter')}
              variant={granularity === 'quarter' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Quarter
            </Button>
            <Button
              onClick={() => setGranularity('year')}
              variant={granularity === 'year' ? 'primary' : 'secondary'}
              size="small"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Year
            </Button>
          </div>
        </div>

        {/* Chart */}
        {hasData ? (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="period"
                  stroke="#9CA3AF"
                  style={{ fontSize: isMobile ? '10px' : '12px' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#9CA3AF"
                  style={{ fontSize: isMobile ? '10px' : '12px' }}
                  label={{ value: 'Win %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }} />
                <ReferenceLine y={50} stroke="#6B7280" strokeDasharray="3 3" label="Break-even" />
                {players.map(player => (
                  <Line
                    key={player}
                    type="monotone"
                    dataKey={player}
                    stroke={playerColors[player]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-300 text-center py-8">
            Not enough data for the selected period and granularity
          </p>
        )}
      </div>
    </Card>
  );
};

export default WinRateTrendsChart;
