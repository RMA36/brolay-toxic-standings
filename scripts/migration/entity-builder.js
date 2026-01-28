/**
 * Entity Builder - Builds the entities array for transformed picks
 *
 * The entities array is the core of the new unified structure.
 * It contains all teams and players involved in a pick.
 *
 * Entity structure:
 * {
 *   entityType: "team" | "player",
 *   name: string,
 *   team?: string,       // For players: their team
 *   position?: string,   // For players: their position
 *   role: "primary" | "secondary" | "opponent" | "home" | "away"
 * }
 */

/**
 * Build entities array based on bet category
 *
 * @param {Object} oldPick - The old pick data
 * @param {string} betCategory - The category of bet (standard, playerProp, h2hProp, etc.)
 * @returns {Array} Array of entity objects
 */
function buildEntities(oldPick, betCategory) {
  switch (betCategory) {
    case 'standard':
      return buildStandardEntities(oldPick);
    case 'playerProp':
      return buildPlayerPropEntities(oldPick);
    case 'h2hProp':
      return buildH2HEntities(oldPick);
    case 'combinedProp':
      return buildCombinedPropEntities(oldPick);
    case 'eitherProp':
      return buildEitherPropEntities(oldPick);
    case 'teamTotal':
    case 'firstHalfTeamTotal':
    case 'quarterTeamTotal':
      return buildTeamTotalEntities(oldPick);
    case 'firstHalf':
    case 'quarter':
      return buildPeriodEntities(oldPick);
    case 'firstInningRuns':
      return buildFirstInningEntities(oldPick);
    case 'teamProp':
    case 'gameProp':
      return buildTeamPropEntities(oldPick);
    default:
      // Fallback: try to extract whatever we can
      return buildFallbackEntities(oldPick);
  }
}

/**
 * Build entities for standard bets (Spread, Moneyline, Total)
 */
function buildStandardEntities(oldPick) {
  const entities = [];
  const betType = oldPick.betType;

  // For Total bets, we need both teams
  if (betType === 'Total') {
    // Try to get teams from homeTeam/awayTeam fields
    if (oldPick.homeTeam) {
      entities.push({
        entityType: 'team',
        name: oldPick.homeTeam,
        role: 'home'
      });
    }
    if (oldPick.awayTeam) {
      entities.push({
        entityType: 'team',
        name: oldPick.awayTeam,
        role: 'away'
      });
    }

    // If no home/away, try to extract from actualStats
    if (entities.length === 0 && oldPick.actualStats) {
      const teams = extractTeamsFromStats(oldPick.actualStats);
      teams.forEach((team, idx) => {
        entities.push({
          entityType: 'team',
          name: team,
          role: idx === 0 ? 'away' : 'home'
        });
      });
    }

    // Still nothing? Use the team field as primary
    if (entities.length === 0 && oldPick.team) {
      entities.push({
        entityType: 'team',
        name: oldPick.team,
        role: 'primary'
      });
    }
  }
  // For Spread and Moneyline, we just need the picked team
  else {
    if (oldPick.team) {
      entities.push({
        entityType: 'team',
        name: oldPick.team,
        role: 'primary'
      });
    }
    // Fallback: if team is empty but homeTeam/awayTeam exist, try to determine from favorite
    else if (oldPick.homeTeam || oldPick.awayTeam) {
      // For moneylines/spreads without team field, use homeTeam if favorite, awayTeam if dog
      // This is a best guess based on how the data was likely entered
      const isFavorite = oldPick.favorite === 'Favorite';
      const pickedTeam = isFavorite ? (oldPick.homeTeam || oldPick.awayTeam) : (oldPick.awayTeam || oldPick.homeTeam);
      if (pickedTeam) {
        entities.push({
          entityType: 'team',
          name: pickedTeam,
          role: 'primary'
        });
      }
      // Also add the opponent if we have both teams
      if (oldPick.homeTeam && oldPick.awayTeam) {
        const opponentTeam = isFavorite ? oldPick.awayTeam : oldPick.homeTeam;
        entities.push({
          entityType: 'team',
          name: opponentTeam,
          role: 'opponent'
        });
      }
    }
    // Last resort: try to extract from actualStats
    else if (oldPick.actualStats) {
      const teams = extractTeamsFromStats(oldPick.actualStats);
      if (teams.length > 0) {
        entities.push({
          entityType: 'team',
          name: teams[0],
          role: 'primary'
        });
      }
    }
  }

  return entities;
}

/**
 * Build entities for player prop bets
 * In old structure, confusingly:
 *   - `team` field contains the PLAYER name
 *   - `playerTeam` contains the actual team
 */
function buildPlayerPropEntities(oldPick) {
  const entities = [];

  // The "team" field actually contains the player name for props
  const playerName = oldPick.team || oldPick.player1 || oldPick.selectedPlayer;

  if (playerName) {
    entities.push({
      entityType: 'player',
      name: playerName,
      team: oldPick.playerTeam || oldPick.player1Team || null,
      position: oldPick.playerPosition || oldPick.player1Position || null,
      role: 'primary'
    });
  }

  return entities;
}

/**
 * Build entities for H2H (head-to-head) prop bets
 * These compare two players
 */
function buildH2HEntities(oldPick) {
  const entities = [];

  // Player 1 (the selected/picked player)
  const player1Name = oldPick.player1 || oldPick.selectedPlayer || oldPick.team;
  if (player1Name) {
    entities.push({
      entityType: 'player',
      name: player1Name,
      team: oldPick.player1Team || null,
      position: oldPick.player1Position || null,
      role: 'primary',
      statType: oldPick.player1PropType || oldPick.propType || null
    });
  }

  // Player 2 (the opponent)
  if (oldPick.player2) {
    entities.push({
      entityType: 'player',
      name: oldPick.player2,
      team: oldPick.player2Team || null,
      position: oldPick.player2Position || null,
      role: 'opponent',
      statType: oldPick.player2PropType || oldPick.propType || null
    });
  }

  return entities;
}

/**
 * Build entities for combined prop bets
 * These combine stats from two players
 */
function buildCombinedPropEntities(oldPick) {
  const entities = [];

  // Player 1
  const player1Name = oldPick.player1 || oldPick.team;
  if (player1Name) {
    entities.push({
      entityType: 'player',
      name: player1Name,
      team: oldPick.player1Team || null,
      position: oldPick.player1Position || null,
      role: 'primary',
      statType: oldPick.player1PropType || oldPick.propType || null
    });
  }

  // Player 2
  if (oldPick.player2) {
    entities.push({
      entityType: 'player',
      name: oldPick.player2,
      team: oldPick.player2Team || null,
      position: oldPick.player2Position || null,
      role: 'secondary',
      statType: oldPick.player2PropType || oldPick.propType || null
    });
  }

  return entities;
}

/**
 * Build entities for either prop bets
 * Betting that either of two players will hit a stat
 */
function buildEitherPropEntities(oldPick) {
  // Same structure as combined props
  return buildCombinedPropEntities(oldPick);
}

/**
 * Build entities for team total bets
 */
function buildTeamTotalEntities(oldPick) {
  const entities = [];

  if (oldPick.team) {
    entities.push({
      entityType: 'team',
      name: oldPick.team,
      role: 'primary'
    });
  }

  return entities;
}

/**
 * Build entities for period-specific bets (first half, quarter)
 */
function buildPeriodEntities(oldPick) {
  // Same as standard bets
  return buildStandardEntities(oldPick);
}

/**
 * Build entities for first inning runs (MLB specific)
 */
function buildFirstInningEntities(oldPick) {
  const entities = [];

  // Try to get both teams
  if (oldPick.homeTeam) {
    entities.push({
      entityType: 'team',
      name: oldPick.homeTeam,
      role: 'home'
    });
  }
  if (oldPick.awayTeam) {
    entities.push({
      entityType: 'team',
      name: oldPick.awayTeam,
      role: 'away'
    });
  }

  // Fallback to team field
  if (entities.length === 0 && oldPick.team) {
    entities.push({
      entityType: 'team',
      name: oldPick.team,
      role: 'primary'
    });
  }

  return entities;
}

/**
 * Build entities for team props and game props
 */
function buildTeamPropEntities(oldPick) {
  const entities = [];

  if (oldPick.team) {
    entities.push({
      entityType: 'team',
      name: oldPick.team,
      role: 'primary'
    });
  }

  return entities;
}

/**
 * Fallback entity builder for unknown bet types
 */
function buildFallbackEntities(oldPick) {
  const entities = [];

  // Try team first
  if (oldPick.team) {
    // Check if this looks like a player name (has no typical team indicators)
    const looksLikePlayer = !oldPick.team.includes(' ') ||
      oldPick.playerTeam ||
      oldPick.playerPosition ||
      oldPick.propType;

    if (looksLikePlayer && (oldPick.playerTeam || oldPick.playerPosition || oldPick.propType)) {
      entities.push({
        entityType: 'player',
        name: oldPick.team,
        team: oldPick.playerTeam || null,
        position: oldPick.playerPosition || null,
        role: 'primary'
      });
    } else {
      entities.push({
        entityType: 'team',
        name: oldPick.team,
        role: 'primary'
      });
    }
  }

  // Add player1 if present and different from team
  if (oldPick.player1 && oldPick.player1 !== oldPick.team) {
    entities.push({
      entityType: 'player',
      name: oldPick.player1,
      team: oldPick.player1Team || null,
      position: oldPick.player1Position || null,
      role: entities.length === 0 ? 'primary' : 'secondary'
    });
  }

  // Add player2 if present
  if (oldPick.player2) {
    entities.push({
      entityType: 'player',
      name: oldPick.player2,
      team: oldPick.player2Team || null,
      position: oldPick.player2Position || null,
      role: 'opponent'
    });
  }

  return entities;
}

/**
 * Extract team names from actualStats string
 * Handles formats like "Team1 Score @ Team2 Score"
 */
function extractTeamsFromStats(actualStats) {
  if (!actualStats) return [];

  // Match pattern: "Team Name Score @ Other Team Score"
  const match = actualStats.match(/^(.+?)\s+\d+\s*[@vs.]+\s*(.+?)\s+\d+/i);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }

  return [];
}

/**
 * Clean entity object - remove null/undefined values
 */
function cleanEntity(entity) {
  const cleaned = {};
  Object.entries(entity).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

/**
 * Build and clean entities
 */
function buildAndCleanEntities(oldPick, betCategory) {
  const entities = buildEntities(oldPick, betCategory);
  return entities.map(cleanEntity);
}

module.exports = {
  buildEntities: buildAndCleanEntities,
  buildStandardEntities,
  buildPlayerPropEntities,
  buildH2HEntities,
  buildCombinedPropEntities,
  buildEitherPropEntities,
  buildTeamTotalEntities,
  buildPeriodEntities,
  buildFirstInningEntities,
  buildTeamPropEntities,
  buildFallbackEntities,
  extractTeamsFromStats,
  cleanEntity
};
