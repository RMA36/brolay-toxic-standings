import { useState } from 'react';
import { deleteField } from 'firebase/firestore';

/**
 * Custom hook for ESPN API integration and auto-updating picks
 * Handles fetching game results and updating pending picks
 */
export const useESPN = () => {
  const [autoUpdating, setAutoUpdating] = useState(false);

  // Helper function to match team names with fuzzy matching
  // Primary use: Match full team names from autocomplete (e.g., "Michigan Wolverines")
  // Fallback: Support legacy data with partial names (e.g., "Michigan")
  const matchTeamName = (betTeam, apiTeam) => {
    if (!betTeam || !apiTeam) return false;

    // Normalize both names for comparison
    const normalize = (name) => name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedBet = normalize(betTeam);
    const normalizedApi = normalize(apiTeam);

    // Check for exact match first (ideal case with autocomplete)
    if (normalizedBet === normalizedApi) return true;

    // Filter out common filler words AND single-character fragments (e.g., "a" from "A&M")
    const commonWords = ['university', 'college', 'of', 'the'];
    const filterWords = (str) => str.split(' ').filter(word => word.length > 1 && !commonWords.includes(word));

    const betWords = filterWords(normalizedBet);
    const apiWords = filterWords(normalizedApi);

    // If either side has no meaningful words after filtering, can't match
    if (betWords.length === 0 || apiWords.length === 0) return false;

    // For single-word bet names (common in college sports), apply strict disambiguation
    const apiAllWords = normalizedApi.split(' ').filter(w => w.length > 1);
    if (betWords.length === 1) {
      const betWord = betWords[0];
      const apiIdx = apiAllWords.indexOf(betWord);

      // Prevent "Michigan" matching "Michigan State Spartans"
      if (apiIdx >= 0 && apiIdx + 1 < apiAllWords.length && apiAllWords[apiIdx + 1] === 'state') {
        return false;
      }

      // Prevent "Alabama" matching "Alabama A&M" (normalized: "alabama am")
      // Prevent "Illinois" matching "Eastern Illinois"
      const locationModifiers = ['am', 'state', 'tech'];
      const qualifiers = ['eastern', 'western', 'northern', 'southern', 'central', 'north', 'south', 'southeast', 'southwest'];

      if (apiIdx === 0 && apiAllWords.length > 1 && locationModifiers.includes(apiAllWords[1])) {
        return false;
      }
      if (apiIdx > 0 && qualifiers.includes(apiAllWords[apiIdx - 1])) {
        return false;
      }
    }

    // All words from bet must be in API (allows partial matching for legacy data)
    // Use minimum length of 3 for substring matching to avoid false positives
    return betWords.every(word =>
      apiWords.some(apiWord => {
        if (apiWord === word) return true; // Exact word match
        // Substring match only for words >= 3 characters
        if (word.length >= 3 && apiWord.length >= 3) {
          return apiWord.includes(word) || word.includes(apiWord);
        }
        return false;
      })
    );
  };

  // Map sport to ESPN API endpoint
  const getESPNSport = (sport) => {
    const sportMap = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl',
      'College Football': 'football/college-football',
      'College Basketball': 'basketball/mens-college-basketball',
      'College Basketball (Women\'s)': 'basketball/womens-college-basketball',
      'Soccer': 'soccer/usa.1',
      'Soccer (Women\'s)': 'soccer/usa.nwsl',
      'Tennis': 'tennis/atp',
      'Tennis (Women\'s)': 'tennis/wta',
      'WNBA': 'basketball/wnba',
      'College Baseball': 'baseball/college-baseball',
    };
    
    return sportMap[sport] || null;
  };

  // Determine spread result
  const determineSpreadResult = (team, favorite, spread, homeComp, awayComp, homeScore, awayScore) => {
    const spreadValue = parseFloat(spread);
    if (isNaN(spreadValue)) return 'pending';

    const teamIsHome = matchTeamName(team, homeComp.team.displayName);
    const teamIsFavorite = favorite === 'Favorite';

    let margin;
    if (teamIsHome) {
      margin = homeScore - awayScore;
    } else {
      margin = awayScore - homeScore;
    }

    // Favorite needs to win by MORE than spread (margin - spread)
    // Dog gets the points added (margin + spread)
    const adjustedMargin = teamIsFavorite ? margin - spreadValue : margin + spreadValue;

    if (adjustedMargin > 0) return 'win';
    if (adjustedMargin < 0) return 'loss';
    return 'push';
  };

  // Determine moneyline result
  const determineMoneylineResult = (team, homeComp, awayComp) => {
    const teamIsHome = matchTeamName(team, homeComp.team.displayName);

    // Use scores to determine winner instead of relying on winner property
    const homeScore = parseInt(homeComp.score);
    const awayScore = parseInt(awayComp.score);
    const homeWon = homeScore > awayScore;

    if (teamIsHome) {
      return homeWon ? 'win' : 'loss';
    } else {
      return homeWon ? 'loss' : 'win';
    }
  };

  // Determine total result
  const determineTotalResult = (overUnder, total, actualTotal) => {
    const totalValue = parseFloat(total);
    if (isNaN(totalValue)) return 'pending';
    
    if (actualTotal > totalValue) {
      return overUnder === 'Over' ? 'win' : 'loss';
    } else if (actualTotal < totalValue) {
      return overUnder === 'Under' ? 'win' : 'loss';
    }
    return 'push';
  };

// Extract player stat from boxscore using labels
  const getStatValue = (stats, propType, sport, labels) => {
    if (!stats || !labels) return null;
    
    const statMappings = {
      'NFL': {
        'passing yards': ['YDS', 'Passing Yards'],
        'passing attempts': ['ATT', 'Attempts'],
        'passing completions': ['C/ATT', 'COMP', 'Completions'],
        'interceptions thrown': ['INT', 'Interceptions'],
        'rushing yards': ['YDS', 'Rushing Yards'],
        'receiving yards': ['YDS', 'Receiving Yards'],
        'rushing & receiving yards': ['YDS'],
        'receptions': ['REC', 'Receptions'],
        'passing touchdowns': ['TD', 'Passing TDs'],
        'rushing touchdowns': ['TD', 'Rushing TDs'],
        'receiving touchdowns': ['TD', 'Receiving TDs'],
        'total touchdowns': ['TD']
      },
      'NBA': {
        'points': ['PTS', 'Points'],
        'rebounds': ['REB', 'Rebounds'],
        'assists': ['AST', 'Assists'],
        'steals': ['STL', 'Steals'],
        'blocks': ['BLK', 'Blocks'],
        'three pointers made': ['3PM', '3PT'],
        'turnovers': ['TO', 'Turnovers']
      },
      'MLB': {
        'strikeouts': ['K', 'SO', 'Strikeouts'],
        'hits': ['H', 'Hits'],
        'home runs': ['HR', 'Home Runs'],
        'rbis': ['RBI', 'RBIs'],
        'runs': ['R', 'Runs'],
        'stolen bases': ['SB', 'Stolen Bases']
      },
      'NHL': {
        'goals': ['G', 'Goals'],
        'assists': ['A', 'Assists'],
        'points': ['PTS', 'Points'],
        'saves': ['SV', 'Saves'],
        'shots on goal': ['SOG', 'Shots']
      }
    };
    
    const sportMappings = statMappings[sport] || {};
    const possibleLabels = sportMappings[propType] || [];
    
    if (propType === 'passing completions') {
      const index = labels.findIndex(label => 
        label === 'C/ATT' || label.toUpperCase() === 'COMP'
      );
      
      if (index !== -1 && stats[index] !== undefined) {
        const value = stats[index].toString().split('/')[0];
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) return parsed;
      }
    }
    
    for (const possibleLabel of possibleLabels) {
      const index = labels.findIndex(label => 
        label.toUpperCase() === possibleLabel.toUpperCase() ||
        label.toUpperCase().includes(possibleLabel.toUpperCase())
      );
      
      if (index !== -1 && stats[index] !== undefined) {
        const value = parseFloat(stats[index]);
        if (!isNaN(value)) return value;
      }
    }
    
    return null;
  };

  const normalizePropType = (propType) => {
    if (!propType) return '';
    const normalized = propType.toLowerCase().trim();
    
    const mappings = {
      'passing yards': ['pass yards', 'passing yds', 'pass yds'],
      'passing completions': ['completions', 'comp', 'pass comp'],
      'rushing yards': ['rush yards', 'rushing yds', 'rush yds'],
      'receiving yards': ['rec yards', 'receiving yds', 'rec yds'],
      'rushing & receiving yards': ['rush + rec yards', 'rush and rec yards', 'rush/rec yards'],
      'receptions': ['rec', 'catches'],
      'passing touchdowns': ['pass td', 'pass tds', 'passing td'],
      'rushing touchdowns': ['rush td', 'rushing td'],
      'receiving touchdowns': ['rec td', 'receiving td'],
      'total touchdowns': ['td', 'touchdowns', 'tds'],
      'anytime touchdown scorer': ['anytime td', 'anytime td scorer', 'to score a td'],
      'interceptions thrown': ['int', 'ints', 'interceptions'],
      'points': ['pts'],
      'rebounds': ['reb', 'rebs'],
      'assists': ['ast', 'asst'],
      'steals': ['stl'],
      'blocks': ['blk'],
      'three pointers made': ['3pm', '3pt', 'threes', 'three pointers'],
      'turnovers': ['to'],
      'strikeouts': ['k', 'ks', 'so'],
      'hits': ['h'],
      'home runs': ['hr', 'homers'],
      'rbis': ['rbi', 'runs batted in'],
      'runs': ['r'],
      'stolen bases': ['sb', 'steals'],
      'goals': ['g'],
      'saves': ['sv'],
      'shots on goal': ['sog', 'shots']
    };
    
    for (const [standard, variations] of Object.entries(mappings)) {
      if (normalized === standard || variations.includes(normalized)) {
        return standard;
      }
    }

    // Normalize combined stat props (e.g., "Hits+Runs+RBIs" → "hits+runs+rbis")
    // Handle common variations with spaces, ampersands, and different separators
    const combinedMappings = {
      'hits+runs+rbis': ['hits + runs + rbis', 'h+r+rbi', 'hits+runs+rbi', 'hits, runs, rbis', 'hits runs rbis'],
      'points+rebounds+assists': ['pts+reb+ast', 'pts+rebs+asts', 'points + rebounds + assists', 'pra', 'points rebounds assists'],
      'points+rebounds': ['pts+reb', 'pts+rebs', 'points + rebounds', 'points rebounds', 'pr'],
      'points+assists': ['pts+ast', 'pts+asts', 'points + assists', 'points assists', 'pa'],
      'rebounds+assists': ['reb+ast', 'rebs+asts', 'rebounds + assists', 'rebounds assists', 'ra'],
      'goals+assists': ['g+a', 'goals + assists', 'goals assists'],
      'rushing yards+receiving yards': ['rush+rec yards', 'rushing + receiving yards', 'rushing and receiving yards', 'rushing+receiving yards', 'rush yards+rec yards']
    };

    for (const [standard, variations] of Object.entries(combinedMappings)) {
      if (normalized === standard || variations.includes(normalized)) {
        return standard;
      }
    }

    return normalized;
  };

  const matchPlayerName = (pickPlayer, apiPlayer) => {
    if (!pickPlayer || !apiPlayer) return false;
    
    const normalizePlayerName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
        .replace(/[^a-z\s]/g, '')
        .trim();
    };
    
    const normalizedPick = normalizePlayerName(pickPlayer);
    const normalizedApi = normalizePlayerName(apiPlayer);
    
    if (normalizedPick === normalizedApi) return true;
    
    const pickParts = normalizedPick.split(' ');
    const apiParts = normalizedApi.split(' ');
    const pickLastName = pickParts[pickParts.length - 1];
    const apiLastName = apiParts[apiParts.length - 1];
    
    if (pickLastName === apiLastName && pickLastName.length > 3) {
      return true;
    }
    
    return false;
  };

  const extractPlayerStat = (boxscoreData, playerName, propType, sport) => {
    if (!boxscoreData || !boxscoreData.players) return null;

    const normalizedPropType = normalizePropType(propType);
    const propLower = propType.toLowerCase();

    // Handle combined stat props (e.g., "Hits+Runs+RBIs", "Points+Rebounds+Assists")
    // Split on '+' and sum each component stat individually
    const combinedComponents = normalizedPropType.split('+').map(s => s.trim()).filter(Boolean);
    if (combinedComponents.length > 1) {
      console.log('📊 Combined stat prop detected:', normalizedPropType, '→ components:', combinedComponents);
      let combinedTotal = 0;
      let allFound = true;
      const componentResults = [];

      for (const component of combinedComponents) {
        const normalizedComponent = normalizePropType(component);
        const componentStat = extractPlayerStat(boxscoreData, playerName, normalizedComponent, sport);
        if (componentStat === null) {
          console.log('❌ Could not find stat for component:', normalizedComponent);
          allFound = false;
          break;
        }
        console.log(`✅ ${normalizedComponent}: ${componentStat}`);
        componentResults.push(`${normalizedComponent}: ${componentStat}`);
        combinedTotal += componentStat;
      }

      if (allFound) {
        console.log('📊 Combined total:', combinedTotal, `(${componentResults.join(', ')})`);
        return combinedTotal;
      }
      return null;
    }

    const isTDScorerProp = propLower.includes('anytime') ||
                           propLower.includes('2+') ||
                           propLower.includes('multiple td');

    try {
      let totalTDs = 0;
      let playerFound = false;

      for (const team of boxscoreData.players) {
        if (!team.statistics) continue;

        for (const statCategory of team.statistics) {
          if (!statCategory.athletes) continue;

          // Match the stat category to the prop type
          const categoryName = statCategory.name?.toLowerCase() || '';
          const shouldCheckCategory =
            (normalizedPropType.includes('passing') && categoryName.includes('passing')) ||
            (normalizedPropType.includes('rushing') && categoryName.includes('rushing')) ||
            (normalizedPropType.includes('receiving') && categoryName.includes('receiving')) ||
            (normalizedPropType.includes('receptions') && categoryName.includes('receiving')) ||
            (!normalizedPropType.includes('passing') && !normalizedPropType.includes('rushing') && !normalizedPropType.includes('receiving'));

          for (const athlete of statCategory.athletes) {
            if (!matchPlayerName(playerName, athlete.athlete?.displayName)) continue;

            playerFound = true;

            console.log('✅ Found player in category:', statCategory.name, 'Labels:', statCategory.labels);
            console.log('🔍 Prop type:', normalizedPropType, 'Should check this category?', shouldCheckCategory);

            if (isTDScorerProp && sport === 'NFL') {
              // Check all relevant categories for TD scorer props
              // Include: rushing, receiving, kick returns, punt returns, interceptions, fumble returns, defensive
              if (categoryName.includes('rushing')) {
                const rushingTDs = getStatValue(athlete.stats, 'rushing touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Rushing TDs:', rushingTDs);
                totalTDs += rushingTDs;
              } else if (categoryName.includes('receiving')) {
                const receivingTDs = getStatValue(athlete.stats, 'receiving touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Receiving TDs:', receivingTDs);
                totalTDs += receivingTDs;
              } else if (categoryName.includes('kick') && categoryName.includes('return')) {
                // Kick return TDs
                const kickReturnTDs = getStatValue(athlete.stats, 'total touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Kick Return TDs:', kickReturnTDs);
                totalTDs += kickReturnTDs;
              } else if (categoryName.includes('punt') && categoryName.includes('return')) {
                // Punt return TDs
                const puntReturnTDs = getStatValue(athlete.stats, 'total touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Punt Return TDs:', puntReturnTDs);
                totalTDs += puntReturnTDs;
              } else if (categoryName.includes('interception')) {
                // Interception return TDs
                const intReturnTDs = getStatValue(athlete.stats, 'total touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Interception Return TDs:', intReturnTDs);
                totalTDs += intReturnTDs;
              } else if (categoryName.includes('fumble')) {
                // Fumble return TDs (for defensive players)
                const fumbleReturnTDs = getStatValue(athlete.stats, 'total touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Fumble Return TDs:', fumbleReturnTDs);
                totalTDs += fumbleReturnTDs;
              } else if (categoryName.includes('defensive')) {
                // Defensive TDs (catch-all for defensive scoring plays)
                const defensiveTDs = getStatValue(athlete.stats, 'total touchdowns', sport, statCategory.labels) || 0;
                console.log('🏈 Defensive TDs:', defensiveTDs);
                totalTDs += defensiveTDs;
              } else {
                console.log('⏭️ Skipping category for TD scorer:', categoryName);
              }
              continue;
            }

            // Only check this category if it matches the prop type
            if (!shouldCheckCategory) {
              console.log('⏭️ Skipping category - does not match prop type');
              continue;
            }

            const stat = getStatValue(athlete.stats, normalizedPropType, sport, statCategory.labels);
            if (stat !== null) return stat;
          }
        }
      }

      if (isTDScorerProp && playerFound) {
        return totalTDs;
      }

    } catch (error) {
      console.error('Error extracting player stat:', error);
    }

    return null;
  };

  // Check TD scorer result
  const checkTDScorerResult = (playerStat, propType, overUnder, line) => {
    const totalTDs = playerStat || 0;
    const propLower = propType.toLowerCase();
    
    if (propLower.includes('anytime') || propLower.includes('score')) {
      if (overUnder === 'Over') {
        return totalTDs > 0 ? 'win' : 'loss';
      } else {
        return totalTDs === 0 ? 'win' : 'loss';
      }
    }
    
    if (propLower.includes('2+') || propLower.includes('multiple') || propLower.includes('2 or more')) {
      if (overUnder === 'Over') {
        return totalTDs >= 2 ? 'win' : 'loss';
      } else {
        return totalTDs < 2 ? 'win' : 'loss';
      }
    }
    
    const lineValue = parseFloat(line);
    if (isNaN(lineValue)) return 'pending';
    
    if (overUnder === 'Over') {
      if (totalTDs > lineValue) return 'win';
      if (totalTDs < lineValue) return 'loss';
      return 'push';
    } else {
      if (totalTDs < lineValue) return 'win';
      if (totalTDs > lineValue) return 'loss';
      return 'push';
    }
  };

  // Check prop bet result
  const checkPropBetResult = async (participant, gameDate) => {
    const { sport, team: playerName, propType, overUnder, line } = participant;
    
    console.log('🏈 checkPropBetResult called with:', {
      sport,
      playerName,
      propType,
      overUnder,
      line,
      gameDate
    });
    
    if (!playerName || !propType || !line) {
      console.log('❌ Missing required fields for prop bet');
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports for prop tracking
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      // Try to find the game with this player
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        
        console.log('🎮 Checking event:', {
          eventId: event.id,
          teams: competition?.competitors?.map(c => c.team.displayName).join(' vs '),
          status: competition?.status?.type?.name,
          completed: competition?.status?.type?.completed
        });
        
        if (!competition || competition.status?.type?.completed !== true) {
          console.log('⏭️ Skipping - game not completed');
          continue;
        }
        
        const gameId = event.id;
        const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
        
        try {
          const boxscoreResponse = await fetch(boxscoreUrl);
          const boxscoreData = await boxscoreResponse.json();
          
          console.log('📦 Fetched boxscore for game', gameId);
          
          // Double-check completion status
          const boxscoreStatus = boxscoreData.header?.competitions?.[0]?.status?.type?.name?.toLowerCase();
          console.log('📊 Boxscore status:', boxscoreStatus);
          if (boxscoreStatus !== 'final' && boxscoreStatus !== 'status_final') {
            console.log(`Boxscore for game ${gameId} status is ${boxscoreStatus}, not final, skipping`);
            continue;
          }
          
          if (boxscoreData.boxscore) {
            console.log('🔍 Searching for player:', playerName, 'in boxscore');
            const playerStat = extractPlayerStat(boxscoreData.boxscore, playerName, propType, sport);
            console.log('📈 Player stat found:', playerStat);
            
            if (playerStat !== null) {
              const propLower = propType.toLowerCase();
              const isTDScorerProp = propLower.includes('anytime') || 
                                     propLower.includes('2+') || 
                                     propLower.includes('multiple td');
              
              if (isTDScorerProp) {
                const result = checkTDScorerResult(playerStat, propType, overUnder, line);
                return {
                  result,
                  stats: `${playerStat} TD${playerStat !== 1 ? 's' : ''}`
                };
              }
              
              const lineValue = parseFloat(line);
              if (isNaN(lineValue)) {
                return { result: 'pending', stats: `${propType}: ${playerStat}` };
              }
              
              let result;
              if (overUnder === 'Over') {
                if (playerStat > lineValue) result = 'win';
                else if (playerStat < lineValue) result = 'loss';
                else result = 'push';
              } else {
                if (playerStat < lineValue) result = 'win';
                else if (playerStat > lineValue) result = 'loss';
                else result = 'push';
              }
              
              return {
                result,
                stats: `${propType}: ${playerStat}`
              };
            }
          }
        } catch (boxscoreError) {
          console.error(`Error fetching boxscore for game ${gameId}:`, boxscoreError);
          continue;
        }
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking prop bet result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Check H2H Prop result
  const checkH2HPropResult = async (participant, gameDate) => {
    const { sport, player1, player1PropType, player2, player2PropType, selectedPlayer, h2hLine, h2hLineType } = participant;
    
    console.log('🆚 checkH2HPropResult called with:', {
      player1, player1PropType,
      player2, player2PropType,
      selectedPlayer, h2hLine, h2hLineType,
      gameDate
    });
    
    if (!player1 || !player2 || !player1PropType || !player2PropType || !selectedPlayer) {
      console.log('❌ Missing required fields for H2H prop');
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports for prop tracking
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      let player1Stat = null;
      let player2Stat = null;
      let player1Found = false;
      let player2Found = false;
      
      // Search for both players' games
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        // Check if game is completed
        if (event.status?.type?.state !== 'post') {
          console.log('Game not completed yet');
          continue;
        }
        
        const gameId = event.id;
        
        try {
          const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
          const boxscoreResponse = await fetch(boxscoreUrl);
          const boxscoreData = await boxscoreResponse.json();
          
          // Get player stats from boxscore
          // Check for player1 using the existing extractPlayerStat function
          if (!player1Found) {
            player1Stat = extractPlayerStat(boxscoreData.boxscore, player1, player1PropType, sport);
            if (player1Stat !== null) {
              player1Found = true;
              console.log(`✅ Found ${player1}: ${player1PropType} = ${player1Stat}`);
            }
          }
          
          // Check for player2 using the existing extractPlayerStat function
          if (!player2Found) {
            player2Stat = extractPlayerStat(boxscoreData.boxscore, player2, player2PropType, sport);
            if (player2Stat !== null) {
              player2Found = true;
              console.log(`✅ Found ${player2}: ${player2PropType} = ${player2Stat}`);
            }
          }
          
          // If we found both players, we can stop searching
          if (player1Found && player2Found) break;
          
        } catch (boxscoreError) {
          console.error(`Error fetching boxscore for game ${gameId}:`, boxscoreError);
          continue;
        }
      }
      
      // If either player not found or game not finished, return pending
      if (!player1Found || !player2Found || player1Stat === null || player2Stat === null) {
        console.log('❌ One or both players not found or games not completed');
        return { result: 'pending', stats: null };
      }
      
      // Calculate result
      const opponent = selectedPlayer === player1 ? player2 : player1;
      const selectedStat = selectedPlayer === player1 ? player1Stat : player2Stat;
      const opponentStat = selectedPlayer === player1 ? player2Stat : player1Stat;
      const selectedPropType = selectedPlayer === player1 ? player1PropType : player2PropType;
      const opponentPropType = selectedPlayer === player1 ? player2PropType : player1PropType;
      
      let result;
      if (h2hLine && h2hLineType) {
        // H2H with spread
        const lineValue = parseFloat(h2hLine);
        const adjustedStat = h2hLineType === 'Dog' ? selectedStat + lineValue : selectedStat - lineValue;
        
        if (adjustedStat > opponentStat) result = 'win';
        else if (adjustedStat < opponentStat) result = 'loss';
        else result = 'push';
        
        const sign = h2hLineType === 'Dog' ? '+' : '-';
        return {
          result,
          stats: `${selectedPlayer} ${selectedPropType}: ${selectedStat} ${sign}${h2hLine} vs ${opponent} ${opponentPropType}: ${opponentStat}`
        };
      } else {
        // Straight up H2H
        if (selectedStat > opponentStat) result = 'win';
        else if (selectedStat < opponentStat) result = 'loss';
        else result = 'push';
        
        return {
          result,
          stats: `${selectedPlayer} ${selectedPropType}: ${selectedStat} vs ${opponent} ${opponentPropType}: ${opponentStat}`
        };
      }
      
    } catch (error) {
      console.error('Error checking H2H prop result:', error);
      return { result: 'pending', stats: null };
    }
  };
  
  // Check Either Prop result
  const checkEitherPropResult = async (participant, gameDate) => {
    const { sport, propType, overUnder, line, player1, player2 } = participant;
    
    console.log('🎲 checkEitherPropResult called with:', {
      sport, propType, overUnder, line,
      player1, player2, gameDate
    });
    
    if (!player1 || !player2 || !propType || !line) {
      console.log('❌ Missing required fields for Either prop');
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        return { result: 'pending', stats: null };
      }
      
      let player1Stat = null;
      let player2Stat = null;
      let player1Found = false;
      let player2Found = false;
      
      // Search for both players
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        if (event.status?.type?.state !== 'post') {
          continue;
        }
        
        const gameId = event.id;
        
        try {
          const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
          const boxscoreResponse = await fetch(boxscoreUrl);
          const boxscoreData = await boxscoreResponse.json();
          
          // Check for player1 using the existing extractPlayerStat function
          if (!player1Found) {
            player1Stat = extractPlayerStat(boxscoreData.boxscore, player1, propType, sport);
            if (player1Stat !== null) {
              player1Found = true;
              console.log(`✅ Found ${player1}: ${propType} = ${player1Stat}`);
            }
          }
          
          // Check for player2 using the existing extractPlayerStat function
          if (!player2Found) {
            player2Stat = extractPlayerStat(boxscoreData.boxscore, player2, propType, sport);
            if (player2Stat !== null) {
              player2Found = true;
              console.log(`✅ Found ${player2}: ${propType} = ${player2Stat}`);
            }
          }
          
          if (player1Found && player2Found) break;
          
        } catch (boxscoreError) {
          console.error(`Error fetching boxscore:`, boxscoreError);
          continue;
        }
      }
      
      // If either player not found, return pending
      if (!player1Found || !player2Found || player1Stat === null || player2Stat === null) {
        console.log('❌ One or both players not found or games not completed');
        return { result: 'pending', stats: null };
      }
      
      // Check if EITHER player hit the line
      const lineValue = parseFloat(line);
      let player1Hit = false;
      let player2Hit = false;
      
      if (overUnder === 'Over') {
        player1Hit = player1Stat > lineValue;
        player2Hit = player2Stat > lineValue;
      } else {
        player1Hit = player1Stat < lineValue;
        player2Hit = player2Stat < lineValue;
      }
      
      // Win if ONE OR BOTH hit
      const result = (player1Hit || player2Hit) ? 'win' : 'loss';
      
      return {
        result,
        stats: `${player1} ${propType}: ${player1Stat}, ${player2} ${propType}: ${player2Stat} (${overUnder} ${line})`
      };
      
    } catch (error) {
      console.error('Error checking Either prop result:', error);
      return { result: 'pending', stats: null };
    }
  };
  
  // Check Combined Prop result
  const checkCombinedPropResult = async (participant, gameDate) => {
    const { sport, propType, overUnder, line, player1, player2 } = participant;
    
    console.log('➕ checkCombinedPropResult called with:', {
      sport, propType, overUnder, line,
      player1, player2, gameDate
    });
    
    if (!player1 || !player2 || !propType || !line) {
      console.log('❌ Missing required fields for Combined prop');
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        return { result: 'pending', stats: null };
      }
      
      let player1Stat = null;
      let player2Stat = null;
      let player1Found = false;
      let player2Found = false;
      
      // Search for both players
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;
        
        if (event.status?.type?.state !== 'post') {
          continue;
        }
        
        const gameId = event.id;
        
        try {
          const boxscoreUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
          const boxscoreResponse = await fetch(boxscoreUrl);
          const boxscoreData = await boxscoreResponse.json();
          
          // Check for player1 using the existing extractPlayerStat function
          if (!player1Found) {
            player1Stat = extractPlayerStat(boxscoreData.boxscore, player1, propType, sport);
            if (player1Stat !== null) {
              player1Found = true;
              console.log(`✅ Found ${player1}: ${propType} = ${player1Stat}`);
            }
          }
          
          // Check for player2 using the existing extractPlayerStat function
          if (!player2Found) {
            player2Stat = extractPlayerStat(boxscoreData.boxscore, player2, propType, sport);
            if (player2Stat !== null) {
              player2Found = true;
              console.log(`✅ Found ${player2}: ${propType} = ${player2Stat}`);
            }
          }
          
          if (player1Found && player2Found) break;
          
        } catch (boxscoreError) {
          console.error(`Error fetching boxscore:`, boxscoreError);
          continue;
        }
      }
      
      // If either player not found, return pending
      if (!player1Found || !player2Found || player1Stat === null || player2Stat === null) {
        console.log('❌ One or both players not found or games not completed');
        return { result: 'pending', stats: null };
      }
      
      // Calculate combined total
      const combinedTotal = player1Stat + player2Stat;
      const lineValue = parseFloat(line);
      
      let result;
      if (overUnder === 'Over') {
        if (combinedTotal > lineValue) result = 'win';
        else if (combinedTotal < lineValue) result = 'loss';
        else result = 'push';
      } else {
        if (combinedTotal < lineValue) result = 'win';
        else if (combinedTotal > lineValue) result = 'loss';
        else result = 'push';
      }
      
      return {
        result,
        stats: `${player1}: ${player1Stat}, ${player2}: ${player2Stat} (Combined: ${combinedTotal}, ${overUnder} ${line})`
      };
      
    } catch (error) {
      console.error('Error checking Combined prop result:', error);
      return { result: 'pending', stats: null };
    }
  };
  
  // Check first half/quarter results
  const checkFirstHalfResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, overUnder, total, favorite, spread } = participant;

    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }

    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.events || data.events.length === 0) {
        return { result: 'pending', stats: null };
      }

      let relevantGame = null;

      // IMPROVED: More strict game matching to avoid wrong games
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;

        if (competition.status.type.completed !== true) {
          continue;
        }

        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';

        // For first half bets, match BOTH teams to ensure correct game
        if (betType === 'First Half Total' || betType === 'First Inning Runs') {
          if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        } else if (betType === 'First Half Team Total') {
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        } else if (betType === 'First Half Spread' || betType === 'First Half Moneyline') {
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        }
      }
      
      if (!relevantGame) {
        return { result: 'pending', stats: null };
      }
      
      // Get detailed game data for period scores
      const gameId = relevantGame.event.id;
      const detailUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
      
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      const linescores = detailData.boxscore?.teams;
      if (!linescores || linescores.length < 2) {
        return { result: 'pending', stats: null };
      }
      
      // Calculate first half score
      const homeLineScore = linescores.find(t => t.homeAway === 'home');
      const awayLineScore = linescores.find(t => t.homeAway === 'away');
      
      if (!homeLineScore || !awayLineScore) {
        return { result: 'pending', stats: null };
      }
      
      // Get first half periods (quarters 1-2 for football/basketball, innings 1-5 for baseball)
      const periods = homeLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      const awayPeriods = awayLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      
      let firstHalfHomeScore = 0;
      let firstHalfAwayScore = 0;
      
      if (betType === 'First Inning Runs') {
        // First inning only
        firstHalfHomeScore = parseInt(periods[0]) || 0;
        firstHalfAwayScore = parseInt(awayPeriods[0]) || 0;
      } else {
        // First half (quarters 1-2 or periods 1-N)
        const halfPoint = Math.floor(periods.length / 2);
        for (let i = 0; i < halfPoint; i++) {
          firstHalfHomeScore += parseInt(periods[i]) || 0;
          firstHalfAwayScore += parseInt(awayPeriods[i]) || 0;
        }
      }
      
      if (betType === 'First Half Total' || betType === 'First Inning Runs') {
        const totalScore = firstHalfHomeScore + firstHalfAwayScore;
        const result = determineTotalResult(overUnder, total, totalScore);
        return {
          result,
          stats: `1H Total: ${totalScore}`
        };
      } else if (betType === 'First Half Team Total') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const teamTotal = teamIsHome ? firstHalfHomeScore : firstHalfAwayScore;
        const result = determineTotalResult(overUnder, total, teamTotal);
        return {
          result,
          stats: `1H Team Total: ${teamTotal}`
        };
      } else if (betType === 'First Half Spread') {
        const homeDisplay = homeLineScore.team.displayName;
        const awayDisplay = awayLineScore.team.displayName;
        const result = determineSpreadResult(team, favorite, spread,
          { team: { displayName: homeDisplay } }, { team: { displayName: awayDisplay } },
          firstHalfHomeScore, firstHalfAwayScore);
        return {
          result,
          stats: `1H: ${awayDisplay} ${firstHalfAwayScore} @ ${homeDisplay} ${firstHalfHomeScore}`
        };
      } else if (betType === 'First Half Moneyline') {
        const homeDisplay = homeLineScore.team.displayName;
        const awayDisplay = awayLineScore.team.displayName;
        const result = determineMoneylineResult(team,
          { team: { displayName: homeDisplay }, score: firstHalfHomeScore },
          { team: { displayName: awayDisplay }, score: firstHalfAwayScore });
        return {
          result,
          stats: `1H: ${awayDisplay} ${firstHalfAwayScore} @ ${homeDisplay} ${firstHalfHomeScore}`
        };
      }

      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking first half result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Check quarter results
  const checkQuarterResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, overUnder, total, quarter } = participant;
    
    // Only works for football
    if (sport !== 'NFL' && sport !== 'College Football') {
      return { result: 'pending', stats: null };
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    try {
      const formattedDate = gameDate.replace(/-/g, '');
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      let relevantGame = null;
      
      // IMPROVED: Match both teams for quarter bets
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        if (competition.status.type.completed !== true) {
          continue;
        }
        
        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';
        
        // Match game based on bet type - ensure both teams match for totals
        if (betType === 'Quarter Total') {
          if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        } else if (betType === 'Quarter Team Total' || betType === 'Quarter Moneyline') {
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            relevantGame = { competition, event };
            break;
          }
        }
      }
      
      if (!relevantGame) {
        return { result: 'pending', stats: null };
      }
      
      // Get detailed game data for quarter scores
      const gameId = relevantGame.event.id;
      const detailUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/summary?event=${gameId}`;
      
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json();
      
      const linescores = detailData.boxscore?.teams;
      if (!linescores || linescores.length < 2) {
        return { result: 'pending', stats: null };
      }
      
      const homeLineScore = linescores.find(t => t.homeAway === 'home');
      const awayLineScore = linescores.find(t => t.homeAway === 'away');
      
      if (!homeLineScore || !awayLineScore) {
        return { result: 'pending', stats: null };
      }
      
      const periods = homeLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      const awayPeriods = awayLineScore.statistics?.find(s => s.name === 'linescores')?.displayValue?.split(',') || [];
      
      const quarterMap = { '1st Quarter': 0, '2nd Quarter': 1, '3rd Quarter': 2, '4th Quarter': 3 };
      const quarterIndex = quarterMap[quarter];
      
      if (quarterIndex === undefined || quarterIndex >= periods.length) {
        return { result: 'pending', stats: null };
      }
      
      const quarterHomeScore = parseInt(periods[quarterIndex]) || 0;
      const quarterAwayScore = parseInt(awayPeriods[quarterIndex]) || 0;
      
      if (betType === 'Quarter Total') {
        const totalScore = quarterHomeScore + quarterAwayScore;
        const result = determineTotalResult(overUnder, total, totalScore);
        return {
          result,
          stats: `${quarter} Total: ${totalScore}`
        };
      } else if (betType === 'Quarter Team Total') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const teamTotal = teamIsHome ? quarterHomeScore : quarterAwayScore;
        const result = determineTotalResult(overUnder, total, teamTotal);
        return {
          result,
          stats: `${quarter} Team Total: ${teamTotal}`
        };
      } else if (betType === 'Quarter Moneyline') {
        const teamIsHome = matchTeamName(team, homeLineScore.team.displayName);
        const result = teamIsHome ? 
          (quarterHomeScore > quarterAwayScore ? 'win' : 'loss') :
          (quarterAwayScore > quarterHomeScore ? 'win' : 'loss');
        return {
          result,
          stats: `${quarter}: ${awayLineScore.team.displayName} ${quarterAwayScore} @ ${homeLineScore.team.displayName} ${quarterHomeScore}`
        };
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error checking quarter result:', error);
      return { result: 'pending', stats: null };
    }
  };

  // Main check game result function
  const checkGameResult = async (participant, gameDate) => {
    const { sport, betType, team, awayTeam, homeTeam, favorite, spread, overUnder, total } = participant;

    console.log('🔍 checkGameResult - betType:', betType, 'sport:', sport, 'team:', team);

    // Handle special bet types
    // Support both "Prop Bet" (legacy) and "Player Prop" (new)
    if (betType === 'Prop Bet' || betType === 'Player Prop') {
      console.log('✅ Detected Player Prop - calling checkPropBetResult');
      return await checkPropBetResult(participant, gameDate);
    }

    // Team Prop and Game Prop - these need specialized handling
    // For now, they're not auto-updatable (would need team-level stat tracking)
    if (betType === 'Team Prop' || betType === 'Game Prop') {
      console.log(`⚠️ ${betType} auto-update not yet implemented`);
      return { result: 'pending', stats: null };
    }

    if (betType === 'H2H Prop') {
      return await checkH2HPropResult(participant, gameDate);
    }

    if (betType === 'Either Prop') {
      return await checkEitherPropResult(participant, gameDate);
    }

    if (betType === 'Combined Prop') {
      return await checkCombinedPropResult(participant, gameDate);
    }
    
    if (['Quarter Moneyline', 'Quarter Total', 'Quarter Team Total'].includes(betType)) {
      return await checkQuarterResult(participant, gameDate);
    }
    
    if (['First Half Moneyline', 'First Half Spread', 'First Half Total', 'First Half Team Total', 'First Inning Runs'].includes(betType)) {
      return await checkFirstHalfResult(participant, gameDate);
    }
    
    const espnSport = getESPNSport(sport);
    if (!espnSport) {
      return { result: 'pending', stats: null };
    }
    
    // Unsupported sports
    if (['Golf', 'Rugby', 'UFC'].includes(sport)) {
      return { result: 'pending', stats: null };
    }

    try {
      const formattedDate = gameDate.replace(/-/g, '');
      // For college sports, add groups=50 to get ALL Division I games, not just Top 25
      const isCollegeSport = sport === 'College Basketball' || sport === 'College Football';
      const groupsParam = isCollegeSport ? '&groups=50' : '';
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard?dates=${formattedDate}${groupsParam}`;

      console.log('🔗 Fetching:', isCollegeSport ? 'All D-I games' : 'All games');
      const response = await fetch(url);
      const data = await response.json();

      console.log('📡 ESPN API returned', data.events?.length || 0, 'events for date', gameDate);
      
      if (!data.events || data.events.length === 0) {
        console.log('❌ No events found');
        return { result: 'pending', stats: null };
      }
      
      let relevantGame = null;
      
      // CRITICAL FIX: Improved game matching logic
      for (const event of data.events) {
        const competition = event.competitions[0];
        const competitors = competition.competitors;

        if (competition.status.type.completed !== true) {
          console.log('⏭️ Skipping incomplete game');
          continue;
        }

        const homeTeamName = competitors.find(c => c.homeAway === 'home')?.team.displayName || '';
        const awayTeamName = competitors.find(c => c.homeAway === 'away')?.team.displayName || '';

        console.log(`🏀 Checking game: ${awayTeamName} @ ${homeTeamName}`);

        // For totals, match BOTH teams to ensure correct game
        if (betType === 'Total') {
          console.log(`🎯 Total bet - Looking for: ${awayTeam} @ ${homeTeam}`);
          const awayMatch = matchTeamName(awayTeam, awayTeamName);
          const homeMatch = matchTeamName(homeTeam, homeTeamName);
          console.log(`   Away match (${awayTeam} vs ${awayTeamName}): ${awayMatch}`);
          console.log(`   Home match (${homeTeam} vs ${homeTeamName}): ${homeMatch}`);
          if (awayMatch && homeMatch) {
            relevantGame = competition;
            console.log('✅ MATCH FOUND!');
            break;
          }
        } else {
          // For spreads and moneylines, match the team
          if (matchTeamName(team, homeTeamName) || matchTeamName(team, awayTeamName)) {
            // ADDITIONAL CHECK: If we have away/home team info, verify it's the right matchup
            if (awayTeam && homeTeam) {
              if (matchTeamName(awayTeam, awayTeamName) && matchTeamName(homeTeam, homeTeamName)) {
                relevantGame = competition;
                break;
              }
            } else {
              relevantGame = competition;
              break;
            }
          }
        }
      }
      
      if (!relevantGame) {
        return { result: 'pending', stats: null };
      }
      
      const competitors = relevantGame.competitors;
      const homeComp = competitors.find(c => c.homeAway === 'home');
      const awayComp = competitors.find(c => c.homeAway === 'away');
      
      const homeScore = parseInt(homeComp.score);
      const awayScore = parseInt(awayComp.score);
      
      if (betType === 'Spread') {
        const result = determineSpreadResult(team, favorite, spread, homeComp, awayComp, homeScore, awayScore);
        return {
          result,
          stats: `${awayComp.team.displayName} ${awayScore} @ ${homeComp.team.displayName} ${homeScore}`
        };
      } else if (betType === 'Moneyline') {
        const result = determineMoneylineResult(team, homeComp, awayComp);
        return {
          result,
          stats: `${awayComp.team.displayName} ${awayScore} @ ${homeComp.team.displayName} ${homeScore}`
        };
      } else if (betType === 'Total') {
        const result = determineTotalResult(overUnder, total, homeScore + awayScore);
        return {
          result,
          stats: `Total: ${homeScore + awayScore}`
        };
      } else if (betType === 'Team Total') {
        const isHome = matchTeamName(team, homeComp.team.displayName);
        const teamScore = isHome ? homeScore : awayScore;
        const result = determineTotalResult(overUnder, total, teamScore);
        return {
          result,
          stats: `${team} scored ${teamScore}`
        };
      }
      
      return { result: 'pending', stats: null };
      
    } catch (error) {
      console.error('Error fetching game data:', error);
      return { result: 'pending', stats: null };
    }
  };

  /**
   * Helper to get the result/status from a pick (new schema)
   */
  const getPickResult = (pick) => pick.outcome?.status || '';

  /**
   * Helper to convert new-schema pick to flat format expected by checkGameResult
   * checkGameResult expects flat fields: team, playerTeam, spread, overUnder, etc.
   */
  const pickToParticipant = (pick) => {
    const participant = { ...pick };

    // For player props, entities[0] contains the player info
    if (pick.entities && pick.entities.length > 0) {
      const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
      if (primary) {
        if (primary.entityType === 'player') {
          // Player prop - set team field to player name (old schema confusion)
          participant.team = primary.name;
          participant.playerTeam = primary.team;
          participant.playerPosition = primary.position;
        } else {
          // Team bet
          participant.team = primary.name;
        }
      }

      // For H2H props, etc. with two players
      if (pick.entities.length > 1) {
        const opponent = pick.entities.find(e => e.role === 'opponent' || e.role === 'secondary');
        if (opponent) {
          participant.player2 = opponent.name;
          participant.player2Team = opponent.team;
          participant.player2Position = opponent.position;
        }
        // Also set player1 from primary
        if (primary) {
          participant.player1 = primary.name;
          participant.player1Team = primary.team;
          participant.player1Position = primary.position;
        }
      }

      // Game info for home/away teams
      if (pick.game) {
        participant.awayTeam = pick.game.awayTeam;
        participant.homeTeam = pick.game.homeTeam;
      }
    }

    // Line info
    if (pick.line) {
      if (pick.line.value !== undefined) {
        // Map line value to appropriate old field
        if (pick.betType?.includes('Spread')) {
          participant.spread = pick.line.value;
          participant.favorite = pick.line.direction === 'underdog' ? 'Dog' : 'Favorite';
        } else if (pick.betType?.includes('Total')) {
          participant.total = pick.line.value;
          participant.overUnder = pick.line.direction === 'over' ? 'Over' : 'Under';
        } else {
          participant.line = pick.line.value;
          participant.overUnder = pick.line.direction === 'over' ? 'Over' : 'Under';
        }
      }
      if (pick.line.statType) {
        participant.propType = pick.line.statType;
        participant.player1PropType = pick.line.statType;
        participant.player2PropType = pick.line.statType;
      }
      if (pick.line.odds) {
        participant.odds = pick.line.odds;
      }
    }

    return participant;
  };

  // Auto-update pending picks
  const autoUpdatePendingPicks = async (parlays, updateBrolay) => {
    try {
      setAutoUpdating(true);
      let updatedCount = 0;

      const parlaysToUpdate = parlays.filter(parlay => {
        if (!parlay.picks) return false;
        const picks = Object.values(parlay.picks);
        return picks.some(p => getPickResult(p) === 'pending');
      });

      for (const parlay of parlaysToUpdate) {
        let parlayUpdated = false;
        const picksObj = parlay.picks;
        const updatedPicks = { ...picksObj };

        for (const [pickId, pick] of Object.entries(picksObj)) {
          if (getPickResult(pick) !== 'pending') continue;

          try {
            // Convert to flat format for checkGameResult
            const participant = pickToParticipant(pick);
            const resultData = await checkGameResult(participant, parlay.date);

            if (resultData && resultData.result && resultData.result !== 'pending') {
              const { outcome: oldOutcome, ...cleanPick } = pick;
              updatedPicks[pickId] = {
                ...cleanPick,
                outcome: {
                  ...(oldOutcome || {}),
                  status: resultData.result,
                  actualStats: resultData.stats,
                  autoUpdated: true,
                  settledAt: new Date().toISOString()
                }
              };
              parlayUpdated = true;
              updatedCount++;
            }
          } catch (error) {
            console.error(`Error checking result for pick ${pickId}:`, error);
          }
        }

        if (parlayUpdated && parlay.id) {
          try {
            console.log('🔄 Attempting to update parlay:', parlay.id);
            console.log('📝 Update data:', { picks: updatedPicks });

            const result = await updateBrolay(parlay.id, {
              picks: updatedPicks
            });

            console.log('✅ Update result:', result);

            if (!result.success) {
              console.error('❌ Update failed:', result.error);
            }
          } catch (error) {
            console.error('💥 Error updating parlay in Firebase:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
          }
        } else {
          console.warn('⚠️ Parlay not updated - parlayUpdated:', parlayUpdated, 'id:', parlay.id);
        }
      }

      setAutoUpdating(false);

      return {
        success: true,
        updatedCount
      };

    } catch (error) {
      console.error('Error in auto-update:', error);
      setAutoUpdating(false);
      return {
        success: false,
        error: error.message
      };
    }
  };

  return {
    autoUpdating,
    checkGameResult,
    autoUpdatePendingPicks,
    matchTeamName,
    checkH2HPropResult,
    checkEitherPropResult,
    checkCombinedPropResult
  };
};
