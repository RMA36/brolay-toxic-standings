import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, Users, Award, AlertCircle, Loader, Menu, X } from 'lucide-react';

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
  const [csvInput, setCsvInput] = useState('');
  const [players] = useState(['Management', 'CD', '914', 'Junior', 'Jacoby']);
  const [parlays, setParlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [learnedTeams, setLearnedTeams] = useState([]);
  const [learnedPropTypes, setLearnedPropTypes] = useState([]);
  const [editingParlay, setEditingParlay] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    player: '',
    sport: '',
    placedBy: '',
    minPayout: '',
    maxPayout: '',
    result: ''
  });
  const [newParlay, setNewParlay] = useState({
  date: new Date().toISOString().split('T')[0],
  betAmount: 10,
  totalPayout: 0,
  participants: {},
  placedBy: '',
  settled: false
});
// Mobile-specific states
const [isMobile, setIsMobile] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [pullStartY, setPullStartY] = useState(0);
const [pullDistance, setPullDistance] = useState(0);

// Detect mobile device
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);
  
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

// Refresh data when switching tabs
useEffect(() => {
  if (authenticated) {
    loadParlays();
  }
}, [activeTab, authenticated]);
  
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

const handleTouchStart = (e) => {
  if (!isMobile || window.scrollY > 0) return;
  setPullStartY(e.touches[0].clientY);
};

const handleTouchMove = (e) => {
  if (!isMobile || window.scrollY > 0 || pullStartY === 0) return;
  const currentY = e.touches[0].clientY;
  const distance = Math.max(0, currentY - pullStartY);
  setPullDistance(Math.min(distance, 100));
};

const handleTouchEnd = async () => {
  if (!isMobile) return;
  if (pullDistance > 80) {
    setRefreshing(true);
    await loadParlays();
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }
  setPullDistance(0);
  setPullStartY(0);
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

const applyFilters = (parlaysList) => {
  return parlaysList.filter(parlay => {
    // Date range filter
    if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
    if (filters.dateTo && parlay.date > filters.dateTo) return false;
    
    // Placed By filter
    if (filters.placedBy && parlay.placedBy !== filters.placedBy) return false;
    
    // Total Payout range filter
    const payout = parlay.totalPayout || 0;
    if (filters.minPayout && payout < Number(filters.minPayout)) return false;
    if (filters.maxPayout && payout > Number(filters.maxPayout)) return false;
    
    // Player filter (check if any participant matches)
    if (filters.player) {
      const hasPlayer = Object.values(parlay.participants || {}).some(p => p.player === filters.player);
      if (!hasPlayer) return false;
    }
    
    // Sport filter (check if any participant matches)
    if (filters.sport) {
      const hasSport = Object.values(parlay.participants || {}).some(p => p.sport === filters.sport);
      if (!hasSport) return false;
    }
    
    // Result filter (check if any participant matches)
    if (filters.result) {
      const hasResult = Object.values(parlay.participants || {}).some(p => p.result === filters.result);
      if (!hasResult) return false;
    }
    
    return true;
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

const saveEditedParlay = async (editedParlay) => {
  try {
    setSaving(true);
    
    // Update in local state
    const updatedParlays = parlays.map(p => 
      p.id === editedParlay.id ? editedParlay : p
    );
    setParlays(updatedParlays);
    
    // Update in Firebase
    if (editedParlay.firestoreId) {
      const parlayDoc = doc(db, 'parlays', editedParlay.firestoreId);
      await updateDoc(parlayDoc, editedParlay);
    }
    
    setEditingParlay(null);
  } catch (error) {
    console.error('Error updating parlay:', error);
    alert('Failed to update parlay. Please try again.');
  } finally {
    setSaving(false);
  }
};

const renderEditModal = () => {
  if (!editingParlay) return null;

  const participants = editingParlay.participants || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: isMobile ? '100%' : '1024px' }}>
        <div className="p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Edit Brolay</h2>
          
          {/* Brolay Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={editingParlay.date}
                onChange={(e) => setEditingParlay({...editingParlay, date: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Placed By</label>
              <select
                value={editingParlay.placedBy || ''}
                onChange={(e) => setEditingParlay({...editingParlay, placedBy: e.target.value})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                <option value="">Select Big Guy</option>
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Bet Amount (per person)</label>
              <input
                type="number"
                value={editingParlay.betAmount}
                onChange={(e) => setEditingParlay({...editingParlay, betAmount: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Payout</label>
              <input
                type="number"
                value={editingParlay.totalPayout || ''}
                onChange={(e) => {
                  const payout = Number(e.target.value) || 0;
                  setEditingParlay({...editingParlay, totalPayout: payout});
                }}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Net Profit</label>
              <input
                type="number"
                value={Math.max(0, (editingParlay.totalPayout || 0) - (editingParlay.betAmount * Object.keys(participants).length))}
                onChange={(e) => {
                  const netProfit = Number(e.target.value) || 0;
                  const totalRisk = editingParlay.betAmount * Object.keys(participants).length;
                  const calculatedPayout = netProfit + totalRisk;
                  setEditingParlay({...editingParlay, totalPayout: calculatedPayout});
                }}
                className="w-full px-3 py-2 border rounded text-base"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
          </div>

          {/* Picks */}
          <h3 className="text-base md:text-lg font-semibold mb-3">Picks</h3>
          <div className="space-y-4 mb-6">
            {Object.entries(participants).map(([id, participant]) => (
              <div key={id} className="border rounded p-3 md:p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Big Guy</label>
                    <select
                      value={participant.player}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].player = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">Select</option>
                      {players.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Sport</label>
                    <select
                      value={participant.sport}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].sport = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      {sports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Bet Type</label>
                    <select
                      value={participant.betType}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].betType = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="Spread">Spread</option>
                      <option value="Moneyline">Moneyline</option>
                      <option value="Total">Total</option>
                      <option value="Prop Bet">Prop Bet</option>
                    </select>
                  </div>
                  
                  {participant.betType !== 'Total' && (
                    <div>
                      <label className="block text-xs font-medium mb-1">Team/Player</label>
                      <input
                        type="text"
                        value={participant.team || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].team = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  )}
                </div>

                {participant.betType === 'Total' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Away Team</label>
                      <input
                        type="text"
                        value={participant.awayTeam || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].awayTeam = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Home Team</label>
                      <input
                        type="text"
                        value={participant.homeTeam || ''}
                        onChange={(e) => {
                          const updated = {...editingParlay};
                          updated.participants[id].homeTeam = e.target.value;
                          setEditingParlay(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-base"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {participant.betType === 'Spread' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Favorite/Dog</label>
                        <select
                          value={participant.favorite || 'Favorite'}
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].favorite = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].spread = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].overUnder = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].total = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
                        />
                      </div>
                    </>
                  )}

                  {participant.betType === 'Prop Bet' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Prop Type</label>
                        <input
                          type="text"
                          value={participant.propType || ''}
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].propType = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Over/Under</label>
                        <select
                          value={participant.overUnder || 'Over'}
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].overUnder = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
                          onChange={(e) => {
                            const updated = {...editingParlay};
                            updated.participants[id].line = e.target.value;
                            setEditingParlay(updated);
                          }}
                          className="w-full px-2 py-1 border rounded text-base"
                          style={{ fontSize: isMobile ? '16px' : '14px' }}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-medium mb-1">Odds (Optional)</label>
                    <input
                      type="text"
                      value={participant.odds || ''}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].odds = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="e.g., -120 (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Result</label>
                    <select
                      value={participant.result}
                      onChange={(e) => {
                        const updated = {...editingParlay};
                        updated.participants[id].result = e.target.value;
                        setEditingParlay(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-base"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="push">Push</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setEditingParlay(null)}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Cancel
            </button>
            <button
              onClick={() => saveEditedParlay(editingParlay)}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
  
const importFromCSV = async (csvText) => {
  try {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const importedParlays = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Build participants object
      const participants = {};
      let pickNum = 0;
      
      for (let j = 1; j <= 5; j++) {
        if (row[`pick${j}_player`]) {
          participants[pickNum] = {
            player: row[`pick${j}_player`],
            sport: row[`pick${j}_sport`],
            team: row[`pick${j}_team`] || '',
            betType: row[`pick${j}_betType`],
            
            // Spread fields
            favorite: row[`pick${j}_favorite`] || 'Favorite',
            spread: row[`pick${j}_spread`] || '',
            
            // Total fields
            awayTeam: row[`pick${j}_awayTeam`] || '',
            homeTeam: row[`pick${j}_homeTeam`] || '',
            overUnder: row[`pick${j}_overUnder`] || 'Over',
            total: row[`pick${j}_total`] || '',
            
            // Prop fields
            propType: row[`pick${j}_propType`] || '',
            line: row[`pick${j}_line`] || '',
            
            // Common fields
            odds: row[`pick${j}_odds`] || '',
            result: row[`pick${j}_result`] || 'pending'
          };
          pickNum++;
        }
      }
      
      const parlay = {
        date: row.date,
        betAmount: Number(row.betAmount) || 10,
        totalPayout: Number(row.totalPayout) || 0,
        placedBy: row.placedBy || '', // Optional
        settled: row.settled === 'true' || row.settled === 'TRUE',
        participants: participants,
        id: Date.now() + i + Math.random(), // Ensure unique IDs
        totalParticipants: Object.keys(participants).length
      };
      
      importedParlays.push(parlay);
    }
    
    // Save all to Firebase
    setSaving(true);
    for (const parlay of importedParlays) {
      const parlaysCollection = collection(db, 'parlays');
      await addDoc(parlaysCollection, parlay);
    }
    
    alert(`Successfully imported ${importedParlays.length} brolays!`);
    await loadParlays(); // Refresh the list
    setCsvInput(''); // Clear input
  } catch (error) {
    console.error('Import error:', error);
    alert(`Error importing data: ${error.message}`);
  } finally {
    setSaving(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-3 md:p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Brolay Toxic Standings</h1>
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
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
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">New Brolay Entry</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium mb-1">Bet Amount (per person)</label>
    <input
      type="number"
      value={newParlay.betAmount}
      onChange={(e) => setNewParlay({...newParlay, betAmount: Number(e.target.value)})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
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
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
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
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
      placeholder="Or enter net profit"
    />
  </div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium mb-1">Date</label>
    <input
      type="date"
      value={newParlay.date}
      onChange={(e) => setNewParlay({...newParlay, date: e.target.value})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Placed By</label>
    <select
      value={newParlay.placedBy}
      onChange={(e) => setNewParlay({...newParlay, placedBy: e.target.value})}
      className="w-full px-3 py-2 border rounded text-base"
      style={{ fontSize: isMobile ? '16px' : '14px' }}
    >
      <option value="">Select Big Guy</option>
      {players.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  </div>
</div>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base md:text-lg font-semibold">Picks</h3>
          </div>

          {Object.entries(newParlay.participants).map(([id, participant]) => (
  <div key={id} className="border rounded p-4 md:p-6 bg-gray-50">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
      <div>
        <label className="block text-xs font-medium mb-1">Big Guy</label>
        <select
          value={participant.player}
          onChange={(e) => updateParticipant(id, 'player', e.target.value)}
          className="w-full px-2 py-1 border rounded text-base"
          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
          className="w-full px-2 py-1 border rounded text-base"
          style={{ fontSize: isMobile ? '16px' : '14px' }}
        >
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Bet Type</label>
        <select
          value={participant.betType}
          onChange={(e) => updateParticipant(id, 'betType', e.target.value)}
          className="w-full px-2 py-1 border rounded text-base"
          style={{ fontSize: isMobile ? '16px' : '14px' }}
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
            className="w-full px-2 py-1 border rounded text-base"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <label className="block text-xs font-medium mb-1">Away Team</label>
          <input
            type="text"
            value={participant.awayTeam || ''}
            onChange={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
            onFocus={(e) => handleAwayTeamInput(id, e.target.value, participant.sport)}
            onBlur={() => setTimeout(() => setShowSuggestions({}), 200)}
            className="w-full px-2 py-1 border rounded text-base"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
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
            className="w-full px-2 py-1 border rounded text-base"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
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

    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
      {participant.betType === 'Spread' && (
        <>
          <div>
            <label className="block text-xs font-medium mb-1">Favorite/Dog</label>
            <select
              value={participant.favorite || 'Favorite'}
              onChange={(e) => updateParticipant(id, 'favorite', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
              className="w-full px-2 py-1 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
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
            className="w-full px-2 py-1 border rounded text-base"
            style={{ fontSize: isMobile ? '16px' : '14px' }}
            placeholder="e.g., -120 (Optional)"
          />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Result</label>
        <select
          value={participant.result}
          onChange={(e) => updateParticipant(id, 'result', e.target.value)}
          className="w-full px-2 py-1 border rounded text-base"
          style={{ fontSize: isMobile ? '16px' : '14px' }}
        >
          <option value="pending">Pending</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="push">Push</option>
        </select>
      </div>
    </div>
    <button
      onClick={() => removeParticipant(id)}
      className="text-red-600 text-sm hover:text-red-800 text-base"
      style={{ minHeight: isMobile ? '44px' : 'auto' }}
    >
      Remove Pick
    </button>
  </div>
))}
        </div>

        <button
          onClick={addParticipant}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          <PlusCircle size={20} />
          Add Pick
        </button>
        
        <button
          onClick={submitParlay}
          disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          {saving ? 'Saving...' : 'Submit Parlay'}
        </button>
      </div>
    </div>
  );

const calculateStatsForPlayer = (player, parlaysList) => {
  const playerStats = {
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

  parlaysList.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const losers = participants.filter(p => p.result === 'loss');
    const winners = participants.filter(p => p.result === 'win');
    const parlayWon = losers.length === 0 && winners.length > 0;
    const and1 = losers.length === 1 && winners.length === participants.length - 1;

    participants.forEach(participant => {
      if (participant.player !== player) return;
      
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

  return playerStats;
};

  const renderIndividualDashboard = () => {
  const filteredParlays = applyFilters([...parlays]);
  
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Individual Statistics</h2>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Big Guy</label>
            <select
              value={filters.player}
              onChange={(e) => setFilters({...filters, player: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              value={filters.sport}
              onChange={(e) => setFilters({...filters, sport: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placed By</label>
            <select
              value={filters.placedBy}
              onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Payout</label>
            <input
              type="number"
              value={filters.minPayout}
              onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="$0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Payout</label>
            <input
              type="number"
              value={filters.maxPayout}
              onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Result</label>
            <select
              value={filters.result}
              onChange={(e) => setFilters({...filters, result: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="push">Push</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setFilters({
            dateFrom: '', dateTo: '', player: '', sport: '', 
            placedBy: '', minPayout: '', maxPayout: '', result: ''
          })}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          Clear Filters
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {players.map(player => {
          const playerStats = calculateStatsForPlayer(player, filteredParlays);
          const winPct = playerStats.totalPicks > 0 
            ? ((playerStats.wins / playerStats.totalPicks) * 100).toFixed(1)
            : '0.0';
          const netMoney = playerStats.moneyWon - playerStats.moneyLost;

          return (
            <div key={player} className="bg-white rounded-lg shadow p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold mb-4">{player}</h3>
              
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
};

const renderGroupDashboard = () => {
  const filteredParlays = applyFilters([...parlays]);
  const totalParlays = filteredParlays.length;
  const wonParlays = filteredParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

  const bySport = {};
  filteredParlays.forEach(p => {
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
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Group Statistics</h2>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Big Guy</label>
            <select
              value={filters.player}
              onChange={(e) => setFilters({...filters, player: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              value={filters.sport}
              onChange={(e) => setFilters({...filters, sport: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placed By</label>
            <select
              value={filters.placedBy}
              onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Payout</label>
            <input
              type="number"
              value={filters.minPayout}
              onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="$0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Payout</label>
            <input
              type="number"
              value={filters.maxPayout}
              onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Result</label>
            <select
              value={filters.result}
              onChange={(e) => setFilters({...filters, result: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="push">Push</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setFilters({
            dateFrom: '', dateTo: '', player: '', sport: '', 
            placedBy: '', minPayout: '', maxPayout: '', result: ''
          })}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          Clear Filters
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Total Brolays</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{totalParlays}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Brolays Won</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{wonParlays}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-purple-600" size={24} />
            <h3 className="text-base md:text-lg font-semibold">Win Percentage</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{groupWinPct}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Performance by Sport</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Recent Brolays</h3>
        <div className="space-y-2">
          {filteredParlays.slice(-10).reverse().map(parlay => {
            const participants = Object.values(parlay.participants);
            const losers = participants.filter(p => p.result === 'loss');
            const winners = participants.filter(p => p.result === 'win');
            const won = losers.length === 0 && winners.length > 0;
            const and1 = losers.length === 1 && winners.length === participants.length - 1;
            
            const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
            const parlayType = sports.length > 1 ? 'Multi-Sport Brolay' : 
                               sports.length === 1 ? `${sports[0]} Brolay` : 'Brolay';
            
            return (
              <div key={parlay.id} className="border rounded p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <div className="flex-1">
                    <div className="font-semibold text-sm md:text-base">{parlay.date} - {parlayType}</div>
                    <div className="text-xs md:text-sm text-gray-600">
                    {participants.length} picks • ${parlay.betAmount * participants.length} Risked • ${parlay.totalPayout || 0} Total Payout • ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                    {parlay.placedBy && <span> • Placed by {parlay.placedBy}</span>}
                    {parlay.settled && <span className="ml-2 text-green-600">✓ Settled</span>}
                  </div>
                </div>
                <div className="text-left md:text-right">
                  {won && <span className="text-green-600 font-semibold">WON</span>}
                  {!won && losers.length > 0 && (
                    <span className="text-red-600 font-semibold">
                      LOST {and1 && '(And-1)'}
                    </span>
                  )}
                  {losers.length === 0 && participants.every(p => p.result === 'pending') && (
                    <span className="text-gray-500 font-semibold">PENDING</span>}
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

const renderAllBrolays = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">All Brolays</h2>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Big Guy</label>
            <select
              value={filters.player}
              onChange={(e) => setFilters({...filters, player: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              value={filters.sport}
              onChange={(e) => setFilters({...filters, sport: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placed By</label>
            <select
              value={filters.placedBy}
              onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Payout</label>
            <input
              type="number"
              value={filters.minPayout}
              onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="$0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Payout</label>
            <input
              type="number"
              value={filters.maxPayout}
              onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Result</label>
            <select
              value={filters.result}
              onChange={(e) => setFilters({...filters, result: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="push">Push</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setFilters({
            dateFrom: '', dateTo: '', player: '', sport: '', 
            placedBy: '', minPayout: '', maxPayout: '', result: ''
          })}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-base"
          style={{ minHeight: isMobile ? '44px' : 'auto' }}
        >
          Clear Filters
        </button>
      </div>

      {/* Brolays List */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg md:text-xl font-bold">
            {filteredParlays.length} Brolay{filteredParlays.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        <div className="space-y-3">
          {filteredParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No brolays match your filters</p>
          ) : (
            filteredParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const pushes = participants.filter(p => p.result === 'push');
              const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              
              const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
              const parlayType = sports.length > 1 ? 'Multi-Sport Brolay' : 
                                 sports.length === 1 ? `${sports[0]} Brolay` : 'Brolay';
              
              return (
                <div key={parlay.id} className="border rounded p-4 md:p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{parlay.date} - {parlayType}</div>
                      <div className="text-sm text-gray-600">
                        {participants.length} picks • ${parlay.betAmount * participants.length} Risked • 
                        ${parlay.totalPayout || 0} Total Payout • 
                        ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                        {parlay.placedBy && <span> • Placed by {parlay.placedBy}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {won && <span className="text-green-600 font-semibold">WON</span>}
                      {!won && losers.length > 0 && (
                        <span className="text-red-600 font-semibold">
                          LOST {and1 && '(And-1)'}
                        </span>
                      )}
                      {losers.length === 0 && winners.length === 0 && (
                        <span className="text-gray-500 font-semibold">PENDING</span>
                      )}
                      <button
                        onClick={() => setEditingParlay(parlay)}
                        className="text-blue-600 text-sm hover:text-blue-800 text-base"
                        style={{ minHeight: isMobile ? '44px' : 'auto' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteParlay(parlay.id)}
                        className="text-red-600 text-sm hover:text-red-800 text-base"
                        style={{ minHeight: isMobile ? '44px' : 'auto' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(parlay.participants).map(([pid, participant]) => (
                      <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-50 p-2 rounded gap-1">
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
                        <span className={`font-semibold ${
                          participant.result === 'win' ? 'text-green-600' :
                          participant.result === 'loss' ? 'text-red-600' :
                          participant.result === 'push' ? 'text-yellow-600' :
                          'text-gray-500'
                        }`}>
                          {participant.result.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
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
    const winners = participants.filter(p => p.result === 'win');
    const and1 = losers.length === 1 && winners.length === participants.length - 1; // For tracking only
    const totalAmount = parlay.betAmount * participants.length;
    const amountPerLoser = losers.length === 1 ? totalAmount : totalAmount / losers.length; // Payment logic
    
    losers.forEach(loser => {
      if (loser.player && parlay.placedBy) {
        payments.push({
          from: loser.player,
          to: parlay.placedBy,
          amount: amountPerLoser,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'loss',
          and1: and1
        });
      }
    });
  });
  
  // Won parlays - placer pays winners
  wonParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
    const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;
    
    winners.forEach(winner => {
      if (winner.player && parlay.placedBy) {
        payments.push({
          from: parlay.placedBy,
          to: winner.player,
          amount: amountPerWinner,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'win'
        });
      }
    });
  });

  // Get all unique players from payments
  const allPlayersSet = new Set();
  payments.forEach(payment => {
    if (payment.from) allPlayersSet.add(payment.from);
    if (payment.to) allPlayersSet.add(payment.to);
  });
  const allPlayers = Array.from(allPlayersSet);

  // Calculate net positions (who owes who overall)
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
    if (payment.from && payment.to && payment.from !== payment.to && 
        netPositions[payment.from] && netPositions[payment.from][payment.to] !== undefined) {
      netPositions[payment.from][payment.to] += payment.amount;
    }
  });

  // Simplify: if A owes B and B owes A, net them out
  const simplifiedPayments = [];
  allPlayers.forEach(player1 => {
    allPlayers.forEach(player2 => {
      if (player1 < player2) { // Only process each pair once
        const player1OwesPlayer2 = netPositions[player1]?.[player2] || 0;
        const player2OwesPlayer1 = netPositions[player2]?.[player1] || 0;
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
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Payment Tracker</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6">
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
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-4">💰 Who Owes Who (Net Summary)</h3>
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
                    <td className="py-3 px-4 text-right font-bold text-base md:text-lg">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Won Brolays */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold mb-3 text-green-600">✅ Won Brolays</h3>
        <div className="space-y-3">
          {wonParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
          ) : (
            wonParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const winners = participants.filter(p => p.result === 'win');
              const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
              const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;

              return (
                <div key={parlay.id} className="border rounded p-4 md:p-6 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{parlay.date}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-600">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-600">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">{parlay.placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 text-base"
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
                  >
                    Mark as Settled
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Lost Brolays */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold mb-3 text-red-600">❌ Lost Brolays</h3>
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              const amountPerLoser = and1 
                ? parlay.betAmount * participants.length 
                : (parlay.betAmount * participants.length) / losers.length;

              return (
                <div key={parlay.id} className="border rounded p-4 md:p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{parlay.date}</div>
                      <div className="text-sm text-gray-600">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-600">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-600 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium">Losers pay {parlay.placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${loser.player} ($${amountPerLoser.toFixed(2)})`).join(', ')}
                  </div>
                  <button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 text-base"
                    style={{ minHeight: isMobile ? '44px' : 'auto' }}
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
<div className="bg-white rounded-lg shadow p-4 md:p-6">
  <h3 className="text-base md:text-lg font-bold mb-3">Recently Settled</h3>
  <div className="space-y-2">
    {parlays.filter(p => p.settled).slice(-5).reverse().map(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const won = losers.length === 0 && winners.length > 0;
      
      return (
        <div key={parlay.id} className="border rounded p-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-semibold text-sm">{parlay.date}</div>
              <div className="text-xs text-gray-600">
                {won ? `Winners paid by ${parlay.placedBy || 'Unknown'}: ${winners.map(w => w.player).join(', ')}` 
                     : `Losers paid ${parlay.placedBy || 'Unknown'}: ${losers.map(l => l.player).join(', ')}`}
              </div>
            </div>
            <button
              onClick={() => toggleSettlement(parlay.id)}
              disabled={saving}
              className="ml-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400 whitespace-nowrap text-base"
              style={{ minHeight: isMobile ? '44px' : 'auto' }}
            >
              Mark as Not Settled
            </button>
          </div>
        </div>
      );
    })}
  </div>
</div>
    </div>
  );
};

const renderImport = () => (
  <div className="space-y-4 md:space-y-6">
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Import Historical Data</h2>
      <p className="text-gray-600 mb-4">
        Paste your CSV data below. Make sure it follows the exact format with all required columns.
      </p>
      
      <textarea
        value={csvInput}
        onChange={(e) => setCsvInput(e.target.value)}
        className="w-full h-64 px-3 py-2 border rounded font-mono text-sm"
        style={{ fontSize: isMobile ? '16px' : '14px' }}
        placeholder="Paste CSV data here..."
      />
      
      <button
        onClick={() => {
          if (window.confirm('Import this data? This will add all rows to your database.')) {
            importFromCSV(csvInput);
          }
        }}
        disabled={saving || !csvInput}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 text-base"
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {saving ? 'Importing...' : 'Import Data'}
      </button>
    </div>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• First row must be headers (column names)</li>
        <li>• Date format: YYYY-MM-DD (e.g., 2024-12-20)</li>
        <li>• Required: date, betAmount, totalPayout, settled</li>
        <li>• Optional: placedBy (leave blank if unknown)</li>
        <li>• For each pick (pick1 through pick5):</li>
        <li className="ml-4">- pick#_player, pick#_sport, pick#_team, pick#_betType, pick#_result</li>
        <li className="ml-4">- For Spread: pick#_favorite, pick#_spread</li>
        <li className="ml-4">- For Total: pick#_awayTeam, pick#_homeTeam, pick#_overUnder, pick#_total</li>
        <li className="ml-4">- For Prop: pick#_propType, pick#_overUnder, pick#_line</li>
        <li>• Results: win, loss, push, or pending</li>
      </ul>
    </div>
    
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-gray-900 mb-2">Example CSV:</h3>
      <pre className="text-xs overflow-x-auto">
{`date,betAmount,totalPayout,placedBy,settled,pick1_player,pick1_sport,pick1_team,pick1_betType,pick1_favorite,pick1_spread,pick1_result,pick2_player,pick2_sport,pick2_awayTeam,pick2_homeTeam,pick2_betType,pick2_overUnder,pick2_total,pick2_result,pick3_player,pick3_sport,pick3_team,pick3_betType,pick3_propType,pick3_overUnder,pick3_line,pick3_result
2024-12-20,10,675,Management,false,Management,NFL,Chiefs,Spread,Favorite,7.5,win,CD,NFL,Bills,Chiefs,Total,Over,45.5,win,914,NBA,Lakers,Prop Bet,Points,Over,25.5,loss`}
      </pre>
    </div>
  </div>
);
 return (
  <div 
    className="min-h-screen bg-gray-100"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    {/* Pull to refresh indicator */}
{pullDistance > 0 && (
  <div 
    className="fixed top-0 left-0 right-0 flex justify-center items-center bg-blue-100 transition-all duration-200 z-50"
    style={{ height: `${pullDistance}px` }}
  >
    <div className="text-blue-600 font-semibold">
      {pullDistance > 80 ? 'Release to refresh...' : 'Pull to refresh...'}
    </div>
  </div>
)}

{refreshing && (
  <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-2 text-center z-50">
    <Loader className="inline animate-spin mr-2" size={16} />
    Refreshing...
  </div>
)}
    {renderEditModal()}
    <div className="bg-blue-600 text-white p-4 md:p-6 shadow-lg">
  <div className="flex items-center justify-between">
    {isMobile && (
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 text-base"
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    )}
    <div className="flex-1">
      <h1 className="text-2xl md:text-3xl font-bold">Brolay Toxic Standings</h1>
      <p className="text-blue-100 text-sm md:text-base">Track your group's betting performance</p>
    </div>
    {saving && (
      <div className="text-sm">
        <Loader className="inline animate-spin" size={16} />
      </div>
    )}
  </div>
</div>{/* Mobile Sidebar Overlay */}
{isMobile && sidebarOpen && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40"
    onClick={() => setSidebarOpen(false)}
  />
)}

{/* Navigation - Collapsible sidebar for mobile, horizontal tabs for desktop */}
<div className={`${
  isMobile 
    ? `fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'container mx-auto p-4 md:p-6'
}`}>
  <div className={isMobile ? 'pt-20 px-4' : 'mb-6 flex gap-2 overflow-x-auto'}>
    {[
      { id: 'entry', label: 'New Brolay' },
      { id: 'allBrolays', label: 'All Brolays' },
      { id: 'individual', label: 'Individual Stats' },
      { id: 'group', label: 'Group Stats' },
      { id: 'payments', label: 'Payments' },
      { id: 'import', label: 'Import Data' }
    ].map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          if (isMobile) setSidebarOpen(false);
        }}
        className={`${
          isMobile ? 'w-full text-left' : 'whitespace-nowrap'
        } px-4 py-3 rounded-lg font-semibold ${
          activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700' text-base
        }`}
        style={{ minHeight: isMobile ? '44px' : 'auto' }}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
      {activeTab === 'entry' && renderEntry()}
      {activeTab === 'allBrolays' && renderAllBrolays()}
      {activeTab === 'individual' && renderIndividualDashboard()}
      {activeTab === 'group' && renderGroupDashboard()}
      {activeTab === 'payments' && renderPayments()}
      {activeTab === 'import' && renderImport()}
    </div>
  </div>
);
};

export default App;
