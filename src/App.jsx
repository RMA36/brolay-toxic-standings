import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, Users, Award, AlertCircle, Loader } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const PASSWORD = 'manipulation';
  
  const [activeTab, setActiveTab] = useState('entry');
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);
  const [parlays, setParlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [newParlay, setNewParlay] = useState({
  date: new Date().toISOString().split('T')[0],
  betAmount: 10,
  totalPayout: 0,
  participants: {},
  placedBy: '',
  settled: false
});
  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'College Football', 'College Basketball', 'Other'];
  const betTypes = ['Spread', 'Moneyline', 'Total', 'Prop Bet'];

// Pre-loaded teams and common values
const preloadedTeams = {
  NFL: ['Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills', 'Carolina Panthers', 
        'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns', 'Dallas Cowboys', 'Denver Broncos',
        'Detroit Lions', 'Green Bay Packers', 'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars',
        'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
        'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants', 'New York Jets',
        'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers', 'Seattle Seahawks', 'Tampa Bay Buccaneers',
        'Tennessee Titans', 'Washington Commanders'],
  NBA: ['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
        'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors',
        'Houston Rockets', 'Indiana Pacers', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies',
        'Miami Heat', 'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
        'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers',
        'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'],
  MLB: ['Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox', 'Chicago Cubs',
        'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians', 'Colorado Rockies', 'Detroit Tigers',
        'Houston Astros', 'Kansas City Royals', 'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins',
        'Milwaukee Brewers', 'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
        'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants', 'Seattle Mariners',
        'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers', 'Toronto Blue Jays', 'Washington Nationals'],
  NHL: ['Anaheim Ducks', 'Arizona Coyotes', 'Boston Bruins', 'Buffalo Sabres', 'Calgary Flames',
        'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche', 'Columbus Blue Jackets', 'Dallas Stars',
        'Detroit Red Wings', 'Edmonton Oilers', 'Florida Panthers', 'Los Angeles Kings', 'Minnesota Wild',
        'Montreal Canadiens', 'Nashville Predators', 'New Jersey Devils', 'New York Islanders', 'New York Rangers',
        'Ottawa Senators', 'Philadelphia Flyers', 'Pittsburgh Penguins', 'San Jose Sharks', 'Seattle Kraken',
        'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs', 'Vancouver Canucks', 'Vegas Golden Knights',
        'Washington Capitals', 'Winnipeg Jets'],
  'College Football': ['Vanderbilt'],
  'College Basketball': ['Vanderbilt'],
  Soccer: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham',
           'Barcelona', 'Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Juventus', 'Inter Milan'],
  Other: []
};

const commonPropTypes = [
  'Passing Yards',
  'Passing Attempts',
  'Interceptions Thrown',
  'Rushing Yards',
  'Receiving Yards',
  'Rushing & Receiving Yards',
  'Total Touchdowns',
  'Passing Touchdowns',
  'Rushing Touchdowns',
  'Receptions',
  'Points',
  'Rebounds',
  'Assists',
  'Strikeouts',
  'Hits',
  'Home Runs',
  'RBIs',
  'Goals',
  'Saves',
  'Shots on Goal'
];
  useEffect(() => {
  if (authenticated) {
    // Set up real-time listener
    const parlaysCollection = collection(db, 'parlays');
    const unsubscribe = onSnapshot(parlaysCollection, (snapshot) => {
      const parlayList = snapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id
      }));
      setParlays(parlayList);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }
}, [authenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('brolay-auth', 'true');
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('brolay-auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('brolay-learned-data');
    if (stored) {
      const learned = JSON.parse(stored);
      setLearnedTeams(learned.teams || []);
      setLearnedPropTypes(learned.propTypes || []);
    }
  }, []);
  
  const loadParlays = async () => {
  try {
    setLoading(true);
    const parlaysCollection = collection(db, 'parlays');
    const parlaySnapshot = await getDocs(parlaysCollection);
    const parlayList = parlaySnapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id
    }));
    setParlays(parlayList);
  } catch (error) {
    console.error('Error loading parlays:', error);
    setParlays([]);
  } finally {
    setLoading(false);
  }
};
  
  const saveParlays = async (updatedParlays) => {
  try {
    setSaving(true);
    setParlays(updatedParlays);
    // Note: Individual operations (add/update/delete) will handle Firestore sync
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save data. Please try again.');
  } finally {
    setSaving(false);
  }
};
  
  const saveLearnedData = (teams, propTypes) => {
    localStorage.setItem('brolay-learned-data', JSON.stringify({
      teams: teams,
      propTypes: propTypes
    }));
  };
  
  const addParticipant = () => {
  const participantId = Object.keys(newParlay.participants).length;
  setNewParlay({
    ...newParlay,
    participants: {
      ...newParlay.participants,
      [participantId]: {
        player: '',
        sport: 'NFL',
        team: '',
        awayTeam: '',
        homeTeam: '',
        betType: 'Spread',
        favorite: 'Favorite',
        spread: '',
        total: '',
        overUnder: 'Over',
        propType: '',
        line: '',
        odds: '',
        result: 'pending'
      }
    }
  });
};
  const updateParticipant = (id, field, value) => {
    setNewParlay({
      ...newParlay,
      participants: {
        ...newParlay.participants,
        [id]: {
          ...newParlay.participants[id],
          [field]: value
        }
      }
    });
  };

const getTeamSuggestions = (input, sport) => {
  if (!input || input.length < 2) return [];
  
  const inputLower = input.toLowerCase();
  const preloaded = preloadedTeams[sport] || [];
  const allTeams = [...new Set([...preloaded, ...learnedTeams])];
  
  return allTeams
    .filter(team => team.toLowerCase().includes(inputLower))
    .slice(0, 8);
};

const getPropTypeSuggestions = (input) => {
  if (!input || input.length < 2) return [];
  
  const inputLower = input.toLowerCase();
  const allPropTypes = [...new Set([...commonPropTypes, ...learnedPropTypes])];
  
  return allPropTypes
    .filter(prop => prop.toLowerCase().includes(inputLower))
    .slice(0, 8);
};

const handleTeamInput = (id, value, sport) => {
  updateParticipant(id, 'team', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
};

const handlePropTypeInput = (id, value) => {
  updateParticipant(id, 'propType', value);
  const suggestions = getPropTypeSuggestions(value);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`prop-${id}`]: suggestions.length > 0 });
};

const handleAwayTeamInput = (id, value, sport) => {
  updateParticipant(id, 'awayTeam', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`awayTeam-${id}`]: suggestions.length > 0 });
};

const handleHomeTeamInput = (id, value, sport) => {
  updateParticipant(id, 'homeTeam', value);
  const suggestions = getTeamSuggestions(value, sport);
  setSuggestions(suggestions);
  setShowSuggestions({ ...showSuggestions, [`homeTeam-${id}`]: suggestions.length > 0 });
};
  
const selectSuggestion = (id, field, value) => {
  updateParticipant(id, field, value);
  setShowSuggestions({});
  setSuggestions([]);
};
  
  const removeParticipant = (id) => {
    const updated = { ...newParlay.participants };
    delete updated[id];
    setNewParlay({ ...newParlay, participants: updated });
  };

  const submitParlay = async () => {
  const participantCount = Object.keys(newParlay.participants).length;
  if (participantCount < 3) {
    alert('Minimum 3 participants required');
    return;
  }
  
  const hasEmptyPlayer = Object.values(newParlay.participants).some(p => !p.player);
  if (hasEmptyPlayer) {
    alert('Please select a player for all picks');
    return;
  }
  
  const parlayWithId = {
    ...newParlay,
    id: Date.now(),
    totalParticipants: participantCount
  };
  
  // Learn from new entries
  const newTeams = [...learnedTeams];
  const newPropTypes = [...learnedPropTypes];
  
  Object.values(newParlay.participants).forEach(p => {
    if (p.team && !newTeams.includes(p.team)) {
      newTeams.push(p.team);
    }
    if (p.propType && !newPropTypes.includes(p.propType)) {
      newPropTypes.push(p.propType);
    }
  });
  
  setLearnedTeams(newTeams);
  setLearnedPropTypes(newPropTypes);
  saveLearnedData(newTeams, newPropTypes);
  
  try {
    // Save to Firebase
    const parlaysCollection = collection(db, 'parlays');
    const docRef = await addDoc(parlaysCollection, parlayWithId);
    
    const updatedParlays = [...parlays, { ...parlayWithId, firestoreId: docRef.id }];
    setParlays(updatedParlays);
  } catch (error) {
    console.error('Error adding parlay:', error);
    alert('Failed to save parlay. Please try again.');
  }
  
  setNewParlay({
    date: new Date().toISOString().split('T')[0],
    betAmount: 10,
    totalPayout: 0,
    participants: {},
    placedBy: '',
    settled: false
  });
};
    
  const updateParlayResult = async (parlayId, participantId, newResult) => {
  const updatedParlays = parlays.map(parlay => {
    if (parlay.id === parlayId) {
      return {
        ...parlay,
        participants: {
          ...parlay.participants,
          [participantId]: {
            ...parlay.participants[participantId],
            result: newResult
          }
        }
      };
    }
    return parlay;
  });
  
  setParlays(updatedParlays);
  
  // Update in Firebase
  const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
  if (parlayToUpdate && parlayToUpdate.firestoreId) {
    try {
      const parlayDoc = doc(db, 'parlays', parlayToUpdate.firestoreId);
      await updateDoc(parlayDoc, {
        participants: parlayToUpdate.participants
      });
    } catch (error) {
      console.error('Error updating parlay:', error);
    }
  }
};
  
  const toggleSettlement = async (parlayId) => {
  const updatedParlays = parlays.map(parlay => {
    if (parlay.id === parlayId) {
      return { ...parlay, settled: !parlay.settled };
    }
    return parlay;
  });
  
  setParlays(updatedParlays);
  
  // Update in Firebase
  const parlayToUpdate = updatedParlays.find(p => p.id === parlayId);
  if (parlayToUpdate && parlayToUpdate.firestoreId) {
    try {
      const parlayDoc = doc(db, 'parlays', parlayToUpdate.firestoreId);
      await updateDoc(parlayDoc, {
        settled: parlayToUpdate.settled
      });
    } catch (error) {
      console.error('Error updating settlement:', error);
    }
  }
};
  
  const deleteParlay = async (parlayId) => {
  if (window.confirm('Are you sure you want to delete this parlay?')) {
    const parlayToDelete = parlays.find(p => p.id === parlayId);
    const updatedParlays = parlays.filter(p => p.id !== parlayId);
    setParlays(updatedParlays);
    
    // Delete from Firebase
    if (parlayToDelete && parlayToDelete.firestoreId) {
      try {
        const parlayDoc = doc(db, 'parlays', parlayToDelete.firestoreId);
        await deleteDoc(parlayDoc);
      } catch (error) {
        console.error('Error deleting parlay:', error);
      }
    }
  }
};
  const calculateStats = () => {
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
        byBetType: {}
      };
    });

    parlays.forEach(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const parlayWon = losers.length === 0 && winners.length > 0;
      const and1 = losers.length === 1 && winners.length === participants.length - 1;

      participants.forEach(participant => {
        if (!participant.player || participant.player === '') return;
        
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

        if (participant.result === 'win') {
          playerStats.wins++;
          playerStats.bySport[participant.sport].wins++;
          playerStats.byBetType[participant.betType].wins++;
          
          if (parlayWon) {
            const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
            playerStats.moneyWon += netProfit / winners.length;
          }
        } else if (participant.result === 'loss') {
          playerStats.losses++;
          playerStats.bySport[participant.sport].losses++;
          playerStats.byBetType[participant.betType].losses++;
          
          if (and1) {
            playerStats.and1s++;
            playerStats.and1Cost += parlay.betAmount * participants.length;
            playerStats.moneyLost += parlay.betAmount * participants.length;
          } else {
            playerStats.moneyLost += (parlay.betAmount * participants.length) / losers.length;
          }
        }
      });
    });

    return stats;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2">Brolay Toxic Standings</h1>
          <p className="text-gray-600 text-center mb-6">Enter password to access</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading your parlays...</p>
        </div>
      </div>
    );
  }

  const renderEntry = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">New Brolay Entry</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium mb-1">Bet Amount (per person)</label>
    <input
      type="number"
      value={newParlay.betAmount}
      onChange={(e) => setNewParlay({...newParlay, betAmount: Number(e.target.value)})}
      className="w-full px-3 py-2 border rounded"
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Total Payout</label>
    <input
      type="number"
      value={newParlay.totalPayout || ''}
      onChange={(e) => {
        const payout = Number(e.target.value) || 0;
        setNewParlay({...newParlay, totalPayout: payout});
      }}
      className="w-full px-3 py-2 border rounded"
      placeholder="Enter total payout"
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Net Profit</label>
    <input
      type="number"
      value={Math.max(0, (newParlay.totalPayout || 0) - (newParlay.betAmount * Object.keys(newParlay.participants).length))}
      onChange={(e) => {
        const netProfit = Number(e.target.value) || 0;
        const totalRisk = newParlay.betAmount * Object.keys(newParlay.participants).length;
        const calculatedPayout = netProfit + totalRisk;
        setNewParlay({...newParlay, totalPayout: calculatedPayout});
      }}
      className="w-full px-3 py-2 border rounded"
      placeholder="Or enter net profit"
    />
  </div>
</div>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Picks</h3>
            <button
              onClick={addParticipant}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <PlusCircle size={20} />
              Add Pick
            </button>
          </div>

          {Object.entries(newParlay.participants).map(([id, participant]) => (
  <div key={id} className="border rounded p-4 bg-gray-50">
    <div className="grid grid-cols-4 gap-3 mb-3">
      <div>
        <label className="block text-xs font-medium mb-1">Big Guy</label>
        <select
          value={participant.player}
          onChange={(e) => updateParticipant(id, 'player', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          <option value="">Select</option>
          {players.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Sport</label>
        <select
          value={participant.sport}
          onChange={(e) => updateParticipant(id, 'sport', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Bet Type</label>
        <select
          value={participant.betType}
          onChange={(e) => updateParticipant(id, 'betType', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          <option value="Spread">Spread</option>
          <option value="Moneyline">Moneyline</option>
          <option value="Total">Total</option>
          <option value="Prop Bet">Prop Bet</option>
        </select>
      </div>
      
      {participant.betType !== 'Total' && (
        <div className="relative">
          <label className="block text-xs font-medium mb-1">Team/Player</label>
          <input
            type="text"
            value={participant.team}
            onChange={(e) => handleTeamInput(id, e.target.value, participant.sport)}
            onFocus={(e) => handleTeamInput(id, e.target.value, participant.sport)}
            onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Start typing..."
          />
          {showSuggestions[`team-${id}`] && suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(id, 'team', suggestion)}
                  className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {participant.betType === 'Total' && (
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <label className="block text-xs font-medium mb-1">Away Team</label>
          <input
            type="text"
            value={participant.awayTeam || ''}
            onChange={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
            onFocus={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
            onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Start typing..."
          />
          {showSuggestions[`awayTeam-${id}`] && suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(id, 'awayTeam', suggestion)}
                  className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <label className="block text-xs font-medium mb-1">Home Team</label>
          <input
            type="text"
            value={participant.homeTeam || ''}
            onChange={(e) => handleHomeTeamInput(id, e.target.value, participant.sport)}
            onFocus={(e) => handleHomeTeamInput(id, e.target.value, participant.sport)}
            onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Start typing..."
          />
          {showSuggestions[`homeTeam-${id}`] && suggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(id, 'homeTeam', suggestion)}
                  className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    <div className="grid grid-cols-4 gap-3 mb-3">
      {participant.betType === 'Spread' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Favorite/Dog</label>
            <select
              value={participant.favorite || 'Favorite'}
              onChange={(e) => updateParticipant(id, 'favorite', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              <option value="Favorite">Favorite</option>
              <option value="Dog">Dog</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Spread</label>
            <input
              type="text"
              value={participant.spread || ''}
              onChange={(e) => updateParticipant(id, 'spread', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="e.g., 7.5"
            />
          </div>
        </>
      )}

      {participant.betType === 'Total' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateParticipant(id, 'overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Total</label>
            <input
              type="text"
              value={participant.total || ''}
              onChange={(e) => updateParticipant(id, 'total', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="e.g., 45.5"
            />
          </div>
        </>
      )}

      {participant.betType === 'Prop Bet' && (
        <>
          <div className="relative">
            <label className="block text-xs font-medium mb-1">Prop Type</label>
            <input
              type="text"
              value={participant.propType || ''}
              onChange={(e) => handlePropTypeInput(id, e.target.value)}
              onFocus={(e) => handlePropTypeInput(id, e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="Start typing..."
            />
            {showSuggestions[`prop-${id}`] && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectSuggestion(id, 'propType', suggestion)}
                    className="px-2 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Over/Under</label>
            <select
              value={participant.overUnder || 'Over'}
              onChange={(e) => updateParticipant(id, 'overUnder', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Line</label>
            <input
              type="text"
              value={participant.line || ''}
              onChange={(e) => updateParticipant(id, 'line', e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="e.g., 255.5"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium mb-1">Odds (Optional)</label>
          <input
            type="text"
            value={participant.odds || ''}
            onChange={(e) => updateParticipant(id, 'odds', e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="e.g., -120 (Optional)"
          />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Result</label>
        <select
          value={participant.result}
          onChange={(e) => updateParticipant(id, 'result', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          <option value="pending">Pending</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
        </select>
      </div>
    </div>
    <button
      onClick={() => removeParticipant(id)}
      className="text-red-600 text-sm hover:text-red-800"
    >
      Remove Pick
    </button>
  </div>
))}
        </div>

        <button
          onClick={submitParlay}
          disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Submit Parlay'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Recent Brolays (Edit Results)</h3>
        <div className="space-y-3">
          {parlays.slice(-5).reverse().map(parlay => {
            const participants = Object.values(parlay.participants);
            const losers = participants.filter(p => p.result === 'loss');
            const winners = participants.filter(p => p.result === 'win');
            const won = losers.length === 0 && winners.length > 0;
            const and1 = losers.length === 1 && winners.length === participants.length - 1;
            
            return (
                <div key={parlay.id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">
                      {parlay.date} - {
                        // Determine parlay type
                        (() => {
                          const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
                          if (sports.length > 1) return 'Multi-Sport Brolay';
                          if (sports.length === 1) return `${sports[0]} Brolay`;
                          return 'Brolay';
                        })()
                      }
                    </div>
                    <div className="text-sm text-gray-600">
                      {participants.length} picks • ${parlay.betAmount * participants.length} Risked • ${parlay.totalPayout || 0} Total Payout • ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {won && <span className="text-green-600 font-semibold">WON</span>}
                    {!won && losers.length > 0 && (
                      <span className="text-red-600 font-semibold">
                        LOST {and1 && '(And-1)'}
                      </span>
                    )}
                    <button
                      onClick={() => deleteParlay(parlay.id)}
                      className="text-red-600 text-sm hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(parlay.participants).map(([pid, participant]) => (
                    <div key={pid} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>
                        <strong>{participant.player}</strong> - {participant.sport} - {
                        participant.betType === 'Total' ? `${participant.awayTeam} @ ${participant.homeTeam}` : participant.team
                        } {
                        participant.betType === 'Spread' ? `${participant.favorite} ${participant.spread}` :
                        participant.betType === 'Total' ? `${participant.overUnder} ${participant.total}` :
                        participant.betType === 'Prop Bet' ? `${participant.propType} ${participant.overUnder} ${participant.line}` :
                        'Moneyline'
                        } ({participant.betType})
                      </span>
                      <select
                        value={participant.result}
                        onChange={(e) => updateParlayResult(parlay.id, pid, e.target.value)}
                        disabled={saving}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                      </select>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={parlay.settled}
                      onChange={() => toggleSettlement(parlay.id)}
                      disabled={saving}
                    />
                    <span>Payments settled</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderIndividualDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Individual Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map(player => {
          const playerStats = stats[player];
          const winPct = playerStats.totalPicks > 0 
            ? ((playerStats.wins / playerStats.totalPicks) * 100).toFixed(1)
            : '0.0';
          const netMoney = playerStats.moneyWon - playerStats.moneyLost;

          return (
            <div key={player} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">{player}</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Record:</span>
                  <span className="font-semibold">{playerStats.wins}-{playerStats.losses}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Win %:</span>
                  <span className="font-semibold">{winPct}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Net Money:</span>
                  <span className={`font-semibold ${netMoney >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netMoney.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">And-1s:</span>
                  <span className="font-semibold text-red-600">{playerStats.and1s}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">And-1 Cost:</span>
                  <span className="font-semibold text-red-600">
                    ${playerStats.and1Cost.toFixed(2)}
                  </span>
                </div>
              </div>

              {Object.keys(playerStats.bySport).length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">By Sport:</h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(playerStats.bySport).map(([sport, data]) => (
                      <div key={sport} className="flex justify-between">
                        <span>{sport}:</span>
                        <span>{data.wins}-{data.losses} ({data.total > 0 ? ((data.wins/data.total)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(playerStats.byBetType).length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold text-sm mb-2">By Bet Type:</h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(playerStats.byBetType).map(([type, data]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type}:</span>
                        <span>{data.wins}-{data.losses} ({data.total > 0 ? ((data.wins/data.total)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGroupDashboard = () => {
    const totalParlays = parlays.length;
    const wonParlays = parlays.filter(p => {
      const participants = Object.values(p.participants);
      const losers = participants.filter(part => part.result === 'loss');
      return losers.length === 0 && participants.some(part => part.result === 'win');
    }).length;
    const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

    const bySport = {};
parlays.forEach(p => {
  const participants = Object.values(p.participants);
  
  participants.forEach(part => {
    if (part.sport) {
      if (!bySport[part.sport]) {
        bySport[part.sport] = { total: 0, won: 0 };
      }
      bySport[part.sport].total++;
      if (part.result === 'win') {
        bySport[part.sport].won++;
      }
    }
  });
});
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Group Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-600" size={24} />
              <h3 className="text-lg font-semibold">Total Parlays</h3>
            </div>
            <p className="text-3xl font-bold">{totalParlays}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-600" size={24} />
              <h3 className="text-lg font-semibold">Parlays Won</h3>
            </div>
            <p className="text-3xl font-bold">{wonParlays}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-purple-600" size={24} />
              <h3 className="text-lg font-semibold">Win Percentage</h3>
            </div>
            <p className="text-3xl font-bold">{groupWinPct}%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Performance by Sport</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(bySport).map(([sport, data]) => (
              <div key={sport} className="border rounded p-3">
                <div className="font-semibold">{sport}</div>
                <div className="text-sm text-gray-600">
                  {data.won}-{data.total - data.won} ({data.total > 0 ? ((data.won/data.total)*100).toFixed(0) : 0}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Recent Brolays</h3>
          <div className="space-y-2">
            {parlays.slice(-10).reverse().map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const won = losers.length === 0 && winners.length > 0;
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              
              return (
                <div key={parlay.id} className="border rounded p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">
  {parlay.date} - {
    (() => {
      const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
      if (sports.length > 1) return 'Multi-Sport Brolay';
      if (sports.length === 1) return `${sports[0]} Brolay`;
      return 'Brolay';
    })()
  }
</div>
<div className="text-sm text-gray-600">
  {participants.length} picks • ${parlay.betAmount * participants.length} Risked • ${parlay.totalPayout || 0} Total Payout • ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
  {parlay.settled && <span className="ml-2 text-green-600">✓ Settled</span>}
</div>
                  </div>
                  <div className="text-right">
                    {won && <span className="text-green-600 font-semibold">WON</span>}
                    {!won && losers.length > 0 && (
                      <span className="text-red-600 font-semibold">
                        LOST {and1 && '(And-1)'}
                      </span>
                    )}
                    {losers.length === 0 && participants.every(p => p.result === 'pending') && (
                      <span className="text-gray-500 font-semibold">PENDING</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPayments = () => {
  const unsettledParlays = parlays.filter(p => !p.settled);
  const lostParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  });
  const wonParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  });

  // Calculate who owes who
  const payments = [];
  
  // Lost parlays - winners get paid by placer
  lostParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const losers = participants.filter(p => p.result === 'loss');
    const and1 = losers.length === 1;
    const totalAmount = parlay.betAmount * participants.length;
    const amountPerLoser = and1 ? totalAmount : totalAmount / losers.length;
    
    losers.forEach(loser => {
      payments.push({
        from: loser.player,
        to: parlay.placedBy || 'Placer',
        amount: amountPerLoser,
        parlayId: parlay.id,
        parlayDate: parlay.date,
        type: 'loss',
        and1: and1 && losers.length === 1 && losers[0].player === loser.player
      });
    });
  });
  
  // Won parlays - placer pays winners
  wonParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
    const amountPerWinner = netProfit / winners.length;
    
    winners.forEach(winner => {
      payments.push({
        from: parlay.placedBy || 'Placer',
        to: winner.player,
        amount: amountPerWinner,
        parlayId: parlay.id,
        parlayDate: parlay.date,
        type: 'win'
      });
    });
  });

  // Calculate net positions (who owes who overall)
const allPlayers = ['Management', 'CD', '914', 'Junior', 'Jacoby'];
const netPositions = {};
allPlayers.forEach(player => {
  netPositions[player] = {};
  allPlayers.forEach(otherPlayer => {
    if (player !== otherPlayer) {
      netPositions[player][otherPlayer] = 0;
    }
  });
});
    
  payments.forEach(payment => {
    if (payment.from && payment.to && payment.from !== payment.to) {
      netPositions[payment.from][payment.to] = (netPositions[payment.from][payment.to] || 0) + payment.amount;
    }
  });

  // Simplify: if A owes B and B owes A, net them out
const simplifiedPayments = [];
allPlayers.forEach(player1 => {
  allPlayers.forEach(player2 => {
      if (player1 < player2) { // Only process each pair once
        const player1OwesPlayer2 = netPositions[player1][player2] || 0;
        const player2OwesPlayer1 = netPositions[player2][player1] || 0;
        const netAmount = player1OwesPlayer2 - player2OwesPlayer1;
        
        if (Math.abs(netAmount) > 0.01) { // Ignore tiny amounts due to rounding
          simplifiedPayments.push({
            from: netAmount > 0 ? player1 : player2,
            to: netAmount > 0 ? player2 : player1,
            amount: Math.abs(netAmount)
          });
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payment Tracker</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-600 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-800">Outstanding Payments</h3>
            <p className="text-sm text-yellow-700">
              {lostParlays.length} lost brolay(s) • {wonParlays.length} won brolay(s) need settlement
            </p>
          </div>
        </div>
      </div>

      {/* Who Owes Who Summary Table */}
      {simplifiedPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">💰 Who Owes Who (Net Summary)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-4">From</th>
                  <th className="text-left py-2 px-4">To</th>
                  <th className="text-right py-2 px-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {simplifiedPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-red-600">{payment.from}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{payment.to}</td>
                    <td className="py-3 px-4 text-right font-bold text-lg">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lost Brolays */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-3 text-red-600">❌ Lost Brolays</h3>
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const and1 = losers.length === 1;
              const amountPerLoser = and1 
                ? parlay.betAmount * participants.length 
                : (parlay.betAmount * participants.length) / losers.length;

              return (
                <div key={parlay.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{parlay.date}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-600 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">Losers pay {parlay.placedBy}: </span>
                    {losers.map(loser => `${loser.player} ($${amountPerLoser.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Mark as Settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Won Brolays */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-3 text-green-600">✅ Won Brolays</h3>
        <div className="space-y-3">
          {wonParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
          ) : (
            wonParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const winners = participants.filter(p => p.result === 'win');
              const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
              const amountPerWinner = netProfit / winners.length;

              return (
                <div key={parlay.id} className="border rounded p-4 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{parlay.date}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-600">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">{parlay.placedBy} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Mark as Settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recently Settled */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-3">Recently Settled</h3>
        <div className="space-y-2">
          {parlays.filter(p => p.settled).slice(-5).reverse().map(parlay => {
            const participants = Object.values(parlay.participants);
            const losers = participants.filter(p => p.result === 'loss');
            const winners = participants.filter(p => p.result === 'win');
            const won = losers.length === 0 && winners.length > 0;
            
            return (
              <div key={parlay.id} className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{parlay.date}</div>
                    <div className="text-xs text-gray-600">
                      {won ? `Winners paid by ${parlay.placedBy}: ${winners.map(w => w.player).join(', ')}` 
                           : `Losers paid ${parlay.placedBy}: ${losers.map(l => l.player).join(', ')}`}
                    </div>
                  </div>
                  <span className="text-green-600 text-sm">✓ Settled</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold">Brolay Toxic Standings</h1>
        <p className="text-blue-100">Track your group's betting performance</p>
        {saving && (
          <div className="mt-2 text-sm">
            <Loader className="inline animate-spin mr-2" size={16} />
            Saving changes...
          </div>
        )}
      </div>

      <div className="container mx-auto p-6">
        <div className="mb-6 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'entry' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            New Brolay
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'individual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Individual Stats
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'group' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Group Stats
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
              activeTab === 'payments' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Payments
          </button>
        </div>

        {activeTab === 'entry' && renderEntry()}
        {activeTab === 'individual' && renderIndividualDashboard()}
        {activeTab === 'group' && renderGroupDashboard()}
        {activeTab === 'payments' && renderPayments()}
      </div>
    </div>
  );
};

export default App;
