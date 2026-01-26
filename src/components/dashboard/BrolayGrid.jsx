import React from 'react';
import { formatDateForDisplay, formatBetDescription, getPickBigGuy, getPickResult, getPicksArray } from '../../utils/formatters';

/**
 * BrolayGrid - Grid view of all brolays showing each player's picks in a matrix format
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of parlay objects
 * @param {Array} props.players - Array of player names (Big Guys)
 */
const BrolayGrid = ({ parlays, players }) => {
  // Sort parlays by date descending, then by sortOrder
  const sortedParlays = [...parlays].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder;
    }
    const aKey = a.id || a.id;
    const bKey = b.id || b.id;
    return String(bKey).localeCompare(String(aKey));
  });

  /**
   * Get team display string from a pick (supports both schemas)
   */
  const getTeamDisplay = (pick) => {
    if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(pick.betType)) {
      // New schema: game object
      if (pick.game) {
        return `${pick.game.awayTeam} @ ${pick.game.homeTeam}`;
      }
      // Old schema: direct fields
      return `${pick.awayTeam} @ ${pick.homeTeam}`;
    }
    // New schema: entities array
    if (pick.entities && pick.entities.length > 0) {
      const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
      return primary?.name || pick.team;
    }
    return pick.team;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🎯 Brolay Grid</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-600">
              <th className="text-left py-2 px-2 sticky left-0 bg-gray-900 z-10 min-w-[100px] text-gray-300">Date</th>
              {players.map(player => (
                <th key={player} className="text-center py-2 px-2 min-w-[80px] md:min-w-[150px] text-gray-300">{player}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedParlays.map((parlay) => {
              // Support both new (picks) and old (participants) schema
              const picks = getPicksArray(parlay);

              return (
                <tr key={parlay.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="py-3 px-2 font-semibold sticky left-0 bg-gray-900 text-xs md:text-sm text-gray-300">
                    {formatDateForDisplay(parlay.date)}
                  </td>
                  {players.map((player) => {
                    // Find pick by Big Guy (supports both bigGuy and player fields)
                    const playerPick = picks.find(p => getPickBigGuy(p) === player);

                    if (!playerPick) {
                      return <td key={player} className="py-3 px-2 text-center" style={{ background: 'rgba(15, 23, 42, 0.3)' }}></td>;
                    }

                    // Get result (supports both outcome.status and result)
                    const result = getPickResult(playerPick);

                    let bgColor = 'bg-gray-700';
                    if (result === 'win') bgColor = 'bg-green-200';
                    else if (result === 'loss') bgColor = 'bg-red-200';
                    else if (result === 'push') bgColor = 'bg-gray-200';

                    const teamDisplay = getTeamDisplay(playerPick);
                    const betDetails = formatBetDescription(playerPick);

                    return (
                      <td key={player} className={`py-3 px-2 text-center ${bgColor} text-[10px] md:text-xs`}>
                        {/* Desktop view - show all details */}
                        <div className="hidden md:block">
                          <div className="font-semibold">{playerPick.sport}</div>
                          <div>{teamDisplay}</div>
                          <div>{betDetails}</div>
                          <div className="text-[10px] mt-1">{playerPick.betType}</div>
                        </div>
                        {/* Mobile view - compact */}
                        <div className="md:hidden">
                          <div className="font-semibold">{teamDisplay}</div>
                          <div>{betDetails}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrolayGrid;
