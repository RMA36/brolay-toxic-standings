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
 * Categorize odds into buckets for pattern analysis
 * Returns a label like "heavy-favorite", "slight-favorite", "even", "slight-underdog", "heavy-underdog"
 */
const categorizeOdds = (odds) => {
  if (odds === undefined || odds === null) return 'unknown';
  if (odds <= -200) return 'heavy-favorite';
  if (odds <= -120) return 'moderate-favorite';
  if (odds < -100) return 'slight-favorite';
  if (odds >= -100 && odds <= 100) return 'even';
  if (odds <= 120) return 'slight-underdog';
  if (odds <= 200) return 'moderate-underdog';
  return 'heavy-underdog';
};

/**
 * Minimum sample size required to consider a pattern statistically relevant
 */
const MIN_SAMPLE_SIZE = 5;

/**
 * Build a comprehensive profile of a Big Guy's betting tendencies
 * Analyzes all settled picks to find patterns in:
 *   - Sport preferences and win rates
 *   - Bet type preferences and win rates
 *   - Day of week patterns
 *   - Odds range performance
 *   - Favorite vs underdog tendencies
 *   - Recent form (last 20 picks)
 *
 * @param {string} bigGuy - Player name
 * @param {Array} parlays - All parlays from Firestore
 * @returns {Object} Big Guy profile with pattern data
 */
const buildBigGuyProfile = (bigGuy, parlays) => {
  const profile = {
    bigGuy,
    totalPicks: 0,
    totalWins: 0,
    totalLosses: 0,

    // Win rates by sport
    bySport: {},

    // Win rates by bet type
    byBetType: {},

    // Win rates by day of week
    byDayOfWeek: {},

    // Win rates by sport + bet type combo
    bySportBetType: {},

    // Win rates by sport + day of week combo
    bySportDay: {},

    // Win rates by odds category (favorite vs underdog)
    byOddsCategory: {},

    // Win rates by direction (over/under/favorite/underdog)
    byDirection: {},

    // Recent form — last 20 settled picks
    recentPicks: [],

    // Streak tracking
    currentStreak: { type: null, count: 0 }
  };

  // Collect all settled picks for this Big Guy, sorted by date
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

  // Sort by date (oldest first for streak calculation)
  allPicks.sort((a, b) => (a.parlayDate || '').localeCompare(b.parlayDate || ''));

  allPicks.forEach(pick => {
    const { sport, betType, dayOfWeek, result } = pick;
    const isWin = result === 'win';
    const isLoss = result === 'loss';

    if (!isWin && !isLoss) return; // Skip pushes for win rate calculations

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

    // By odds category (if odds data available)
    const odds = pick.line?.odds ? parseInt(pick.line.odds) : null;
    if (odds !== null && !isNaN(odds)) {
      const cat = categorizeOdds(odds);
      if (!profile.byOddsCategory[cat]) profile.byOddsCategory[cat] = { wins: 0, losses: 0, total: 0 };
      profile.byOddsCategory[cat].total++;
      if (isWin) profile.byOddsCategory[cat].wins++;
      if (isLoss) profile.byOddsCategory[cat].losses++;
    }

    // By direction (favorite/underdog/over/under)
    const direction = pick.line?.direction;
    if (direction) {
      if (!profile.byDirection[direction]) profile.byDirection[direction] = { wins: 0, losses: 0, total: 0 };
      profile.byDirection[direction].total++;
      if (isWin) profile.byDirection[direction].wins++;
      if (isLoss) profile.byDirection[direction].losses++;
    }

    // Track streak (processing oldest to newest, so final state = current streak)
    if (isWin) {
      if (profile.currentStreak.type === 'win') {
        profile.currentStreak.count++;
      } else {
        profile.currentStreak = { type: 'win', count: 1 };
      }
    } else if (isLoss) {
      if (profile.currentStreak.type === 'loss') {
        profile.currentStreak.count++;
      } else {
        profile.currentStreak = { type: 'loss', count: 1 };
      }
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
 * Calculate win rate from a stats bucket, returning null if below minimum sample
 */
const getWinRate = (bucket) => {
  if (!bucket || bucket.total < MIN_SAMPLE_SIZE) return null;
  return (bucket.wins / bucket.total) * 100;
};

/**
 * Score a pick candidate for a specific Big Guy based on their profile
 *
 * Scoring factors (weighted):
 *   - Sport win rate (weight: 3) — how well they do in this sport
 *   - Bet type win rate (weight: 3) — how well they do with this bet type
 *   - Sport + Bet type combo (weight: 4) — the intersection is most predictive
 *   - Day of week for this sport (weight: 2) — day-specific patterns
 *   - Direction tendency (weight: 1) — favorite/underdog/over/under patterns
 *   - Recent form bonus/penalty (weight: 1) — hot/cold adjustment
 *
 * @param {Object} pick - A pick candidate from getFilteredPicks()
 * @param {Object} profile - Big Guy's profile from buildBigGuyProfile()
 * @param {string} today - Today's day of week name
 * @returns {Object} Scored pick with score, confidence, and reasoning
 */
const scorePick = (pick, profile, today) => {
  let totalScore = 0;
  let totalWeight = 0;
  const reasons = [];
  let dataPoints = 0; // How many patterns we have data for

  // 1. Sport win rate (weight: 3)
  const sportRate = getWinRate(profile.bySport[pick.sport]);
  if (sportRate !== null) {
    totalScore += sportRate * 3;
    totalWeight += 3;
    dataPoints++;
    const sportStats = profile.bySport[pick.sport];
    if (sportRate >= 55) {
      reasons.push(`${sportRate.toFixed(0)}% win rate in ${pick.sport} (${sportStats.wins}-${sportStats.losses})`);
    } else if (sportRate < 45) {
      reasons.push(`Only ${sportRate.toFixed(0)}% in ${pick.sport} — not a strength`);
    }
  }

  // 2. Bet type win rate (weight: 3)
  const betTypeRate = getWinRate(profile.byBetType[pick.betType]);
  if (betTypeRate !== null) {
    totalScore += betTypeRate * 3;
    totalWeight += 3;
    dataPoints++;
    const btStats = profile.byBetType[pick.betType];
    if (betTypeRate >= 55) {
      reasons.push(`${betTypeRate.toFixed(0)}% on ${pick.betType}s (${btStats.wins}-${btStats.losses})`);
    }
  }

  // 3. Sport + Bet type combo (weight: 4) — most predictive
  const comboKey = `${pick.sport}|${pick.betType}`;
  const comboRate = getWinRate(profile.bySportBetType[comboKey]);
  if (comboRate !== null) {
    totalScore += comboRate * 4;
    totalWeight += 4;
    dataPoints++;
    const comboStats = profile.bySportBetType[comboKey];
    if (comboRate >= 55) {
      reasons.push(`${comboRate.toFixed(0)}% on ${pick.sport} ${pick.betType}s (${comboStats.wins}-${comboStats.losses})`);
    }
  }

  // 4. Sport + Day of week combo (weight: 2)
  const sportDayKey = `${pick.sport}|${today}`;
  const sportDayRate = getWinRate(profile.bySportDay[sportDayKey]);
  if (sportDayRate !== null) {
    totalScore += sportDayRate * 2;
    totalWeight += 2;
    dataPoints++;
    if (sportDayRate >= 55) {
      reasons.push(`${sportDayRate.toFixed(0)}% on ${pick.sport} ${today}s`);
    }
  }

  // 5. Direction tendency (weight: 1)
  const directionRate = getWinRate(profile.byDirection[pick.direction]);
  if (directionRate !== null) {
    totalScore += directionRate * 1;
    totalWeight += 1;
    dataPoints++;
  }

  // 6. Recent form adjustment (weight: 1)
  if (profile.recentPicks.length >= 10) {
    totalScore += profile.recentWinRate * 1;
    totalWeight += 1;

    if (profile.currentStreak.count >= 3) {
      if (profile.currentStreak.type === 'win') {
        reasons.push(`🔥 ${profile.currentStreak.count}-pick win streak`);
      } else {
        reasons.push(`❄️ ${profile.currentStreak.count}-pick cold streak`);
      }
    }
  }

  // Calculate final score (weighted average, 0-100 scale)
  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Confidence level based on how many data points we have
  let confidence = 'low';
  if (dataPoints >= 4) confidence = 'high';
  else if (dataPoints >= 2) confidence = 'medium';

  return {
    ...pick,
    score: Math.round(finalScore * 10) / 10,
    confidence,
    dataPoints,
    reasons: reasons.length > 0 ? reasons : ['Limited historical data for this combination']
  };
};

/**
 * Custom hook for generating pick recommendations for each Big Guy
 *
 * Analyzes historic pick data to build Big Guy profiles, then scores
 * today's available picks against each profile to produce personalized
 * recommendations.
 *
 * @param {Array} parlays - All parlays from Firestore
 * @param {Array} players - Array of Big Guy names
 * @param {Array} availablePicks - Today's filtered pick candidates from useDailyOdds
 * @returns {Object} Recommendations keyed by Big Guy name
 */
export const useRecommendations = (parlays, players, availablePicks) => {

  /**
   * Build profiles for all Big Guys
   */
  const profiles = useMemo(() => {
    const result = {};
    players.forEach(player => {
      result[player] = buildBigGuyProfile(player, parlays);
    });
    return result;
  }, [parlays, players]);

  /**
   * Generate recommendations for all Big Guys
   */
  const recommendations = useMemo(() => {
    if (!availablePicks || availablePicks.length === 0) {
      return {};
    }

    const today = getDayOfWeek(new Date().toISOString().split('T')[0]);
    const result = {};

    players.forEach(player => {
      const profile = profiles[player];
      if (!profile || profile.totalPicks === 0) {
        result[player] = { picks: [], profile, message: 'No historical data to analyze' };
        return;
      }

      // Score every available pick for this Big Guy
      const scoredPicks = availablePicks.map(pick => scorePick(pick, profile, today));

      // Sort by score (highest first), then by confidence
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      scoredPicks.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (confidenceOrder[a.confidence] || 3) - (confidenceOrder[b.confidence] || 3);
      });

      // Top 5 recommendations
      const topPicks = scoredPicks.slice(0, 5);

      result[player] = {
        picks: topPicks,
        profile,
        overallWinRate: profile.totalPicks > 0
          ? ((profile.totalWins / profile.totalPicks) * 100).toFixed(1)
          : '0.0'
      };
    });

    return result;
  }, [availablePicks, players, profiles]);

  return {
    recommendations,
    profiles
  };
};
