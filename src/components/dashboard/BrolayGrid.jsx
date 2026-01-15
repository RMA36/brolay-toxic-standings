import React from 'react';
import { formatDateForDisplay, formatBetDescription } from '../../utils/formatters';

/**
 * BrolayGrid - Grid view of all brolays showing each player's picks in a matrix format
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of parlay objects
 * @param {Array} props.players - Array of player names
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
              const participants = parlay.participants || {};

              return (
                <tr key={parlay.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="py-3 px-2 font-semibold sticky left-0 bg-gray-900 text-xs md:text-sm text-gray-300">
                    {formatDateForDisplay(parlay.date)}
                  </td>
                  {players.map((player) => {
                    const playerPick = Object.values(participants).find(p => p.player === player);

                    if (!playerPick) {
                      return <td key={player} className="py-3 px-2 text-center" style={{ background: 'rgba(15, 23, 42, 0.3)' }}></td>;
                    }

                    let bgColor = 'bg-gray-700';
                    if (playerPick.result === 'win') bgColor = 'bg-green-200';
                    else if (playerPick.result === 'loss') bgColor = 'bg-red-200';
                    else if (playerPick.result === 'push') bgColor = 'bg-gray-200';

                    let teamDisplay = '';
                    if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(playerPick.betType)) {
                      teamDisplay = `${playerPick.awayTeam} @ ${playerPick.homeTeam}`;
                    } else {
                      teamDisplay = playerPick.team;
                    }

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
