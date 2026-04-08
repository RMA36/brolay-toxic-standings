import { useMemo } from 'react';

/**
 * Helper to get picks from a parlay (new schema: parlay.picks)
 */
const getPicksArray = (parlay) => {
  if (!parlay.picks) return [];
  return Object.values(parlay.picks);
};

/**
 * Helper to get the Big Guy name from a pick (new schema: pick.bigGuy)
 */
const getBigGuy = (pick) => pick.bigGuy || '';

/**
 * Helper to get the result/status from a pick (new schema: pick.outcome.status)
 */
const getResult = (pick) => pick.outcome?.status || '';

/**
 * Helper to get prop type info for multi-player props (supports both schemas)
 * New schema stores in entities[].statType
 */
const getPlayer1PropType = (pick) => {
  // New schema: check entities array
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary');
    if (primary?.statType) return primary.statType;
  }
  // New schema: line.statType
  if (pick.line?.statType) return pick.line.statType;
  // Old schema
  return pick.player1PropType;
};

const getPlayer2PropType = (pick) => {
  // New schema: check entities array
  if (pick.entities && pick.entities.length > 1) {
    const opponent = pick.entities.find(e => e.role === 'opponent' || e.role === 'secondary');
    if (opponent?.statType) return opponent.statType;
  }
  // Old schema
  return pick.player2PropType;
};

/**
 * Helper to get player1/player2 names (supports both schemas)
 */
const getPlayer1Name = (pick) => {
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary');
    if (primary?.name) return primary.name;
  }
  return pick.player1;
};

const getPlayer2Name = (pick) => {
  if (pick.entities && pick.entities.length > 1) {
    const opponent = pick.entities.find(e => e.role === 'opponent' || e.role === 'secondary');
    if (opponent?.name) return opponent.name;
  }
  return pick.player2;
};

/**
 * Helper to get prop type from pick (for Either/Combined props)
 */
const getPropType = (pick) => {
  if (pick.line?.statType) return pick.line.statType;
  return pick.propType;
};

/**
 * Custom hook for calculating statistics from brolay (parlay) data
 *
 * @param {Array} parlays - Array of parlay objects from Firebase
 * @param {Array} players - Array of player names (Big Guys)
 * @param {Object} editingParlay - Currently editing parlay (excluded from calculations)
 * @returns {Object} Statistics object with player stats and helper functions
 */
export const useStats = (parlays, players, editingParlay = null) => {

  /**
   * Calculate comprehensive statistics for all players
   * Includes win/loss records, money tracking, and breakdowns by sport/bet type
   */
  const calculateStats = useMemo(() => {
    const stats = {};
    players.forEach(player => {
      stats[player] = {
        totalPicks: 0,
        wins: 0,
        losses: 0,
        moneyWon: 0,
        moneyLost: 0,
        and1s: 0,
        and1Cost: 0,
        bySport: {},
        byBetType: {},
        // Multi-entity prop stats
        h2hProps: { total: 0, wins: 0, losses: 0, pushes: 0 },
        eitherProps: { total: 0, wins: 0, losses: 0 },
        combinedProps: { total: 0, wins: 0, losses: 0 },
        byH2HPropType: {},      // Track by prop type combination
        byEitherPropType: {},   // Track Either props by prop type
        byCombinedPropType: {} // Track Combined props by prop type
      };
    });

    parlays.forEach(parlay => {
      // Skip the parlay being edited - it's in draft state
      if (editingParlay && parlay.id === editingParlay.id) {
        return;
      }
      const picks = getPicksArray(parlay);
      const losers = picks.filter(p => getResult(p) === 'loss');
      const winners = picks.filter(p => getResult(p) === 'win');
      const pushes = picks.filter(p => getResult(p) === 'push');
      const allResolved = (losers.length + winners.length + pushes.length) === picks.length;
      const parlayWon = allResolved && losers.length === 0 && winners.length > 0;
      const and1 = allResolved && losers.length === 1 && winners.length + pushes.length === picks.length - 1;

      picks.forEach(pick => {
        const bigGuy = getBigGuy(pick);
        const result = getResult(pick);

        if (!bigGuy || bigGuy === '' || !pick.sport || !pick.betType) return;

        const playerStats = stats[bigGuy];
        if (!playerStats) return; // Skip if not a known Big Guy

        playerStats.totalPicks++;

        if (!playerStats.bySport[pick.sport]) {
          playerStats.bySport[pick.sport] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.bySport[pick.sport].total++;

        if (!playerStats.byBetType[pick.betType]) {
          playerStats.byBetType[pick.betType] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.byBetType[pick.betType].total++;

        // Track multi-entity props
        const player1PropType = getPlayer1PropType(pick);
        const player2PropType = getPlayer2PropType(pick);
        const player1Name = getPlayer1Name(pick);
        const player2Name = getPlayer2Name(pick);
        const propType = getPropType(pick);

        if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
          playerStats.h2hProps.total++;

          // Track by prop type combination
          const propCombo = player1PropType === player2PropType
            ? player1PropType
            : `${player1PropType} vs ${player2PropType}`;

          if (!playerStats.byH2HPropType[propCombo]) {
            playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
          }
          playerStats.byH2HPropType[propCombo].total++;
        } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
          playerStats.eitherProps.total++;

          if (!playerStats.byEitherPropType[propType]) {
            playerStats.byEitherPropType[propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byEitherPropType[propType].total++;
        } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
          playerStats.combinedProps.total++;

          if (!playerStats.byCombinedPropType[propType]) {
            playerStats.byCombinedPropType[propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byCombinedPropType[propType].total++;
        }

        if (result === 'win') {
          playerStats.wins++;
          playerStats.bySport[pick.sport].wins++;
          playerStats.byBetType[pick.betType].wins++;

          // Track multi-entity prop wins
          if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
            playerStats.h2hProps.wins++;
            const propCombo = player1PropType === player2PropType
              ? player1PropType
              : `${player1PropType} vs ${player2PropType}`;
            if (playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo].wins++;
            }
          } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
            playerStats.eitherProps.wins++;
            if (playerStats.byEitherPropType[propType]) {
              playerStats.byEitherPropType[propType].wins++;
            }
          } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
            playerStats.combinedProps.wins++;
            if (playerStats.byCombinedPropType[propType]) {
              playerStats.byCombinedPropType[propType].wins++;
            }
          }

          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * picks.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[pick.sport].losses++;
          playerStats.byBetType[pick.betType].losses++;

          // Track multi-entity prop losses
          if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
            playerStats.h2hProps.losses++;
            const propCombo = player1PropType === player2PropType
              ? player1PropType
              : `${player1PropType} vs ${player2PropType}`;
            if (playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo].losses++;
            }
          } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
            playerStats.eitherProps.losses++;
            if (playerStats.byEitherPropType[propType]) {
              playerStats.byEitherPropType[propType].losses++;
            }
          } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
            playerStats.combinedProps.losses++;
            if (playerStats.byCombinedPropType[propType]) {
              playerStats.byCombinedPropType[propType].losses++;
            }
          }

          const totalAmount = parlay.betAmount * picks.length;
          const birthdayPlayer = parlay.birthdayPlayer;
          const isEvenSplit = parlay.evenSplit;

          if (isEvenSplit) {
            // Even split: everyone loses equally
            playerStats.moneyLost += totalAmount / picks.length;
          } else if (birthdayPlayer && bigGuy === birthdayPlayer) {
            // Birthday player has no risk — $0 lost
          } else if (birthdayPlayer) {
            const birthdayLost = losers.some(l => getBigGuy(l) === birthdayPlayer);
            const nonBirthdayLosers = losers.filter(l => getBigGuy(l) !== birthdayPlayer);
            const nonBirthdayPicks = picks.filter(p => getBigGuy(p) !== birthdayPlayer);
            const isBirthdayAnd1 = birthdayLost && losers.length === 1;

            if (isBirthdayAnd1) {
              // Birthday guy only loser → all non-birthday participants split
              playerStats.moneyLost += totalAmount / nonBirthdayPicks.length;
            } else if (birthdayLost && nonBirthdayLosers.length > 0) {
              // Birthday guy lost too → only non-birthday losers split
              playerStats.moneyLost += totalAmount / nonBirthdayLosers.length;
            } else {
              // Birthday guy won → normal logic for this loser
              if (and1) {
                playerStats.and1s++;
                const potentialNetProfit = (parlay.totalPayout || 0) - totalAmount;
                playerStats.and1Cost += potentialNetProfit;
                playerStats.moneyLost += totalAmount;
              } else {
                playerStats.moneyLost += totalAmount / losers.length;
              }
            }
          } else if (and1) {
            playerStats.and1s++;
            // For And-1s, the cost is the potential net profit we would have won
            const potentialNetProfit = (parlay.totalPayout || 0) - totalAmount;
            playerStats.and1Cost += potentialNetProfit;
            playerStats.moneyLost += totalAmount;
          } else {
            playerStats.moneyLost += totalAmount / losers.length;
          }
        }
      });
    });

    return stats;
  }, [parlays, players, editingParlay]);

  /**
   * Calculate detailed statistics for a specific player (Big Guy)
   *
   * @param {string} player - Player name (Big Guy)
   * @param {Array} parlaysList - List of parlays to analyze
   * @returns {Object} Detailed player statistics
   */
  const calculateStatsForPlayer = (player, parlaysList) => {
    const playerStats = {
      totalPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      moneyWon: 0,
      moneyLost: 0,
      and1s: 0,
      and1Cost: 0,
      bySport: {},
      byBetType: {},
      // Multi-entity prop stats
      h2hProps: { total: 0, wins: 0, losses: 0, pushes: 0 },
      eitherProps: { total: 0, wins: 0, losses: 0 },
      combinedProps: { total: 0, wins: 0, losses: 0 },
      byH2HPropType: {},      // Track by prop type combination
      byEitherPropType: {},   // Track Either props by prop type
      byCombinedPropType: {} // Track Combined props by prop type
    };

    parlaysList.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const losers = picks.filter(p => getResult(p) === 'loss');
      const winners = picks.filter(p => getResult(p) === 'win');
      const pushes = picks.filter(p => getResult(p) === 'push');
      const allResolved = (losers.length + winners.length + pushes.length) === picks.length;
      const parlayWon = allResolved && losers.length === 0 && winners.length > 0;
      const and1 = allResolved && losers.length === 1 && winners.length + pushes.length === picks.length - 1;

      picks.forEach(pick => {
        const bigGuy = getBigGuy(pick);
        const result = getResult(pick);

        if (bigGuy !== player || !pick.sport || !pick.betType) return;

        playerStats.totalPicks++;
        if (!playerStats.bySport[pick.sport]) {
          playerStats.bySport[pick.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        playerStats.bySport[pick.sport].total++;

        if (!playerStats.byBetType[pick.betType]) {
          playerStats.byBetType[pick.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        playerStats.byBetType[pick.betType].total++;

        // Track multi-entity props
        const player1PropType = getPlayer1PropType(pick);
        const player2PropType = getPlayer2PropType(pick);
        const player1Name = getPlayer1Name(pick);
        const player2Name = getPlayer2Name(pick);
        const propType = getPropType(pick);

        if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
          playerStats.h2hProps.total++;
          const propCombo = player1PropType === player2PropType
            ? player1PropType
            : `${player1PropType} vs ${player2PropType}`;
          if (!playerStats.byH2HPropType[propCombo]) {
            playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
          }
          playerStats.byH2HPropType[propCombo].total++;
        } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
          playerStats.eitherProps.total++;
          if (!playerStats.byEitherPropType[propType]) {
            playerStats.byEitherPropType[propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byEitherPropType[propType].total++;
        } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
          playerStats.combinedProps.total++;
          if (!playerStats.byCombinedPropType[propType]) {
            playerStats.byCombinedPropType[propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byCombinedPropType[propType].total++;
        }

        if (result === 'win') {
          playerStats.wins++;
          playerStats.bySport[pick.sport].wins++;
          playerStats.byBetType[pick.betType].wins++;

          // Track multi-entity prop wins
          if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
            playerStats.h2hProps.wins++;
            const propCombo = player1PropType === player2PropType
              ? player1PropType
              : `${player1PropType} vs ${player2PropType}`;
            if (!playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            playerStats.byH2HPropType[propCombo].wins++;
          } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
            playerStats.eitherProps.wins++;
            if (!playerStats.byEitherPropType[propType]) {
              playerStats.byEitherPropType[propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byEitherPropType[propType].wins++;
          } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
            playerStats.combinedProps.wins++;
            if (!playerStats.byCombinedPropType[propType]) {
              playerStats.byCombinedPropType[propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byCombinedPropType[propType].wins++;
          }

          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * picks.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[pick.sport].losses++;
          playerStats.byBetType[pick.betType].losses++;

          // Track multi-entity prop losses
          if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
            playerStats.h2hProps.losses++;
            const propCombo = player1PropType === player2PropType
              ? player1PropType
              : `${player1PropType} vs ${player2PropType}`;
            if (!playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            playerStats.byH2HPropType[propCombo].losses++;
          } else if (pick.betType === 'Either Prop' && propType && player1Name && player2Name) {
            playerStats.eitherProps.losses++;
            if (!playerStats.byEitherPropType[propType]) {
              playerStats.byEitherPropType[propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byEitherPropType[propType].losses++;
          } else if (pick.betType === 'Combined Prop' && propType && player1Name && player2Name) {
            playerStats.combinedProps.losses++;
            if (!playerStats.byCombinedPropType[propType]) {
              playerStats.byCombinedPropType[propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byCombinedPropType[propType].losses++;
          }

          const totalAmount = parlay.betAmount * picks.length;
          const birthdayPlayer = parlay.birthdayPlayer;
          const isEvenSplit = parlay.evenSplit;

          if (isEvenSplit) {
            playerStats.moneyLost += totalAmount / picks.length;
          } else if (birthdayPlayer && bigGuy === birthdayPlayer) {
            // Birthday player has no risk
          } else if (birthdayPlayer) {
            const birthdayLost = losers.some(l => getBigGuy(l) === birthdayPlayer);
            const nonBirthdayLosers = losers.filter(l => getBigGuy(l) !== birthdayPlayer);
            const nonBirthdayPicks = picks.filter(p => getBigGuy(p) !== birthdayPlayer);
            const isBirthdayAnd1 = birthdayLost && losers.length === 1;

            if (isBirthdayAnd1) {
              playerStats.moneyLost += totalAmount / nonBirthdayPicks.length;
            } else if (birthdayLost && nonBirthdayLosers.length > 0) {
              playerStats.moneyLost += totalAmount / nonBirthdayLosers.length;
            } else {
              if (and1) {
                playerStats.and1s++;
                const potentialNetProfit = (parlay.totalPayout || 0) - totalAmount;
                playerStats.and1Cost += potentialNetProfit;
                playerStats.moneyLost += totalAmount;
              } else {
                playerStats.moneyLost += totalAmount / losers.length;
              }
            }
          } else if (and1) {
            playerStats.and1s++;
            const potentialNetProfit = (parlay.totalPayout || 0) - totalAmount;
            playerStats.and1Cost += potentialNetProfit;
            playerStats.moneyLost += totalAmount;
          } else {
            playerStats.moneyLost += totalAmount / losers.length;
          }
        } else if (result === 'push') {
          playerStats.pushes++;
          if (playerStats.bySport[pick.sport]) {
            playerStats.bySport[pick.sport].pushes = (playerStats.bySport[pick.sport].pushes || 0) + 1;
          }
          if (playerStats.byBetType[pick.betType]) {
            playerStats.byBetType[pick.betType].pushes = (playerStats.byBetType[pick.betType].pushes || 0) + 1;
          }

          // Track multi-entity prop pushes
          if (pick.betType === 'H2H Prop' && player1PropType && player2PropType) {
            playerStats.h2hProps.pushes++;
            const propCombo = player1PropType === player2PropType
              ? player1PropType
              : `${player1PropType} vs ${player2PropType}`;
            if (!playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            playerStats.byH2HPropType[propCombo].pushes++;
          }
        }
      });
    });

    return playerStats;
  };

  return {
    stats: calculateStats,
    calculateStatsForPlayer
  };
};
