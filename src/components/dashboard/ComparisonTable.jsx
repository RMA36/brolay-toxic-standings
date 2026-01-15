import React from 'react';

/**
 * ComparisonTable - Displays head-to-head statistics comparison for multiple players
 *
 * @param {Object} props
 * @param {Array} props.comparisonData - Array of player stats objects with structure:
 *   {player, record, winPct, netMoney, and1s, and1Cost, bySport, byBetType}
 * @param {Object} props.commonSports - Sports where all players have 10+ bets
 * @param {Object} props.commonBetTypes - Bet types where all players have 10+ bets
 */
const ComparisonTable = ({ comparisonData, commonSports, commonBetTypes }) => {
  // Helper to determine winner for a metric
  const getWinner = (metric, higherIsBetter = true) => {
    const values = comparisonData.map(p => p[metric]);
    const bestValue = higherIsBetter ? Math.max(...values) : Math.min(...values);
    return values.indexOf(bestValue);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-purple-500/30">
            <th className="text-left py-3 px-4 text-gray-300 font-semibold sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              Metric
            </th>
            {comparisonData.map((data, idx) => (
              <th key={idx} className="text-center py-3 px-4 text-purple-400 font-bold">
                {data.player}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Overall Stats */}
          <tr className="border-b border-gray-700">
            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              Record
            </td>
            {comparisonData.map((data, idx) => (
              <td key={idx} className="py-3 px-4 text-center text-white">
                {data.record}
              </td>
            ))}
          </tr>

          <tr className="border-b border-gray-700 bg-gray-800/30">
            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              Win %
            </td>
            {comparisonData.map((data, idx) => {
              const isWinner = idx === getWinner('winPct', true);
              return (
                <td key={idx} className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isWinner && <span className="text-yellow-400">👑</span>}
                    <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                      {data.winPct.toFixed(1)}%
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>

          <tr className="border-b border-gray-700">
            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              Net Money
            </td>
            {comparisonData.map((data, idx) => {
              const isWinner = idx === getWinner('netMoney', true);
              return (
                <td key={idx} className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isWinner && <span className="text-yellow-400">👑</span>}
                    <span className={`font-semibold ${
                      isWinner ? 'text-yellow-400' :
                      data.netMoney >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${data.netMoney.toFixed(2)}
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>

          <tr className="border-b border-gray-700 bg-gray-800/30">
            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              And-1s
            </td>
            {comparisonData.map((data, idx) => {
              const isWinner = idx === getWinner('and1s', false); // Lower is better
              return (
                <td key={idx} className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isWinner && <span className="text-yellow-400">👑</span>}
                    <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                      {data.and1s}
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>

          <tr className="border-b border-gray-700">
            <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
              And-1 Cost
            </td>
            {comparisonData.map((data, idx) => {
              const isWinner = idx === getWinner('and1Cost', false); // Lower is better
              return (
                <td key={idx} className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isWinner && <span className="text-yellow-400">👑</span>}
                    <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                      ${data.and1Cost.toFixed(2)}
                    </span>
                  </div>
                </td>
              );
            })}
          </tr>

          {/* By Sport - Only sports where all have 10+ */}
          {Object.keys(commonSports).length > 0 && (
            <>
              <tr>
                <td colSpan={comparisonData.length + 1} className="py-3 px-4 bg-gray-700/50">
                  <h4 className="font-bold text-purple-400">📊 By Sport (10+ bets)</h4>
                </td>
              </tr>
              {Object.keys(commonSports).map(sport => (
                <tr key={sport} className="border-b border-gray-700">
                  <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                    {sport}
                  </td>
                  {comparisonData.map((data, idx) => {
                    const sportData = data.bySport[sport];
                    const sportWinPct = sportData.total > 0
                      ? (((sportData.wins + sportData.pushes * 0.5) / sportData.total) * 100)
                      : 0;

                    // Find winner for this sport
                    const sportWinPcts = comparisonData.map(p => {
                      const sd = p.bySport[sport];
                      return sd.total > 0 ? (((sd.wins + sd.pushes * 0.5) / sd.total) * 100) : 0;
                    });
                    const bestSportWinPct = Math.max(...sportWinPcts);
                    const isWinner = sportWinPct === bestSportWinPct;

                    return (
                      <td key={idx} className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            {isWinner && <span className="text-yellow-400">👑</span>}
                            <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                              {sportWinPct.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {sportData.wins}-{sportData.losses}-{sportData.pushes}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          )}

          {/* By Bet Type - Only bet types where all have 10+ */}
          {Object.keys(commonBetTypes).length > 0 && (
            <>
              <tr>
                <td colSpan={comparisonData.length + 1} className="py-3 px-4 bg-gray-700/50">
                  <h4 className="font-bold text-purple-400">🎲 By Bet Type (10+ bets)</h4>
                </td>
              </tr>
              {Object.keys(commonBetTypes).map(betType => (
                <tr key={betType} className="border-b border-gray-700">
                  <td className="py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gradient-to-r from-purple-900/30 to-gray-800">
                    {betType}
                  </td>
                  {comparisonData.map((data, idx) => {
                    const betData = data.byBetType[betType];
                    const betWinPct = betData.total > 0
                      ? (((betData.wins + betData.pushes * 0.5) / betData.total) * 100)
                      : 0;

                    // Find winner for this bet type
                    const betWinPcts = comparisonData.map(p => {
                      const bd = p.byBetType[betType];
                      return bd.total > 0 ? (((bd.wins + bd.pushes * 0.5) / bd.total) * 100) : 0;
                    });
                    const bestBetWinPct = Math.max(...betWinPcts);
                    const isWinner = betWinPct === bestBetWinPct;

                    return (
                      <td key={idx} className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            {isWinner && <span className="text-yellow-400">👑</span>}
                            <span className={`font-semibold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                              {betWinPct.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {betData.wins}-{betData.losses}-{betData.pushes}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
