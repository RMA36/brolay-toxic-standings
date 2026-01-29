import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { formatDateForDisplay, getPicksArray, getPickBigGuy, getPickResult, getPickPropType, getPickPlayerPosition, getPickPlayerTeam } from '../utils/formatters';
import { tokenizeQuery, findBestTeamMatch, filterByRelevance } from '../searchUtils';
import { SPORTS, PLAYERS, PICK_TYPES, PRELOADED_TEAMS, COMMON_PROP_TYPES } from '../constants/sports';
import { formatComboDescription } from '../insightsHelper';

/**
 * Search - Search page component for deep insights and analysis
 *
 * Features:
 * - Intelligent search with query analysis and tokenization
 * - Search by player, sport, team, bet type, prop type, or day of week
 * - Search insights and pattern detection
 * - Search result caching for performance
 * - Featured insights when no search active (Money Maker, Danger Zone, Seasonal Tips)
 */
const Search = () => {
  // Get context values
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    lastSearchedQuery,
    setLastSearchedQuery,
    searchCache,
    setSearchCache,
    parlays,
    players,
    filters,
    isMobile,
    moneyMaker,
    dangerZone,
    seasonalTip,
    currentDay,
    currentSports,
    learnedTeams,
    learnedPlayers
  } = useBrolayContext();

  // Constants
  const sports = SPORTS;
  const betTypes = PICK_TYPES;
  const preloadedTeams = PRELOADED_TEAMS;
  const commonPropTypes = COMMON_PROP_TYPES;

  /**
   * Analyzes search query and returns matching results
   * @param {string} query - The search query string
   * @returns {Object|null} Search results object or null if no matches
   */
  const analyzeSearchQuery = (query) => {
    if (!query || query.trim().length < 3) {
      return null;
    }

    const lowerQuery = query.toLowerCase();
    console.log('🚀 Starting search analysis for:', lowerQuery);

    const results = {
      query: query,
      matchedCategory: null,
      data: {},
      searchContext: null
    };

    // Tokenize the search query
    const searchContext = tokenizeQuery(lowerQuery);

    // Add players to context - combine Big Guys + learned professional players
    const allPlayers = [...new Set([...players, ...(learnedPlayers || [])])];
    searchContext.players = allPlayers.filter(player =>
      lowerQuery.includes(player.toLowerCase())
    );

    // Try to find team match with fuzzy matching
    const allTeams = [...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])];
    searchContext.matchedTeam = findBestTeamMatch(lowerQuery, allTeams);

    // Detect what they're searching for - with stricter matching
    const isPropType = commonPropTypes.some(prop =>
      lowerQuery.includes(prop.toLowerCase())
    ) || lowerQuery.includes('prop') || lowerQuery.includes('touchdown') ||
       lowerQuery.includes('yards') || lowerQuery.includes('points');

    const isSport = sports.some(sport =>
      lowerQuery.includes(sport.toLowerCase())
    );

    const isPlayer = searchContext.players.length > 0;

    const isTeam = searchContext.matchedTeam !== null;

    const isBetType = betTypes.some(type =>
      lowerQuery.includes(type.toLowerCase())
    );

    console.log('🔎 Search category detection:', {
      isPropType,
      isSport,
      isPlayer,
      isTeam,
      isBetType
    });

    // Check if searching by day of week
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const isDayOfWeek = daysOfWeek.some(day => lowerQuery.includes(day));

    if (isDayOfWeek) {
      results.matchedCategory = 'dayOfWeek';

      const matchedDay = daysOfWeek.find(day => lowerQuery.includes(day));
      const dayIndex = daysOfWeek.indexOf(matchedDay);

      // Collect all picks on this day of week
      const matchingPicks = [];
      parlays.forEach(parlay => {
        const date = new Date(parlay.date + 'T00:00:00');
        const pickDayIndex = date.getDay();

        const adjustedDayIndex = pickDayIndex === 0 ? 6 : pickDayIndex - 1;

        if (adjustedDayIndex === dayIndex) {
          getPicksArray(parlay).forEach(pick => {
            const result = getPickResult(pick);
            if (result !== 'pending') {
              matchingPicks.push({
                ...pick,
                player: getPickBigGuy(pick),
                result: result,
                parlayDate: parlay.date
              });
            }
          });
        }
      });

      // Apply relevance filtering if other criteria specified
      const filteredPicks = searchContext.hasNFL || searchContext.hasNBA ||
                            searchContext.hasMLB || searchContext.hasNHL ||
                            searchContext.hasCollege || isPlayer ?
        filterByRelevance(matchingPicks, searchContext, 8) : matchingPicks;

      const stats = {
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        byPlayer: {},
        bySport: {},
        byBetType: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.player || !pick.betType || !pick.sport) return;
        if (!stats.byPlayer[pick.player]) {
          stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (!stats.bySport[pick.sport]) {
          stats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (!stats.byBetType[pick.betType]) {
          stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        if (pick.result === 'win') {
          stats.byPlayer[pick.player].wins++;
          stats.bySport[pick.sport].wins++;
          stats.byBetType[pick.betType].wins++;
        } else if (pick.result === 'loss') {
          stats.byPlayer[pick.player].losses++;
          stats.bySport[pick.sport].losses++;
          stats.byBetType[pick.betType].losses++;
        } else if (pick.result === 'push') {
          stats.byPlayer[pick.player].pushes++;
          stats.bySport[pick.sport].pushes++;
          stats.byBetType[pick.betType].pushes++;
        }
        stats.byPlayer[pick.player].total++;
        stats.bySport[pick.sport].total++;
        stats.byBetType[pick.betType].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    // Prop Type search with relevance filtering
    if (isPropType) {
      results.matchedCategory = 'propType';

      const matchedPropType = commonPropTypes.find(prop =>
        lowerQuery.includes(prop.toLowerCase())
      );

      console.log('🔍 Prop Type Search Debug:');
      console.log('  Query:', lowerQuery);
      console.log('  Matched Prop Type:', matchedPropType);

      const matchingPicks = [];
      parlays.forEach(parlay => {
        getPicksArray(parlay).forEach(pick => {
          const result = getPickResult(pick);
          if (result === 'pending') return;

          // Use the new helper to extract prop type, position, and team consistently
          const pickPropType = getPickPropType(pick);
          const pickPlayerPosition = getPickPlayerPosition(pick);
          const pickPlayerTeam = getPickPlayerTeam(pick);

          const pickPropLower = (pickPropType || '').toLowerCase();
          const pickPositionLower = (pickPlayerPosition || '').toLowerCase();
          const pickTeamLower = (pickPlayerTeam || '').toLowerCase();

          // Fix: Only match if the values are non-empty to avoid false matches
          const matchesProp =
            (pickPropLower && pickPropLower.includes(lowerQuery)) ||
            (pickPropLower && lowerQuery.includes(pickPropLower)) ||
            (matchedPropType && pickPropLower && pickPropLower.includes(matchedPropType.toLowerCase())) ||
            (pickPositionLower && pickPositionLower.includes(lowerQuery)) ||
            (pickPositionLower && lowerQuery.includes(pickPositionLower)) ||
            (pickTeamLower && pickTeamLower.includes(lowerQuery)) ||
            (pickTeamLower && lowerQuery.includes(pickTeamLower));

          if (matchesProp) {
            console.log('  ✅ MATCH:', {
              player: getPickBigGuy(pick),
              propType: pickPropType,
              position: pickPlayerPosition,
              team: pickPlayerTeam,
              betType: pick.betType,
              matchReason: {
                propMatch: pickPropLower.includes(lowerQuery) || lowerQuery.includes(pickPropLower),
                propTypeMatch: matchedPropType && pickPropLower.includes(matchedPropType.toLowerCase()),
                positionMatch: pickPositionLower.includes(lowerQuery) || lowerQuery.includes(pickPositionLower),
                teamMatch: pickTeamLower.includes(lowerQuery) || lowerQuery.includes(pickTeamLower)
              }
            });
            matchingPicks.push({
              ...pick,
              player: getPickBigGuy(pick),
              result: result,
              parlayDate: parlay.date
            });
          }
        });
      });

      console.log('  Total Matches:', matchingPicks.length);

      // Apply relevance filtering for more specific queries
      const filteredPicks = isSport || isPlayer ?
        filterByRelevance(matchingPicks, searchContext, 10) : matchingPicks;

      const stats = {
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        byPlayer: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.player) return;
        if (!stats.byPlayer[pick.player]) {
          stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (pick.result === 'win') {
          stats.byPlayer[pick.player].wins++;
        } else if (pick.result === 'loss') {
          stats.byPlayer[pick.player].losses++;
        } else if (pick.result === 'push') {
          stats.byPlayer[pick.player].pushes++;
        }
        stats.byPlayer[pick.player].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    // Team search with fuzzy matching
    if (isTeam) {
      results.matchedCategory = 'team';

      const matchingPicks = [];
      parlays.forEach(parlay => {
        getPicksArray(parlay).forEach(pick => {
          const result = getPickResult(pick);
          if (result === 'pending') return;

          // Check ALL possible team-related fields
          const pickTeam = pick.team || '';
          const pickOpp = pick.opponent || '';
          const pickAwayTeam = pick.awayTeam || pick.game?.awayTeam || '';
          const pickHomeTeam = pick.homeTeam || pick.game?.homeTeam || '';
          const pickFavorite = pick.favorite || '';

          // Match if the searched team appears in ANY team field
          if (pickTeam.includes(searchContext.matchedTeam) ||
              pickOpp.includes(searchContext.matchedTeam) ||
              pickAwayTeam.includes(searchContext.matchedTeam) ||
              pickHomeTeam.includes(searchContext.matchedTeam) ||
              pickFavorite.includes(searchContext.matchedTeam)) {
            matchingPicks.push({
              ...pick,
              player: getPickBigGuy(pick),
              result: result,
              parlayDate: parlay.date
            });
          }
        });
      });

      // Apply relevance filtering for specific queries
      const shouldFilter = isSport || isPlayer || isBetType;
      const filteredPicks = shouldFilter ?
        filterByRelevance(matchingPicks, searchContext, 3) : matchingPicks;

      const stats = {
        team: searchContext.matchedTeam,
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        byPlayer: {},
        byBetType: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.player || !pick.betType) return;
        if (!stats.byPlayer[pick.player]) {
          stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (!stats.byBetType[pick.betType]) {
          stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        if (pick.result === 'win') {
          stats.byPlayer[pick.player].wins++;
          stats.byBetType[pick.betType].wins++;
        } else if (pick.result === 'loss') {
          stats.byPlayer[pick.player].losses++;
          stats.byBetType[pick.betType].losses++;
        } else if (pick.result === 'push') {
          stats.byPlayer[pick.player].pushes++;
          stats.byBetType[pick.betType].pushes++;
        }
        stats.byPlayer[pick.player].total++;
        stats.byBetType[pick.betType].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    // Bet type search
    if (isBetType && !isTeam && !isPropType) {
      results.matchedCategory = 'betType';

      const matchedBetType = betTypes.find(type =>
        lowerQuery.includes(type.toLowerCase())
      );

      const matchingPicks = [];
      parlays.forEach(parlay => {
        getPicksArray(parlay).forEach(pick => {
          const bigGuy = getPickBigGuy(pick);
          const result = getPickResult(pick);
          if (!bigGuy || !pick.betType) return;
          if (result === 'pending') return;
          if (pick.betType === matchedBetType) {
            matchingPicks.push({
              ...pick,
              player: bigGuy,
              result: result,
              parlayDate: parlay.date
            });
          }
        });
      });

      // Apply relevance filtering for specific queries
      const filteredPicks = isSport || isPlayer ?
        filterByRelevance(matchingPicks, searchContext, 8) : matchingPicks;

      const stats = {
        betType: matchedBetType,
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        byPlayer: {},
        bySport: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.player) return;
        if (!stats.byPlayer[pick.player]) {
          stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (pick.sport && !stats.bySport[pick.sport]) {
          stats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        if (pick.result === 'win') {
          stats.byPlayer[pick.player].wins++;
          if (pick.sport) stats.bySport[pick.sport].wins++;
        } else if (pick.result === 'loss') {
          stats.byPlayer[pick.player].losses++;
          if (pick.sport) stats.bySport[pick.sport].losses++;
        } else if (pick.result === 'push') {
          stats.byPlayer[pick.player].pushes++;
          if (pick.sport) stats.bySport[pick.sport].pushes++;
        }
        stats.byPlayer[pick.player].total++;
        if (pick.sport) stats.bySport[pick.sport].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    // Sport search with strict matching
    if (isSport) {
      results.matchedCategory = 'sport';

      const matchedSport = sports.find(sport => lowerQuery.includes(sport.toLowerCase()));

      const matchingPicks = [];
      parlays.forEach(parlay => {
        getPicksArray(parlay).forEach(pick => {
          const bigGuy = getPickBigGuy(pick);
          const result = getPickResult(pick);
          if (!bigGuy || !pick.betType) return;
          if (result === 'pending') return;
          if (pick.sport === matchedSport) {
            matchingPicks.push({
              ...pick,
              player: bigGuy,
              result: result,
              parlayDate: parlay.date
            });
          }
        });
      });

      // Apply relevance filtering for specific queries
      const filteredPicks = isPlayer || isBetType ?
        filterByRelevance(matchingPicks, searchContext, 10) : matchingPicks;

      const stats = {
        sport: matchedSport,
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        byPlayer: {},
        byBetType: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.player || !pick.betType) return;
        if (!stats.byPlayer[pick.player]) {
          stats.byPlayer[pick.player] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (!stats.byBetType[pick.betType]) {
          stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        if (pick.result === 'win') {
          stats.byPlayer[pick.player].wins++;
          stats.byBetType[pick.betType].wins++;
        } else if (pick.result === 'loss') {
          stats.byPlayer[pick.player].losses++;
          stats.byBetType[pick.betType].losses++;
        } else if (pick.result === 'push') {
          stats.byPlayer[pick.player].pushes++;
          stats.byBetType[pick.betType].pushes++;
        }
        stats.byPlayer[pick.player].total++;
        stats.byBetType[pick.betType].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    // Player search with relevance filtering
    if (isPlayer) {
      results.matchedCategory = 'player';

      const targetPlayer = searchContext.players[0];

      const matchingPicks = [];
      parlays.forEach(parlay => {
        getPicksArray(parlay).forEach(pick => {
          const bigGuy = getPickBigGuy(pick);
          const result = getPickResult(pick);
          if (result === 'pending') return;
          if (bigGuy === targetPlayer) {
            matchingPicks.push({
              ...pick,
              player: bigGuy,
              result: result,
              parlayDate: parlay.date
            });
          }
        });
      });

      // Apply relevance filtering for specific queries
      const filteredPicks = isSport || isBetType ?
        filterByRelevance(matchingPicks, searchContext, 8) : matchingPicks;

      const stats = {
        player: targetPlayer,
        total: filteredPicks.length,
        wins: filteredPicks.filter(p => p.result === 'win').length,
        losses: filteredPicks.filter(p => p.result === 'loss').length,
        pushes: filteredPicks.filter(p => p.result === 'push').length,
        winPct: 0,
        bySport: {},
        byBetType: {}
      };

      const adjustedWins = stats.wins + (stats.pushes * 0.5);
      stats.winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;

      filteredPicks.forEach(pick => {
        if (!pick.sport || !pick.betType) return;
        if (!stats.bySport[pick.sport]) {
          stats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        if (!stats.byBetType[pick.betType]) {
          stats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        if (pick.result === 'win') {
          stats.bySport[pick.sport].wins++;
          stats.byBetType[pick.betType].wins++;
        } else if (pick.result === 'loss') {
          stats.bySport[pick.sport].losses++;
          stats.byBetType[pick.betType].losses++;
        } else if (pick.result === 'push') {
          stats.bySport[pick.sport].pushes++;
          stats.byBetType[pick.betType].pushes++;
        }
        stats.bySport[pick.sport].total++;
        stats.byBetType[pick.betType].total++;
      });

      stats.recentPicks = filteredPicks
        .sort((a, b) => new Date(b.parlayDate) - new Date(a.parlayDate))
        .slice(0, 10);

      results.data = stats;
      results.searchContext = searchContext;

      if (filteredPicks.length === 0) return null;
      return results;
    }

    return null;
  };

  /**
   * Generates insights from search results
   * @param {Object} searchResults - The search results object
   * @returns {Array} Array of insight strings
   */
  const generateSearchInsights = (searchResults) => {
    if (!searchResults || !searchResults.data) return [];

    const insights = [];
    const { data, matchedCategory, searchContext = {} } = searchResults;

    // Determine if search is specific or general
    const isSpecific = (searchContext.players?.length > 0 &&
                       (searchContext.hasNFL || searchContext.hasNBA ||
                        searchContext.hasMLB || searchContext.hasNHL)) ||
                       (searchContext.matchedTeam &&
                        (searchContext.hasMoneyline || searchContext.hasSpread));

    if (matchedCategory === 'player') {
      // Player-specific insights
      if (data.total >= 10) {
        const bestSport = Object.entries(data.bySport)
          .sort((a, b) => {
            const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
            const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
            const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
            const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
            return bRate - aRate;
          })[0];

        if (bestSport && bestSport[1].total >= 5) {
          const adjustedWins = bestSport[1].wins + (bestSport[1].pushes * 0.5);
          const winRate = ((adjustedWins / bestSport[1].total) * 100).toFixed(1);
          insights.push(`🎯 ${data.player} performs best in ${bestSport[0]} with a ${winRate}% win rate`);
        }
      }

      const bestBetType = Object.entries(data.byBetType)
        .sort((a, b) => {
          const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
          const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
          const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
          const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
          return bRate - aRate;
        })[0];

      if (bestBetType && bestBetType[1].total >= 3) {
        const adjustedWins = bestBetType[1].wins + (bestBetType[1].pushes * 0.5);
        const winRate = ((adjustedWins / bestBetType[1].total) * 100).toFixed(1);
        insights.push(`💡 ${bestBetType[0]}s are ${data.player}'s strength at ${winRate}%`);
      }

    } else if (matchedCategory === 'sport') {
      // Sport-specific insights
      const bestPlayer = Object.entries(data.byPlayer)
        .filter(([_, stats]) => stats.total >= 5)
        .sort((a, b) => {
          const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
          const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
          const aRate = (aAdjusted / a[1].total);
          const bRate = (bAdjusted / b[1].total);
          return bRate - aRate;
        })[0];

      if (bestPlayer) {
        const adjustedWins = bestPlayer[1].wins + (bestPlayer[1].pushes * 0.5);
        const winRate = ((adjustedWins / bestPlayer[1].total) * 100).toFixed(1);
        insights.push(`⭐ ${bestPlayer[0]} leads in ${data.sport} with ${winRate}% win rate`);
      }

      const mostActiveBetType = Object.entries(data.byBetType)
        .sort((a, b) => b[1].total - a[1].total)[0];

      if (mostActiveBetType) {
        insights.push(`📊 ${mostActiveBetType[0]} is the most popular bet type for ${data.sport} (${mostActiveBetType[1].total} picks)`);
      }

    } else if (matchedCategory === 'team') {
      // Team-specific insights
      if (data.total >= 5) {
        const bestPlayer = Object.entries(data.byPlayer)
          .sort((a, b) => {
            const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
            const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
            const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
            const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
            return bRate - aRate;
          })[0];

        if (bestPlayer && bestPlayer[1].total >= 3) {
          const adjustedWins = bestPlayer[1].wins + (bestPlayer[1].pushes * 0.5);
          const winRate = ((adjustedWins / bestPlayer[1].total) * 100).toFixed(1);
          insights.push(`🔥 ${bestPlayer[0]} has the best record on ${data.team} at ${winRate}%`);
        }
      }

    } else if (matchedCategory === 'betType') {
      // Bet type insights
      const bestPlayer = Object.entries(data.byPlayer)
        .filter(([_, stats]) => stats.total >= 3)
        .sort((a, b) => {
          const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
          const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
          const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
          const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
          return bRate - aRate;
        })[0];

      if (bestPlayer) {
        const adjustedWins = bestPlayer[1].wins + (bestPlayer[1].pushes * 0.5);
        const winRate = ((adjustedWins / bestPlayer[1].total) * 100).toFixed(1);
        insights.push(`⭐ ${bestPlayer[0]} leads in ${data.betType} with ${winRate}% win rate`);
      }

      if (Object.keys(data.bySport).length > 1) {
        const bestSport = Object.entries(data.bySport)
          .filter(([_, stats]) => stats.total >= 3)
          .sort((a, b) => {
            const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
            const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
            const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
            const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
            return bRate - aRate;
          })[0];

        if (bestSport) {
          const adjustedWins = bestSport[1].wins + (bestSport[1].pushes * 0.5);
          const winRate = ((adjustedWins / bestSport[1].total) * 100).toFixed(1);
          insights.push(`🏆 ${data.betType} works best in ${bestSport[0]} at ${winRate}%`);
        }
      }

    } else if (matchedCategory === 'propType') {
      // Prop type insights
      const dominantPlayer = Object.entries(data.byPlayer)
        .sort((a, b) => b[1].total - a[1].total)[0];

      if (dominantPlayer && dominantPlayer[1].total >= 3) {
        insights.push(`👑 ${dominantPlayer[0]} picks this prop type most often (${dominantPlayer[1].total} times)`);
      }

      if (data.winPct >= 60) {
        insights.push(`💰 This prop type has been profitable at ${data.winPct}% win rate!`);
      } else if (data.winPct <= 40) {
        insights.push(`⚠️ Caution: This prop type is below 50% at ${data.winPct}%`);
      }

    } else if (matchedCategory === 'dayOfWeek') {
      // Day-specific insights
      const bestSport = Object.entries(data.bySport)
        .filter(([_, stats]) => stats.total >= 3)
        .sort((a, b) => {
          const aAdjusted = a[1].wins + (a[1].pushes * 0.5);
          const bAdjusted = b[1].wins + (b[1].pushes * 0.5);
          const aRate = a[1].total > 0 ? (aAdjusted / a[1].total) : 0;
          const bRate = b[1].total > 0 ? (bAdjusted / b[1].total) : 0;
          return bRate - aRate;
        })[0];

      if (bestSport) {
        const adjustedWins = bestSport[1].wins + (bestSport[1].pushes * 0.5);
        const winRate = ((adjustedWins / bestSport[1].total) * 100).toFixed(1);
        insights.push(`🏆 ${bestSport[0]} performs best on this day at ${winRate}%`);
      }
    }

    // General insights based on sample size
    if (data.total >= 20) {
      insights.push(`📈 Strong sample size of ${data.total} picks for reliable analysis`);
    } else if (data.total < 10 && data.total > 0) {
      insights.push(`⚠️ Limited data (${data.total} picks) - insights may vary with more samples`);
    }

    // Streak detection
    if (data.recentPicks && data.recentPicks.length >= 5) {
      const lastFive = data.recentPicks.slice(0, 5);
      const recentWins = lastFive.filter(p => p.result === 'win').length;

      if (recentWins >= 4) {
        insights.push(`🔥 Hot streak! ${recentWins}/5 wins in recent picks`);
      } else if (recentWins <= 1) {
        insights.push(`📉 Cold stretch: ${recentWins}/5 wins in last 5 picks`);
      }
    }

    return insights;
  };

  /**
   * Handles search execution
   */
  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 3) {
      setLastSearchedQuery(trimmedQuery);

      // Check cache first
      const cacheKey = trimmedQuery.toLowerCase();
      if (searchCache[cacheKey]) {
        console.log('⚡ Using cached results for:', trimmedQuery);
        console.log('💡 TIP: Clear cache by refreshing page to test new logic');
        setSearchResults(searchCache[cacheKey]);
        return;
      }

      console.log('🔄 Running fresh search for:', trimmedQuery);
      const results = analyzeSearchQuery(trimmedQuery);
      setSearchResults(results);

      // Cache the results
      if (results) {
        setSearchCache(prev => ({
          ...prev,
          [cacheKey]: results
        }));
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🔍 Insights & Deep Dive</h2>

      {/* Search Bar */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Try: "Anytime Touchdown Scorer record" or "Chiefs record" or "Management NBA stats"'
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
          />
          <Button
            onClick={handleSearch}
            variant="primary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Search
          </Button>
        </div>

        {/* Search Examples */}
        <div className="mt-3 text-sm text-gray-600">
          <p className="font-semibold mb-2 text-gray-400">Examples:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Anytime Touchdown Scorer record',
              'Spread bets stats',
              `${currentDay} picks`,
              'Management NFL stats',
              'Vanderbilt picks'
            ].map(example => (
              <Button
                key={example}
                onClick={() => {
                  setSearchQuery(example);
                  setSearchResults(analyzeSearchQuery(example));
                }}
                variant="ghost"
                size="small"
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* No Results Message */}
      {searchResults === null && lastSearchedQuery && (
        <div className="bg-gradient-to-br from-red-900/30 to-gray-800 rounded-xl p-4 md:p-6 border border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <p className="text-red-400 font-semibold">
              No results found for "{lastSearchedQuery}"
            </p>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Try searching for a specific prop type, team, player, sport, or bet type.
          </p>
        </div>
      )}

      {/* Dynamic Featured Insights - Only show if no search results */}
      {!searchResults && (
        <div className="space-y-4">
          {/* Seasonal Tip Banner */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-semibold text-blue-400 text-sm">Today's Tip</div>
                <div className="text-white">{seasonalTip}</div>
              </div>
            </div>
          </div>

          {/* Money Maker & Danger Zone Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Money Maker */}
            {moneyMaker ? (
              <Card
                variant="success"
                padding="default"
                className="transform hover:scale-105 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-green-400 font-bold text-lg">💰 Money Maker</h3>
                    <p className="text-gray-400 text-sm">Your best combo</p>
                  </div>
                  <span className="text-2xl">🎯</span>
                </div>
                <p className="text-white text-lg mb-2">{formatComboDescription(moneyMaker)}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-400 font-bold">{moneyMaker.winRate.toFixed(1)}% win rate</span>
                  <span className="text-gray-400">{moneyMaker.totalPicks} picks</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {moneyMaker.wins}-{moneyMaker.losses} record
                </div>
              </Card>
            ) : (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-yellow-400 font-bold text-lg">💰 Money Maker Alert</h3>
                    <p className="text-gray-400 text-sm">Looking for patterns...</p>
                  </div>
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Need more data for {currentSports[0]} on {currentDay}s. Keep betting to unlock insights!
                </p>
              </div>
            )}

            {/* Danger Zone */}
            {dangerZone ? (
              <Card
                variant="danger"
                padding="default"
                className="transform hover:scale-105 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">⚠️ Danger Zone</h3>
                    <p className="text-gray-400 text-sm">Avoid this combo</p>
                  </div>
                  <span className="text-2xl">🚨</span>
                </div>
                <p className="text-white text-lg mb-2">{formatComboDescription(dangerZone)}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-400 font-bold">{dangerZone.winRate.toFixed(1)}% win rate</span>
                  <span className="text-gray-400">{dangerZone.totalPicks} picks</span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {dangerZone.wins}-{dangerZone.losses} record
                </div>
              </Card>
            ) : (
              <Card variant="default" padding="default">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">⚠️ Danger Zone</h3>
                    <p className="text-gray-400 text-sm">Looking for warning signs...</p>
                  </div>
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-400 text-sm">
                  No concerning patterns detected yet. Keep tracking!
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <Card title={`Results for: "${searchResults.query}"`} className="text-yellow-400">
          {(() => {
            const insights = generateSearchInsights(searchResults);
            return insights.length > 0 ? (
              <div className="mb-6 space-y-2">
                <h4 className="font-semibold text-sm text-gray-400">💡 Key Insights</h4>
                <div className="space-y-2">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-sm text-blue-200">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {searchResults.matchedCategory === 'propType' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => {
                    const adjustedWins = stats.wins + (stats.pushes * 0.5);
                    const winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;
                    const recordDisplay = stats.pushes > 0
                      ? `${stats.wins}-${stats.losses}-${stats.pushes}`
                      : `${stats.wins}-${stats.losses}`;

                    return (
                      <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                        <span className="font-semibold text-white">{player}</span>
                        <span className="text-sm text-gray-300">
                          {recordDisplay} ({winPct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {searchResults.data.topPlayers?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-3">🎯 Most Common Players Picked</h4>
                  <div className="space-y-2">
                    {searchResults.data.topPlayers.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-semibold">{item.player}</span>
                        <span className="text-sm">{item.count} picks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(searchResults.matchedCategory === 'betType' || searchResults.matchedCategory === 'sport') && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => {
                    const adjustedWins = stats.wins + (stats.pushes * 0.5);
                    const winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;
                    const recordDisplay = stats.pushes > 0
                      ? `${stats.wins}-${stats.losses}-${stats.pushes}`
                      : `${stats.wins}-${stats.losses}`;

                    return (
                      <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                        <span className="font-semibold text-white">{player}</span>
                        <span className="text-sm text-gray-300">
                          {recordDisplay} ({winPct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Show sport breakdown for bet type searches */}
              {searchResults.matchedCategory === 'betType' && searchResults.data.bySport && Object.keys(searchResults.data.bySport).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-3 text-yellow-400">🏈 By Sport</h4>
                  <div className="space-y-2">
                    {Object.entries(searchResults.data.bySport).map(([sport, stats]) => {
                      const adjustedWins = stats.wins + (stats.pushes * 0.5);
                      const winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;
                      const recordDisplay = stats.pushes > 0
                        ? `${stats.wins}-${stats.losses}-${stats.pushes}`
                        : `${stats.wins}-${stats.losses}`;

                      return (
                        <div key={sport} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                          <span className="font-semibold text-white">{sport}</span>
                          <span className="text-sm text-gray-300">
                            {recordDisplay} ({winPct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {searchResults.matchedCategory === 'team' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 Who Picks {searchResults.data.team}?</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => {
                    const adjustedWins = stats.wins + (stats.pushes * 0.5);
                    const winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;
                    const recordDisplay = stats.pushes > 0
                      ? `${stats.wins}-${stats.losses}-${stats.pushes}`
                      : `${stats.wins}-${stats.losses}`;

                    return (
                      <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                        <span className="font-semibold text-white">{player}</span>
                        <span className="text-sm text-gray-300">
                          {recordDisplay} ({winPct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {searchResults.matchedCategory === 'dayOfWeek' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Big Guy</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byPlayer).map(([player, stats]) => {
                    const adjustedWins = stats.wins + (stats.pushes * 0.5);
                    const winPct = stats.total > 0 ? ((adjustedWins / stats.total) * 100).toFixed(1) : 0;
                    const recordDisplay = stats.pushes > 0
                      ? `${stats.wins}-${stats.losses}-${stats.pushes}`
                      : `${stats.wins}-${stats.losses}`;

                    return (
                      <div key={player} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                        <span className="font-semibold text-white">{player}</span>
                        <span className="text-sm text-gray-300">
                          {recordDisplay} ({winPct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">🏈 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{sport}</span>
                      <span className="text-sm text-gray-300">
                        {stats.pushes > 0 ? `${stats.wins}-${stats.losses}-${stats.pushes}` : `${stats.wins}-${stats.losses}`} ({stats.total > 0 ? (((stats.wins + stats.pushes * 0.5) / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">🎲 By Bet Type</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.byBetType).map(([betType, stats]) => (
                    <div key={betType} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{betType}</span>
                      <span className="text-sm text-gray-300">
                        {stats.pushes > 0 ? `${stats.wins}-${stats.losses}-${stats.pushes}` : `${stats.wins}-${stats.losses}`} ({stats.total > 0 ? (((stats.wins + stats.pushes * 0.5) / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {searchResults.matchedCategory === 'player' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Total Picks</div>
                  <div className="text-2xl font-bold text-blue-400">{searchResults.data.total}</div>
                </div>
                <div className="bg-green-900/40 p-4 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Wins</div>
                  <div className="text-2xl font-bold text-green-400">{searchResults.data.wins}</div>
                </div>
                <div className="bg-red-900/40 p-4 rounded-lg border border-red-500/30">
                  <div className="text-sm text-red-300">Losses</div>
                  <div className="text-2xl font-bold text-red-400">{searchResults.data.losses}</div>
                </div>
                <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Win %</div>
                  <div className="text-2xl font-bold text-purple-400">{searchResults.data.winPct}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-yellow-400">📊 By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(searchResults.data.bySport).map(([sport, stats]) => (
                    <div key={sport} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                      <span className="font-semibold text-white">{sport}</span>
                      <span className="text-sm text-gray-300">
                        {stats.pushes > 0 ? `${stats.wins}-${stats.losses}-${stats.pushes}` : `${stats.wins}-${stats.losses}`} ({stats.total > 0 ?
                        (((stats.wins + stats.pushes * 0.5) / stats.total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {searchResults.data.recentPicks && searchResults.data.recentPicks.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-3 text-yellow-400">📅 Recent Picks</h4>
              <div className="space-y-2">
                {searchResults.data.recentPicks.map((pick, idx) => (
                  <div key={idx} className="p-3 bg-gray-900/50 rounded text-sm border border-gray-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-white">{formatDateForDisplay(pick.parlayDate)}</span>
                      <span className={`font-semibold ${
                        pick.result === 'win' ? 'text-green-400' :
                        pick.result === 'loss' ? 'text-red-400' :
                        pick.result === 'push' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {pick.result.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      {pick.player} - {pick.sport} - {pick.team || `${pick.awayTeam} @ ${pick.homeTeam}`}
                      {pick.betType === 'Prop Bet' && ` - ${pick.propType} ${pick.overUnder} ${pick.line}`}
                    </div>
                    {pick.actualStats && (
                      <div className="text-blue-400 mt-1">[{pick.actualStats}]</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Search;
