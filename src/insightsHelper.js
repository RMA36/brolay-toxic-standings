// insightsHelper.js - Dynamic insights based on current date and season

/**
 * Determines which sports are currently in season
 */
export const getCurrentSportsInSeason = () => {
  const now = new Date();
  const month = now.getMonth(); // 0-11 (0=January, 11=December)
  
  const inSeason = [];
  
  // NFL: September (8) through early February (1)
  // Regular season: Sept-Dec, Playoffs: Jan-early Feb
  if (month >= 8 || month <= 1) {
    inSeason.push('NFL');
  }
  
  // College Football: Late August (7) through early January (0)
  // Regular season: Sept-Nov, Bowl games: Dec-early Jan
  if (month >= 7 || month === 0) {
    inSeason.push('College Football');
  }
  
  // NBA: October (9) through June (5)
  // Regular season: Oct-Apr, Playoffs: Apr-June
  if (month >= 9 || month <= 5) {
    inSeason.push('NBA');
  }
  
  // College Basketball: November (10) through early April (3)
  // Regular season: Nov-Mar, March Madness: Mar-early Apr
  if (month >= 10 || month <= 3) {
    inSeason.push('College Basketball');
  }
  
  // MLB: Late March (2) through October (9)
  // Spring Training: Feb-Mar, Regular season: Apr-Sept, Playoffs: Oct
  if (month >= 2 && month <= 9) {
    inSeason.push('MLB');
  }
  
  // College Baseball: February (1) through June (5)
  // Regular season: Feb-May, College World Series: June
  if (month >= 1 && month <= 5) {
    inSeason.push('College Baseball');
  }
  
  // NHL: October (9) through June (5)
  // Regular season: Oct-Apr, Playoffs: Apr-June
  if (month >= 9 || month <= 5) {
    inSeason.push('NHL');
  }
  
  // WNBA: May (4) through October (9)
  // Regular season: May-Sept, Playoffs: Sept-Oct
  if (month >= 4 && month <= 9) {
    inSeason.push('WNBA');
  }
  
  // Soccer (MLS & NWSL): March (2) through November (10)
  // MLS: Feb-Oct, NWSL: Mar-Nov
  // Note: International soccer is year-round, but focusing on US leagues
  if (month >= 2 && month <= 10) {
    inSeason.push('Soccer');
  }
  
  // Tennis: Year-round
  // Major tournaments spread throughout the year
  // Australian Open (Jan), French Open (May-June), Wimbledon (June-July), US Open (Aug-Sept)
  inSeason.push('Tennis');
  
  return inSeason;
};

/**
 * Gets current day of week
 */
export const getCurrentDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

/**
 * Analyzes player performance for a specific combo (sport + day + bet type)
 */
export const analyzeCombo = (parlays, player, sport, dayOfWeek = null, betType = null) => {
  let totalPicks = 0;
  let wins = 0;
  let losses = 0;
  
  parlays.forEach(parlay => {
    // Filter by day of week if specified
    if (dayOfWeek) {
      const parlayDay = new Date(parlay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      if (parlayDay !== dayOfWeek) return;
    }
    
    Object.values(parlay.participants || {}).forEach(pick => {
      if (pick.player !== player) return;
      if (pick.sport !== sport) return;
      if (betType && pick.betType !== betType) return;
      if (pick.result === 'pending') return;
      
      totalPicks++;
      if (pick.result === 'win') wins++;
      else if (pick.result === 'loss') losses++;
    });
  });
  
  if (totalPicks < 5) return null; // Need minimum 5 picks for statistical relevance
  
  const winRate = totalPicks > 0 ? (wins / totalPicks) * 100 : 0;
  
  return {
    player,
    sport,
    dayOfWeek,
    betType,
    totalPicks,
    wins,
    losses,
    winRate
  };
};

/**
 * Finds the best performing combo (Money Maker)
 */
export const findMoneyMaker = (parlays, players) => {
  const currentSports = getCurrentSportsInSeason();
  const currentDay = getCurrentDayOfWeek();
  
  let bestCombo = null;
  let bestWinRate = 0;
  
  // Prioritize current day + current sports
  players.forEach(player => {
    currentSports.forEach(sport => {
      // Try current day + sport combo
      const dayCombo = analyzeCombo(parlays, player, sport, currentDay);
      if (dayCombo && dayCombo.winRate > bestWinRate) {
        bestCombo = dayCombo;
        bestWinRate = dayCombo.winRate;
      }
      
      // Try sport overall (without day filter)
      const sportCombo = analyzeCombo(parlays, player, sport);
      if (sportCombo && sportCombo.winRate > bestWinRate && sportCombo.winRate >= 70) {
        bestCombo = sportCombo;
        bestWinRate = sportCombo.winRate;
      }
      
      // Try specific bet types
      ['Spread', 'Moneyline', 'Total', 'Prop Bet'].forEach(betType => {
        const betCombo = analyzeCombo(parlays, player, sport, null, betType);
        if (betCombo && betCombo.winRate > bestWinRate && betCombo.winRate >= 70) {
          bestCombo = betCombo;
          bestWinRate = betCombo.winRate;
        }
      });
    });
  });
  
  return bestCombo;
};

/**
 * Finds the worst performing combo (Danger Zone)
 */
export const findDangerZone = (parlays, players) => {
  const currentSports = getCurrentSportsInSeason();
  const currentDay = getCurrentDayOfWeek();
  
  let worstCombo = null;
  let worstWinRate = 100;
  
  // Prioritize current day + current sports
  players.forEach(player => {
    currentSports.forEach(sport => {
      // Try current day + sport combo
      const dayCombo = analyzeCombo(parlays, player, sport, currentDay);
      if (dayCombo && dayCombo.winRate < worstWinRate && dayCombo.winRate <= 40) {
        worstCombo = dayCombo;
        worstWinRate = dayCombo.winRate;
      }
      
      // Try sport overall (without day filter)
      const sportCombo = analyzeCombo(parlays, player, sport);
      if (sportCombo && sportCombo.winRate < worstWinRate && sportCombo.winRate <= 40) {
        worstCombo = sportCombo;
        worstWinRate = sportCombo.winRate;
      }
      
      // Try specific bet types
      ['Spread', 'Moneyline', 'Total', 'Prop Bet'].forEach(betType => {
        const betCombo = analyzeCombo(parlays, player, sport, null, betType);
        if (betCombo && betCombo.winRate < worstWinRate && betCombo.winRate <= 40) {
          worstCombo = betCombo;
          worstWinRate = betCombo.winRate;
        }
      });
    });
  });
  
  return worstCombo;
};

/**
 * Formats a combo description for display
 */
export const formatComboDescription = (combo) => {
  if (!combo) return 'No data available';
  
  let description = `${combo.player} + ${combo.sport}`;
  
  if (combo.betType) {
    description += ` ${combo.betType}s`;
  }
  
  if (combo.dayOfWeek) {
    description += ` on ${combo.dayOfWeek}s`;
  }
  
  return description;
};

/**
 * Gets a contextual tip based on current season
 */
export const getSeasonalTip = () => {
  const month = new Date().getMonth();
  const day = getCurrentDayOfWeek();
  
  // NFL Sundays (Sept-Feb)
  if (day === 'Sunday' && (month >= 8 || month <= 1)) {
    return "🏈 NFL Sunday! Historically strong day for spreads and player props.";
  }
  
  // NFL Thursday Night Football
  if (day === 'Thursday' && (month >= 8 || month <= 1)) {
    return "🏈 Thursday Night Football! Prime time matchup - watch for totals value.";
  }
  
  // NFL Monday Night Football
  if (day === 'Monday' && (month >= 8 || month <= 1)) {
    return "🏈 Monday Night Football! Closing out the week with a spotlight game.";
  }
  
  // College Football Saturdays (Aug-Jan)
  if (day === 'Saturday' && (month >= 7 || month === 0)) {
    return "🏈 College Football Saturday! Conference rivalries often have betting value.";
  }
  
  // NBA Tuesdays/Thursdays (Oct-June)
  if ((day === 'Tuesday' || day === 'Thursday') && (month >= 9 || month <= 5)) {
    return "🏀 Big NBA night! Watch for player prop opportunities and overs.";
  }
  
  // NBA Weekends
  if ((day === 'Saturday' || day === 'Sunday') && (month >= 9 || month <= 5)) {
    return "🏀 NBA weekend slate! More games = more opportunities to find value.";
  }
  
  // March Madness (March)
  if (month === 2) {
    return "🏀 March Madness is here! Upsets happen - look for underdog value.";
  }
  
  // MLB Daily (Apr-Oct)
  if (month >= 3 && month <= 9) {
    if (day === 'Sunday') {
      return "⚾ Baseball Sunday! Day games + matinee prices = opportunity.";
    }
    return "⚾ Baseball season! Consider total runs, strikeout props, and first inning action.";
  }
  
  // College Baseball (Feb-June)
  if (month >= 1 && month <= 5 && (day === 'Friday' || day === 'Saturday' || day === 'Sunday')) {
    return "⚾ College Baseball weekend! Watch for weather and pitcher matchups.";
  }
  
  // NHL Action (Oct-June)
  if (month >= 9 || month <= 5) {
    if (day === 'Saturday' || day === 'Sunday') {
      return "🏒 NHL weekend! More games on the slate - puck line value to be found.";
    }
    return "🏒 NHL season! Goalie matchups matter - track starting goalies for totals.";
  }
  
  // WNBA (May-Oct)
  if (month >= 4 && month <= 9) {
    return "🏀 WNBA season! Lower scoring means totals are key - track pace and defense.";
  }
  
  // Soccer (Mar-Nov)
  if (month >= 2 && month <= 10 && (day === 'Saturday' || day === 'Sunday')) {
    return "⚽ Soccer weekend! MLS action + international leagues = lots of options.";
  }
  
  // Tennis Grand Slams
  if (month === 0) {
    return "🎾 Australian Open season! Hard court tennis - watch for upsets.";
  }
  if (month === 4 || month === 5) {
    return "🎾 French Open / Wimbledon coming! Clay court specialists have edge.";
  }
  if (month === 7 || month === 8) {
    return "🎾 US Open season! Final Grand Slam of the year - veterans shine.";
  }
  
  // Default tips by season
  if (month >= 8 || month <= 1) {
    return "🏈 Football season is king! NFL and College Football dominate the betting landscape.";
  }
  
  if (month >= 2 && month <= 5) {
    return "🏀⚾ Spring sports! Basketball playoffs overlap with baseball's start.";
  }
  
  if (month >= 6 && month <= 8) {
    return "⚾ Summer baseball grind! Daily games = consistent opportunities.";
  }
  
  return "📊 Analyze your best combos and stick to what works!";
};
