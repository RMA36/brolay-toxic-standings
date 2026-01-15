import { useMemo } from 'react';

/**
 * Custom hook for calculating statistics from brolay (parlay) data
 *
 * @param {Array} parlays - Array of parlay objects from Firebase
 * @param {Array} players - Array of player names
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
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const parlayWon = losers.length === 0 && winners.length > 0;
      const and1 = losers.length === 1 && winners.length === participants.length - 1;

      participants.forEach(participant => {
        if (!participant.player || participant.player === '' || !participant.sport || !participant.betType) return;

        const playerStats = stats[participant.player];
        playerStats.totalPicks++;

        if (!playerStats.bySport[participant.sport]) {
        playerStats.bySport[participant.sport] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.bySport[participant.sport].total++;

        if (!playerStats.byBetType[participant.betType]) {
          playerStats.byBetType[participant.betType] = { wins: 0, losses: 0, total: 0 };
        }
        playerStats.byBetType[participant.betType].total++;

        // Track multi-entity props
        if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
          playerStats.h2hProps.total++;

          // Track by prop type combination
          const propCombo = participant.player1PropType === participant.player2PropType
            ? participant.player1PropType
            : `${participant.player1PropType} vs ${participant.player2PropType}`;

          if (!playerStats.byH2HPropType[propCombo]) {
            playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
          }
          playerStats.byH2HPropType[propCombo].total++;
        } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.eitherProps.total++;

          if (!playerStats.byEitherPropType[participant.propType]) {
            playerStats.byEitherPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byEitherPropType[participant.propType].total++;
        } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.combinedProps.total++;

          if (!playerStats.byCombinedPropType[participant.propType]) {
            playerStats.byCombinedPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byCombinedPropType[participant.propType].total++;
        }

        if (participant.result === 'win') {
          playerStats.wins++;
          playerStats.bySport[participant.sport].wins++;
          playerStats.byBetType[participant.betType].wins++;

        // Track multi-entity prop wins
        if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
          playerStats.h2hProps.wins++;
          const propCombo = participant.player1PropType === participant.player2PropType
            ? participant.player1PropType
            : `${participant.player1PropType} vs ${participant.player2PropType}`;
          if (playerStats.byH2HPropType[propCombo]) {
            playerStats.byH2HPropType[propCombo].wins++;
          }
        } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.eitherProps.wins++;
          if (playerStats.byEitherPropType[participant.propType]) {
            playerStats.byEitherPropType[participant.propType].wins++;
          }
        } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.combinedProps.wins++;
          if (playerStats.byCombinedPropType[participant.propType]) {
            playerStats.byCombinedPropType[participant.propType].wins++;
          }
        }

          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (participant.result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[participant.sport].losses++;
          playerStats.byBetType[participant.betType].losses++;

          // Track multi-entity prop losses
          if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
            playerStats.h2hProps.losses++;
            const propCombo = participant.player1PropType === participant.player2PropType
              ? participant.player1PropType
              : `${participant.player1PropType} vs ${participant.player2PropType}`;
            if (playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo].losses++;
            }
          } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.eitherProps.losses++;
            if (playerStats.byEitherPropType[participant.propType]) {
              playerStats.byEitherPropType[participant.propType].losses++;
            }
          } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.combinedProps.losses++;
            if (playerStats.byCombinedPropType[participant.propType]) {
              playerStats.byCombinedPropType[participant.propType].losses++;
            }
          }

          if (and1) {
            playerStats.and1s++;
            // For And-1s, the cost is the potential net profit we would have won
            const potentialNetProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.and1Cost += potentialNetProfit;
            playerStats.moneyLost += parlay.betAmount * participants.length;
          } else {
            playerStats.moneyLost += (parlay.betAmount * participants.length) / losers.length;
          }
        }
      });
    });

    return stats;
  }, [parlays, players, editingParlay]);

  /**
   * Calculate detailed statistics for a specific player
   *
   * @param {string} player - Player name
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
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const parlayWon = losers.length === 0 && winners.length > 0;
      const and1 = losers.length === 1 && winners.length === participants.length - 1;

      participants.forEach(participant => {
        if (participant.player !== player || !participant.sport || !participant.betType) return;

        playerStats.totalPicks++;
        if (!playerStats.bySport[participant.sport]) {
          playerStats.bySport[participant.sport] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        playerStats.bySport[participant.sport].total++;

        if (!playerStats.byBetType[participant.betType]) {
          playerStats.byBetType[participant.betType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        playerStats.byBetType[participant.betType].total++;

        // Track multi-entity props
        if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
          playerStats.h2hProps.total++;
          const propCombo = participant.player1PropType === participant.player2PropType
            ? participant.player1PropType
            : `${participant.player1PropType} vs ${participant.player2PropType}`;
          if (!playerStats.byH2HPropType[propCombo]) {
            playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
          }
          playerStats.byH2HPropType[propCombo].total++;
        } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.eitherProps.total++;
          if (!playerStats.byEitherPropType[participant.propType]) {
            playerStats.byEitherPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byEitherPropType[participant.propType].total++;
        } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
          playerStats.combinedProps.total++;
          if (!playerStats.byCombinedPropType[participant.propType]) {
            playerStats.byCombinedPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
          }
          playerStats.byCombinedPropType[participant.propType].total++;
        }

        if (participant.result === 'win') {
          playerStats.wins++;
          playerStats.bySport[participant.sport].wins++;
          playerStats.byBetType[participant.betType].wins++;

          // Track multi-entity prop wins
          if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
            playerStats.h2hProps.wins++;
            const propCombo = participant.player1PropType === participant.player2PropType
              ? participant.player1PropType
              : `${participant.player1PropType} vs ${participant.player2PropType}`;
            if (!playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            playerStats.byH2HPropType[propCombo].wins++;
          } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.eitherProps.wins++;
            if (!playerStats.byEitherPropType[participant.propType]) {
              playerStats.byEitherPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byEitherPropType[participant.propType].wins++;
          } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.combinedProps.wins++;
            if (!playerStats.byCombinedPropType[participant.propType]) {
              playerStats.byCombinedPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byCombinedPropType[participant.propType].wins++;
          }

          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (participant.result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[participant.sport].losses++;
          playerStats.byBetType[participant.betType].losses++;

          // Track multi-entity prop losses
          if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
            playerStats.h2hProps.losses++;
            const propCombo = participant.player1PropType === participant.player2PropType
              ? participant.player1PropType
              : `${participant.player1PropType} vs ${participant.player2PropType}`;
            if (!playerStats.byH2HPropType[propCombo]) {
              playerStats.byH2HPropType[propCombo] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            playerStats.byH2HPropType[propCombo].losses++;
          } else if (participant.betType === 'Either Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.eitherProps.losses++;
            if (!playerStats.byEitherPropType[participant.propType]) {
              playerStats.byEitherPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byEitherPropType[participant.propType].losses++;
          } else if (participant.betType === 'Combined Prop' && participant.propType && participant.player1 && participant.player2) {
            playerStats.combinedProps.losses++;
            if (!playerStats.byCombinedPropType[participant.propType]) {
              playerStats.byCombinedPropType[participant.propType] = { wins: 0, losses: 0, total: 0 };
            }
            playerStats.byCombinedPropType[participant.propType].losses++;
          }

          if (and1) {
            playerStats.and1s++;
            const potentialNetProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.and1Cost += potentialNetProfit;
            playerStats.moneyLost += parlay.betAmount * participants.length;
          } else {
            playerStats.moneyLost += (parlay.betAmount * participants.length) / losers.length;
          }
        } else if (participant.result === 'push') {
          playerStats.pushes++;
          if (playerStats.bySport[participant.sport]) {
            playerStats.bySport[participant.sport].pushes = (playerStats.bySport[participant.sport].pushes || 0) + 1;
          }
          if (playerStats.byBetType[participant.betType]) {
            playerStats.byBetType[participant.betType].pushes = (playerStats.byBetType[participant.betType].pushes || 0) + 1;
          }

          // Track multi-entity prop pushes
          if (participant.betType === 'H2H Prop' && participant.player1PropType && participant.player2PropType) {
            playerStats.h2hProps.pushes++;
            const propCombo = participant.player1PropType === participant.player2PropType
              ? participant.player1PropType
              : `${participant.player1PropType} vs ${participant.player2PropType}`;
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
