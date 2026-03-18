import { useMemo } from 'react';

/**
 * Helper to get picks from a parlay (new schema: parlay.picks)
 */
const getPicksArray = (parlay) => {
  if (!parlay.picks) return [];
  return Object.values(parlay.picks);
};

const getBigGuy = (pick) => pick.bigGuy || '';
const getResult = (pick) => pick.outcome?.status || '';

/**
 * Get the day of week name from a date string
 */
const getDayOfWeek = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr + 'T00:00:00').getDay()];
};

/**
 * Minimum sample size required to consider a pattern statistically relevant
 */
const MIN_SAMPLE_SIZE = 5;

/**
 * Build a comprehensive profile of a Big Guy's betting tendencies.
 *
 * The profile captures both win rates AND pick volume (preference share).
 * Volume matters because if a Big Guy makes 80% of their picks on spreads,
 * the engine should lean toward spreads for them — not toward a bet type
 * they've only tried a handful of times even if the win rate was higher.
 */
const buildBigGuyProfile = (bigGuy, parlays) => {
  const profile = {
    bigGuy,
    totalPicks: 0,
    totalWins: 0,
    totalLosses: 0,
    bySport: {},
    byBetType: {},
    byDayOfWeek: {},
    bySportBetType: {},
    bySportDay: {},
    byDirection: {},
    recentPicks: [],
    currentStreak: { type: null, count: 0 }
  };

  const allPicks = [];

  parlays.forEach(parlay => {
    const picks = getPicksArray(parlay);
    picks.forEach(pick => {
      if (getBigGuy(pick) !== bigGuy) return;
      const result = getResult(pick);
      if (!result || result === 'pending') return;
      if (!pick.sport || !pick.betType) return;

      allPicks.push({
        ...pick,
        parlayDate: parlay.date,
        dayOfWeek: getDayOfWeek(parlay.date),
        result
      });
    });
  });

  allPicks.sort((a, b) => (a.parlayDate || '').localeCompare(b.parlayDate || ''));

  allPicks.forEach(pick => {
    const { sport, betType, dayOfWeek, result } = pick;
    const isWin = result === 'win';
    const isLoss = result === 'loss';

    if (!isWin && !isLoss) return;

    profile.totalPicks++;
    if (isWin) profile.totalWins++;
    if (isLoss) profile.totalLosses++;

    // By Sport
    if (!profile.bySport[sport]) profile.bySport[sport] = { wins: 0, losses: 0, total: 0 };
    profile.bySport[sport].total++;
    if (isWin) profile.bySport[sport].wins++;
    if (isLoss) profile.bySport[sport].losses++;

    // By Bet Type
    if (!profile.byBetType[betType]) profile.byBetType[betType] = { wins: 0, losses: 0, total: 0 };
    profile.byBetType[betType].total++;
    if (isWin) profile.byBetType[betType].wins++;
    if (isLoss) profile.byBetType[betType].losses++;

    // By Day of Week
    if (!profile.byDayOfWeek[dayOfWeek]) profile.byDayOfWeek[dayOfWeek] = { wins: 0, losses: 0, total: 0 };
    profile.byDayOfWeek[dayOfWeek].total++;
    if (isWin) profile.byDayOfWeek[dayOfWeek].wins++;
    if (isLoss) profile.byDayOfWeek[dayOfWeek].losses++;

    // By Sport + Bet Type combo
    const sportBetKey = `${sport}|${betType}`;
    if (!profile.bySportBetType[sportBetKey]) profile.bySportBetType[sportBetKey] = { wins: 0, losses: 0, total: 0, sport, betType };
    profile.bySportBetType[sportBetKey].total++;
    if (isWin) profile.bySportBetType[sportBetKey].wins++;
    if (isLoss) profile.bySportBetType[sportBetKey].losses++;

    // By Sport + Day combo
    const sportDayKey = `${sport}|${dayOfWeek}`;
    if (!profile.bySportDay[sportDayKey]) profile.bySportDay[sportDayKey] = { wins: 0, losses: 0, total: 0, sport, dayOfWeek };
    profile.bySportDay[sportDayKey].total++;
    if (isWin) profile.bySportDay[sportDayKey].wins++;
    if (isLoss) profile.bySportDay[sportDayKey].losses++;

    // By direction (over/under/favorite/underdog)
    const direction = pick.line?.direction;
    if (direction) {
      if (!profile.byDirection[direction]) profile.byDirection[direction] = { wins: 0, losses: 0, total: 0 };
      profile.byDirection[direction].total++;
      if (isWin) profile.byDirection[direction].wins++;
      if (isLoss) profile.byDirection[direction].losses++;
    }

    // Streak tracking
    if (isWin) {
      profile.currentStreak = profile.currentStreak.type === 'win'
        ? { type: 'win', count: profile.currentStreak.count + 1 }
        : { type: 'win', count: 1 };
    } else if (isLoss) {
      profile.currentStreak = profile.currentStreak.type === 'loss'
        ? { type: 'loss', count: profile.currentStreak.count + 1 }
        : { type: 'loss', count: 1 };
    }
  });

  // Recent form: last 20 settled picks
  profile.recentPicks = allPicks.slice(-20);
  const recentWins = profile.recentPicks.filter(p => p.result === 'win').length;
  const recentTotal = profile.recentPicks.filter(p => p.result === 'win' || p.result === 'loss').length;
  profile.recentWinRate = recentTotal > 0 ? (recentWins / recentTotal) * 100 : 0;

  return profile;
};

/**
 * Get win rate from a bucket, null if below minimum sample
 */
const getWinRate = (bucket) => {
  if (!bucket || bucket.total < MIN_SAMPLE_SIZE) return null;
  return (bucket.wins / bucket.total) * 100;
};

/**
 * Get the preference share — what fraction of a Big Guy's total picks
 * fall into this bucket. Returns 0-1.
 */
const getPreferenceShare = (bucket, totalPicks) => {
  if (!bucket || totalPicks === 0) return 0;
  return bucket.total / totalPicks;
};

/**
 * Score a pick for a Big Guy, blending win rate with pick preference.
 *
 * The old engine only looked at win rates, which caused it to favor
 * bet types the Big Guy rarely uses (e.g., 3 underdog picks with 67% win rate
 * beat 50 favorite picks at 56%). The fix: multiply win rate by a preference
 * boost so picks that align with what the Big Guy actually does get ranked higher.
 *
 * Preference boost formula: 1 + (preferenceShare * boostFactor)
 * If a Big Guy makes 60% of picks as Spreads, the spread score gets
 * multiplied by 1 + (0.6 * 0.5) = 1.30 — a meaningful but not overwhelming boost.
 */
const scorePick = (pick, profile, today) => {
  let totalScore = 0;
  let totalWeight = 0;
  const reasons = [];

  const PREFERENCE_BOOST = 0.5; // How much pick volume influences score

  // 1. Sport (weight: 3)
  const sportBucket = profile.bySport[pick.sport];
  const sportRate = getWinRate(sportBucket);
  if (sportRate !== null) {
    const prefBoost = 1 + getPreferenceShare(sportBucket, profile.totalPicks) * PREFERENCE_BOOST;
    totalScore += (sportRate * prefBoost) * 3;
    totalWeight += 3;
    if (sportRate >= 52) {
      reasons.push(`${sportRate.toFixed(0)}% in ${pick.sport} (${sportBucket.wins}-${sportBucket.losses})`);
    }
  }

  // 2. Bet type (weight: 3)
  const betBucket = profile.byBetType[pick.betType];
  const betTypeRate = getWinRate(betBucket);
  if (betTypeRate !== null) {
    const prefBoost = 1 + getPreferenceShare(betBucket, profile.totalPicks) * PREFERENCE_BOOST;
    totalScore += (betTypeRate * prefBoost) * 3;
    totalWeight += 3;
    if (betTypeRate >= 52) {
      reasons.push(`${betTypeRate.toFixed(0)}% on ${pick.betType}s (${betBucket.wins}-${betBucket.losses})`);
    }
  }

  // 3. Sport + Bet type combo (weight: 4 — most predictive)
  const comboKey = `${pick.sport}|${pick.betType}`;
  const comboBucket = profile.bySportBetType[comboKey];
  const comboRate = getWinRate(comboBucket);
  if (comboRate !== null) {
    const prefBoost = 1 + getPreferenceShare(comboBucket, profile.totalPicks) * PREFERENCE_BOOST;
    totalScore += (comboRate * prefBoost) * 4;
    totalWeight += 4;
    if (comboRate >= 52) {
      reasons.push(`${comboRate.toFixed(0)}% on ${pick.sport} ${pick.betType}s (${comboBucket.wins}-${comboBucket.losses})`);
    }
  }

  // 4. Sport + Day of week (weight: 2)
  const sportDayKey = `${pick.sport}|${today}`;
  const sportDayBucket = profile.bySportDay[sportDayKey];
  const sportDayRate = getWinRate(sportDayBucket);
  if (sportDayRate !== null) {
    totalScore += sportDayRate * 2;
    totalWeight += 2;
    if (sportDayRate >= 55) {
      reasons.push(`${sportDayRate.toFixed(0)}% on ${pick.sport} ${today}s`);
    }
  }

  // 5. Direction — boost picks matching what they actually bet (weight: 2)
  const dirBucket = profile.byDirection[pick.direction];
  const dirRate = getWinRate(dirBucket);
  if (dirRate !== null) {
    // Strong preference boost for direction — this is the key fix for the
    // "only showing dogs and unders" problem. If a Big Guy bets favorites
    // 80% of the time, favorites get a big boost even if underdog win rate
    // is slightly higher on a small sample.
    const prefBoost = 1 + getPreferenceShare(dirBucket, profile.totalPicks) * PREFERENCE_BOOST * 2;
    totalScore += (dirRate * prefBoost) * 2;
    totalWeight += 2;
  }

  // 6. Recent form (weight: 1)
  if (profile.recentPicks.length >= 10) {
    totalScore += profile.recentWinRate * 1;
    totalWeight += 1;
  }

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  return {
    ...pick,
    score: Math.round(finalScore * 10) / 10,
    reasons: reasons.length > 0 ? reasons : ['Aligns with overall betting profile']
  };
};

/**
 * Create a game-level key for deduplication.
 * Once any pick from a game is assigned to a Big Guy, the entire game
 * is off-limits for all other Big Guys. This prevents conflicting bets
 * like one person getting the over and another getting the under, or
 * one person on the spread and another on the moneyline of the same game.
 */
const getGameKey = (pick) => {
  return `${pick.sport}|${pick.homeTeam}|${pick.awayTeam}`;
};

/**
 * Custom hook for generating one pick recommendation per Big Guy.
 *
 * The engine:
 *   1. Builds a profile for each Big Guy from their settled pick history
 *   2. Scores every available pick, blending win rate with pick preferences
 *   3. Assigns the best pick to each Big Guy with deduplication — if two
 *      Big Guys want the same pick, the one with the higher score gets it
 *      and the other falls to their next best
 */
export const useRecommendations = (parlays, players, availablePicks) => {

  const profiles = useMemo(() => {
    const result = {};
    players.forEach(player => {
      result[player] = buildBigGuyProfile(player, parlays);
    });
    return result;
  }, [parlays, players]);

  const recommendations = useMemo(() => {
    if (!availablePicks || availablePicks.length === 0) {
      return {};
    }

    const today = getDayOfWeek(new Date().toISOString().split('T')[0]);

    // Score all picks for all players
    const playerScored = {};
    players.forEach(player => {
      const profile = profiles[player];
      if (!profile || profile.totalPicks === 0) {
        playerScored[player] = [];
        return;
      }
      const scored = availablePicks
        .map(pick => scorePick(pick, profile, today))
        .sort((a, b) => b.score - a.score);
      playerScored[player] = scored;
    });

    // Deduplicate at the GAME level: once a game is claimed by one Big Guy,
    // no other Big Guy can get any pick from that game. This prevents
    // conflicting bets (e.g., one person on the over and another on the under).
    const usedGameKeys = new Set();
    const result = {};

    // Determine assignment order: Big Guy with highest top-pick score goes first
    const assignOrder = [...players]
      .filter(p => playerScored[p].length > 0)
      .sort((a, b) => {
        const aTop = playerScored[a][0]?.score || 0;
        const bTop = playerScored[b][0]?.score || 0;
        return bTop - aTop;
      });

    // Assign one pick per Big Guy, skipping games already claimed
    assignOrder.forEach(player => {
      const profile = profiles[player];
      const picks = playerScored[player];

      let assigned = null;
      for (const pick of picks) {
        const gameKey = getGameKey(pick);
        if (!usedGameKeys.has(gameKey)) {
          usedGameKeys.add(gameKey);
          assigned = pick;
          break;
        }
      }

      result[player] = {
        pick: assigned,
        profile,
        overallWinRate: profile.totalPicks > 0
          ? ((profile.totalWins / profile.totalPicks) * 100).toFixed(1)
          : '0.0'
      };
    });

    // Handle players with no data
    players.forEach(player => {
      if (!result[player]) {
        result[player] = {
          pick: null,
          profile: profiles[player],
          overallWinRate: '0.0',
          message: 'No historical data to analyze'
        };
      }
    });

    return result;
  }, [availablePicks, players, profiles]);

  return {
    recommendations,
    profiles
  };
};
