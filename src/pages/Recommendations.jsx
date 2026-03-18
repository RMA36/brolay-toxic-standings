import React, { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, Clock, Zap, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS } from '../constants/sports';
import { useDailyOdds } from '../hooks/useDailyOdds';
import { useRecommendations } from '../hooks/useRecommendations';
import Card from '../components/common/Card';

/**
 * Format odds for display (+150, -110, etc.)
 */
const formatOdds = (odds) => {
  if (odds === undefined || odds === null) return '—';
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
 * Get a color class based on score
 */
const getScoreColor = (score) => {
  if (score >= 60) return 'text-green-400';
  if (score >= 52) return 'text-yellow-400';
  if (score >= 45) return 'text-gray-400';
  return 'text-red-400';
};

/**
 * Get a badge color based on confidence
 */
const getConfidenceBadge = (confidence) => {
  switch (confidence) {
    case 'high': return 'bg-green-900/50 text-green-400 border-green-700';
    case 'medium': return 'bg-yellow-900/50 text-yellow-400 border-yellow-700';
    case 'low': return 'bg-gray-800 text-gray-500 border-gray-700';
    default: return 'bg-gray-800 text-gray-500 border-gray-700';
  }
};

/**
 * Pick direction label
 */
const getDirectionLabel = (pick) => {
  if (pick.betType === 'Total') {
    return pick.direction === 'over' ? 'Over' : 'Under';
  }
  if (pick.betType === 'Spread') {
    return pick.line > 0 ? `+${pick.line}` : `${pick.line}`;
  }
  return '';
};

/**
 * Single recommendation card for a pick
 */
const PickCard = ({ pick, rank }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-3 md:p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Rank badge */}
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-sm font-bold">
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            {/* Sport + Bet Type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                {pick.sport}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                {pick.betType}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getConfidenceBadge(pick.confidence)}`}>
                {pick.confidence}
              </span>
            </div>

            {/* Main pick info */}
            <div className="mt-1.5">
              {pick.betType === 'Total' ? (
                <p className="text-white font-semibold text-sm md:text-base truncate">
                  {pick.team} — {getDirectionLabel(pick)} {pick.line}
                </p>
              ) : pick.betType === 'Spread' ? (
                <p className="text-white font-semibold text-sm md:text-base truncate">
                  {pick.team} {getDirectionLabel(pick)}
                </p>
              ) : (
                <p className="text-white font-semibold text-sm md:text-base truncate">
                  {pick.team}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-0.5">
                {pick.awayTeam} @ {pick.homeTeam} • {formatGameTime(pick.commenceTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Score + Odds */}
        <div className="flex-shrink-0 text-right ml-3">
          <div className={`text-lg font-bold ${getScoreColor(pick.score)}`}>
            {pick.score}
          </div>
          <div className="text-xs text-gray-400">
            {formatOdds(pick.odds)}
          </div>
        </div>
      </div>

      {/* Reasoning (expandable) */}
      {pick.reasons && pick.reasons.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Show'} reasoning
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
 * Big Guy profile summary card
 */
const ProfileSummary = ({ profile, overallWinRate }) => {
  if (!profile || profile.totalPicks === 0) {
    return (
      <div className="text-gray-500 text-sm italic">No historical data available</div>
    );
  }

  // Find top sport and bet type
  const topSport = Object.entries(profile.bySport)
    .filter(([, s]) => s.total >= 5)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

  const topBetType = Object.entries(profile.byBetType)
    .filter(([, s]) => s.total >= 5)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <div className="bg-gray-800/60 rounded px-2.5 py-1.5 border border-gray-700/50">
        <span className="text-gray-500">Overall: </span>
        <span className="text-white font-medium">{overallWinRate}%</span>
        <span className="text-gray-600 ml-1">({profile.totalWins}-{profile.totalLosses})</span>
      </div>
      <div className="bg-gray-800/60 rounded px-2.5 py-1.5 border border-gray-700/50">
        <span className="text-gray-500">Recent: </span>
        <span className={`font-medium ${profile.recentWinRate >= 55 ? 'text-green-400' : profile.recentWinRate < 45 ? 'text-red-400' : 'text-yellow-400'}`}>
          {profile.recentWinRate.toFixed(0)}%
        </span>
        <span className="text-gray-600 ml-1">(last 20)</span>
      </div>
      {profile.currentStreak.count >= 2 && (
        <div className="bg-gray-800/60 rounded px-2.5 py-1.5 border border-gray-700/50">
          {profile.currentStreak.type === 'win'
            ? <span className="text-green-400">🔥 {profile.currentStreak.count}W streak</span>
            : <span className="text-red-400">❄️ {profile.currentStreak.count}L streak</span>
          }
        </div>
      )}
      {topSport && (
        <div className="bg-gray-800/60 rounded px-2.5 py-1.5 border border-gray-700/50">
          <span className="text-gray-500">Best sport: </span>
          <span className="text-white font-medium">{topSport[0]}</span>
          <span className="text-gray-600 ml-1">({((topSport[1].wins / topSport[1].total) * 100).toFixed(0)}%)</span>
        </div>
      )}
      {topBetType && (
        <div className="bg-gray-800/60 rounded px-2.5 py-1.5 border border-gray-700/50">
          <span className="text-gray-500">Best type: </span>
          <span className="text-white font-medium">{topBetType[0]}</span>
          <span className="text-gray-600 ml-1">({((topBetType[1].wins / topBetType[1].total) * 100).toFixed(0)}%)</span>
        </div>
      )}
    </div>
  );
};

/**
 * Recommendations - AI-curated pick recommendations per Big Guy
 *
 * Features:
 * - Daily odds fetching from The Odds API (bulk, cached in Firestore)
 * - Stats-based recommendation engine analyzing Big Guy historic patterns
 * - Personalized top 5 picks per Big Guy with scoring and reasoning
 * - "Avoid" picks (low-scoring patterns)
 * - API usage tracking
 * - Manual refresh with smart caching
 */
const Recommendations = () => {
  const { parlays, isMobile, db, oddsApiKey } = useBrolayContext();
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

  // Recommendation engine
  const { recommendations, profiles } = useRecommendations(parlays, players, availablePicks);

  // UI state
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Date display for the banner
  const bannerDate = useMemo(() => {
    if (!oddsDate) return null;
    const d = new Date(oddsDate + 'T12:00:00'); // Noon to avoid timezone shifts
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
          Stats-driven picks personalized for each Big Guy
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
              <span className="text-white font-semibold">
                Currently showing picks for {bannerDate.dayName} {bannerDate.dateDisplay}
                {isStale && (
                  <span className="text-yellow-500 font-normal ml-1">(previous day)</span>
                )}
              </span>
            ) : (
              <span className="text-gray-400 font-semibold">
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

      {/* Player tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedPlayer(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedPlayer === null
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          All Big Guys
        </button>
        {players.map(player => (
          <button
            key={player}
            onClick={() => setSelectedPlayer(player)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPlayer === player
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {player}
          </button>
        ))}
      </div>

      {/* No odds loaded state */}
      {!oddsLoading && availablePicks.length === 0 && !oddsError && (
        <Card variant="default">
          <div className="text-center py-8">
            <Zap size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 mb-1">No picks available in the -150 to +150 range today</p>
            <p className="text-gray-600 text-sm">
              {lastFetched
                ? 'Try refreshing odds or check back when more games are posted'
                : 'Fetch today\'s odds to see recommendations'
              }
            </p>
          </div>
        </Card>
      )}

      {/* Recommendations by Big Guy */}
      {availablePicks.length > 0 && (
        <div className="space-y-4 md:space-y-6">
          {(selectedPlayer ? [selectedPlayer] : players).map(player => {
            const rec = recommendations[player];
            if (!rec) return null;

            return (
              <Card key={player} variant="default">
                {/* Player header */}
                <div className="mb-3">
                  <h2 className="text-lg font-bold text-white">{player}</h2>
                </div>

                {/* Profile summary */}
                <div className="mb-4">
                  <ProfileSummary profile={rec.profile} overallWinRate={rec.overallWinRate} />
                </div>

                {/* Pick recommendations */}
                <div className="space-y-2">
                  {rec.picks.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-green-400 text-sm mb-2">
                        <TrendingUp size={14} />
                        <span className="font-medium">Top Picks</span>
                        <span className="text-gray-600 text-xs ml-1">(scored 0-100 based on historical patterns)</span>
                      </div>
                      {rec.picks.map((pick, i) => (
                        <PickCard key={`pick-${i}`} pick={pick} rank={i + 1} />
                      ))}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      {rec.message || 'Not enough historical data to generate recommendations'}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
