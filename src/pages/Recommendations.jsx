import React, { useMemo } from 'react';
import { RefreshCw, AlertTriangle, Zap, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS } from '../constants/sports';
import { useDailyOdds } from '../hooks/useDailyOdds';
import { useRecommendations } from '../hooks/useRecommendations';
import Card from '../components/common/Card';

/**
 * Format odds for display (+150, -110, etc.)
 */
const formatOdds = (odds) => {
  if (odds === undefined || odds === null) return '';
  return odds > 0 ? `+${odds}` : `${odds}`;
};

/**
 * Format a game time for display
 */
const formatGameTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/**
 * Build pick description line
 */
const getPickDescription = (pick) => {
  if (!pick) return '';
  if (pick.betType === 'Total') {
    const dir = pick.direction === 'over' ? 'Over' : 'Under';
    return `${dir} ${pick.line}`;
  }
  if (pick.betType === 'Spread') {
    const line = pick.line > 0 ? `+${pick.line}` : `${pick.line}`;
    return `${pick.team} ${line}`;
  }
  // Moneyline
  return `${pick.team}`;
};

/**
 * Single Big Guy recommendation row
 */
const BigGuyPick = ({ player, rec }) => {
  const [expanded, setExpanded] = React.useState(false);
  const pick = rec.pick;

  if (!pick) {
    return (
      <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-sm md:text-base">{player}</span>
          <span className="text-gray-500 text-xs italic">No pick available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-3 md:p-4">
      {/* Main row: Big Guy name | Pick | Odds */}
      <div className="flex items-center gap-3">
        {/* Big Guy name */}
        <div className="flex-shrink-0 w-20 md:w-24">
          <span className="text-white font-bold text-sm md:text-base">{player}</span>
          <div className="text-gray-500 text-xs">{rec.overallWinRate}% overall</div>
        </div>

        {/* Pick details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{pick.sport}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{pick.betType}</span>
          </div>
          <p className="text-white font-semibold text-sm md:text-base mt-1 truncate">
            {getPickDescription(pick)}
          </p>
          <p className="text-gray-500 text-xs truncate">
            {pick.awayTeam} @ {pick.homeTeam} · {formatGameTime(pick.commenceTime)}
          </p>
        </div>

        {/* Odds */}
        <div className="flex-shrink-0 text-right">
          <div className="text-white font-bold text-sm md:text-base">{formatOdds(pick.odds)}</div>
          <div className="text-gray-600 text-xs">{pick.bookmaker}</div>
        </div>
      </div>

      {/* Expandable reasoning */}
      {pick.reasons && pick.reasons.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Why this pick
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-0.5">
              {pick.reasons.map((reason, i) => (
                <li key={i} className="text-xs text-gray-400 pl-2 border-l border-gray-700">
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Recommendations page — one recommended pick per Big Guy, no duplicates
 */
const Recommendations = () => {
  const { parlays, db, oddsApiKey } = useBrolayContext();
  const players = PLAYERS;

  // Daily odds hook
  const {
    dailyOdds,
    loading: oddsLoading,
    error: oddsError,
    lastFetched,
    oddsDate,
    isStale,
    getFilteredPicks
  } = useDailyOdds(db, oddsApiKey);

  // Get available picks (filtered to -150 to +150)
  const availablePicks = useMemo(() => getFilteredPicks(), [getFilteredPicks]);

  // Recommendation engine — returns 1 pick per Big Guy, deduplicated
  const { recommendations } = useRecommendations(parlays, players, availablePicks);

  // Date display for the banner
  const bannerDate = useMemo(() => {
    if (!oddsDate) return null;
    const d = new Date(oddsDate + 'T12:00:00');
    return {
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      dateDisplay: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    };
  }, [oddsDate]);

  // Summary stats
  const totalGames = useMemo(() => {
    let count = 0;
    Object.values(dailyOdds).forEach(d => { count += (d.games?.length || 0); });
    return count;
  }, [dailyOdds]);

  const sportsWithOdds = Object.keys(dailyOdds).filter(s => dailyOdds[s]?.games?.length > 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          Recommendations
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Today's best pick for each Big Guy
        </p>
      </div>

      {/* Date + status banner */}
      <Card variant={isStale ? 'warning' : 'highlighted'} padding="small">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className={isStale ? 'text-yellow-500' : 'text-yellow-400'} />
            {oddsLoading && !bannerDate ? (
              <span className="text-white font-semibold flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-yellow-400" />
                Loading today's picks...
              </span>
            ) : bannerDate ? (
              <span className="text-white font-semibold text-sm">
                Currently showing picks for {bannerDate.dayName} {bannerDate.dateDisplay}
                {isStale && (
                  <span className="text-yellow-500 font-normal ml-1">(previous day)</span>
                )}
              </span>
            ) : (
              <span className="text-gray-400 font-semibold text-sm">
                No picks available yet
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {lastFetched && bannerDate ? (
              <span>
                {sportsWithOdds.length > 0 && (
                  <span className="text-gray-300">{sportsWithOdds.join(', ')}</span>
                )}
                {sportsWithOdds.length > 0 && ' — '}
                {totalGames} games — {availablePicks.length} picks in range
              </span>
            ) : oddsLoading ? null : (
              <span>Picks load at 9am ET daily.</span>
            )}
          </div>
        </div>
      </Card>

      {/* Error state */}
      {oddsError && (
        <Card variant="danger" padding="small">
          <div className="text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            {oddsError}
          </div>
        </Card>
      )}

      {/* Picks list — one per Big Guy */}
      {!oddsLoading && availablePicks.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          {players.map(player => {
            const rec = recommendations[player];
            if (!rec) return null;
            return <BigGuyPick key={player} player={player} rec={rec} />;
          })}
        </div>
      )}

      {/* Empty states */}
      {!oddsLoading && availablePicks.length === 0 && !oddsError && (
        <Card variant="default">
          <div className="text-center py-8">
            <Zap size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 mb-1">No picks available in the -150 to +150 range</p>
            <p className="text-gray-600 text-sm">
              {lastFetched
                ? 'Check back when more games are posted'
                : 'Picks load at 9am ET daily'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Recommendations;
