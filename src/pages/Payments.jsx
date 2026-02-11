import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS } from '../constants/sports';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { AlertCircle } from 'lucide-react';
import { formatDateForDisplay, getPicksArray, getPickBigGuy, getPickResult, getSubmittedBy } from '../utils/formatters';

/**
 * Payments - Payment tracking and settlement interface
 *
 * Features:
 * - Track who owes who
 * - Settle won/lost parlays
 * - View settlement history
 * - Net payment calculations
 */
const Payments = () => {
  // Get context values
  const {
    parlays,
    filters,
    setFilters,
    isMobile,
    handleToggleSettlement,
    saving,
    settledBrolaysToShow,
    setSettledBrolaysToShow
  } = useBrolayContext();

  const players = PLAYERS;
  const toggleSettlement = handleToggleSettlement;

  // Apply filters to parlays
  const applyFilters = (parlayList) => {
    return parlayList.filter(parlay => {
      // Date filters
      if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
      if (filters.dateTo && parlay.date > filters.dateTo) return false;

      // PlacedBy filter (use getSubmittedBy for dual-schema support)
      if (filters.placedBy && getSubmittedBy(parlay) !== filters.placedBy) return false;

      return true;
    });
  };

  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    // Since dates are stored as YYYY-MM-DD strings, we can compare them directly
    // String comparison works for ISO date format (YYYY-MM-DD)
    const dateCompare = b.date.localeCompare(a.date); // Descending (newest first)

    if (dateCompare !== 0) return dateCompare;

    // If dates are equal, check sortOrder
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder; // Descending
    }

    // Finally, sort by ID (descending)
    return String(b.id).localeCompare(String(a.id));
  });

  console.log('📋 Filtered parlays order (first 5):', filteredParlays.slice(0, 5).map(p => ({
    id: p.id,
    date: p.date,
    dateObj: new Date(p.date),
    settled: p.settled
  })));

  const unsettledParlays = filteredParlays.filter(p => !p.settled);
  const settledParlays = filteredParlays.filter(p => p.settled);

  const lostParlays = unsettledParlays.filter(p => {
    const picks = getPicksArray(p);
    return picks.some(pick => getPickResult(pick) === 'loss');
  });

  const wonParlays = unsettledParlays.filter(p => {
    const picks = getPicksArray(p);
    const losers = picks.filter(pick => getPickResult(pick) === 'loss');
    return losers.length === 0 && picks.some(pick => getPickResult(pick) === 'win');
  });

  // Debug logging
  console.log('🔍 Lost Parlays order:', lostParlays.map(p => ({ id: p.id, date: p.date })));
  console.log('🔍 Won Parlays order:', wonParlays.map(p => ({ id: p.id, date: p.date })));

  // Calculate who owes who
  const payments = [];

  // Lost parlays - winners get paid by placer
  lostParlays.forEach(parlay => {
    const picks = getPicksArray(parlay);
    const losers = picks.filter(p => getPickResult(p) === 'loss');
    const winners = picks.filter(p => getPickResult(p) === 'win');
    const and1 = losers.length === 1 && winners.length === picks.length - 1;
    const totalAmount = parlay.betAmount * picks.length;
    const amountPerLoser = losers.length === 1 ? totalAmount : totalAmount / losers.length;
    const placedBy = getSubmittedBy(parlay);

    losers.forEach(loser => {
      const loserPlayer = getPickBigGuy(loser);
      if (loserPlayer && placedBy) {
        payments.push({
          from: loserPlayer,
          to: placedBy,
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
    const picks = getPicksArray(parlay);
    const winners = picks.filter(p => getPickResult(p) === 'win');
    const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * picks.length));
    const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;
    const placedBy = getSubmittedBy(parlay);

    winners.forEach(winner => {
      const winnerPlayer = getPickBigGuy(winner);
      if (winnerPlayer && placedBy) {
        payments.push({
          from: placedBy,
          to: winnerPlayer,
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
      if (player1 < player2) {
        const player1OwesPlayer2 = netPositions[player1]?.[player2] || 0;
        const player2OwesPlayer1 = netPositions[player2]?.[player1] || 0;
        const netAmount = player1OwesPlayer2 - player2OwesPlayer1;

        if (Math.abs(netAmount) > 0.01) {
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
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">💰 Payment Tracker</h2>

      {/* Filters - Compact for Payments */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Placed By</label>
            <select
              value={filters.placedBy}
              onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button
            onClick={() => setFilters({
              dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
              placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
            })}
            variant="secondary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Visual Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="warning" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-yellow-400" size={24} />
            <h3 className="text-yellow-400 font-bold text-lg">Unsettled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {lostParlays.length + wonParlays.length}
          </div>
          <div className="text-sm text-gray-400">
            {lostParlays.length} lost • {wonParlays.length} won
          </div>
        </Card>

        <Card variant="danger" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💸</span>
            <h3 className="text-red-400 font-bold text-lg">Total Owed</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${simplifiedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            {simplifiedPayments.length} payment{simplifiedPayments.length !== 1 ? 's' : ''} pending
          </div>
        </Card>

        <Card variant="success" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-green-400 font-bold text-lg">Recently Settled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {parlays.filter(p => p.settled).length}
          </div>
          <div className="text-sm text-gray-400">
            All-time settlements
          </div>
        </Card>
      </div>

      {/* Who Owes Who Summary Table */}
      {simplifiedPayments.length > 0 && (
        <Card title="💰 Who Owes Who (Net Summary)">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">From</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">To</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {simplifiedPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                    <td className="py-3 px-4 font-semibold text-red-400">{payment.from}</td>
                    <td className="py-3 px-4 font-semibold text-green-400">{payment.to}</td>
                    <td className="py-3 px-4 text-right font-bold text-base md:text-lg text-white">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Won Brolays */}
      <Card title="✅ Won Brolays" className="text-green-400">
        <div className="space-y-3">
          {wonParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
          ) : (
            wonParlays.map(parlay => {
              const picks = getPicksArray(parlay);
              const winners = picks.filter(p => getPickResult(p) === 'win');
              const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * picks.length));
              const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;
              const placedBy = getSubmittedBy(parlay);

              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-400">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-500">
                        (${(parlay.totalPayout || 0).toFixed(2)} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">{placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${getPickBigGuy(winner)} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Lost Brolays */}
      <Card title="❌ Lost Brolays" className="text-red-400">
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const picks = getPicksArray(parlay);
              const losers = picks.filter(p => getPickResult(p) === 'loss');
              const winners = picks.filter(p => getPickResult(p) === 'win');
              const and1 = losers.length === 1 && winners.length === picks.length - 1;
              const totalLost = parlay.betAmount * picks.length;
              const amountPerLoser = losers.length > 0 ? (totalLost / losers.length) : 0;
              const placedBy = getSubmittedBy(parlay);

              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-400">
                        ${(parlay.betAmount * picks.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-400 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">Losers pay {placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${getPickBigGuy(loser)} ($${Number(amountPerLoser).toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Recently Settled */}
      <Card title="✅ Recently Settled" className="text-gray-400">
        <div className="space-y-3">
          {settledParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recently settled brolays</p>
          ) : (
            <>
              {settledParlays
                .sort((a, b) => {
                  const dateA = new Date(a.settledAt || a.date);
                  const dateB = new Date(b.settledAt || b.date);
                  return dateB - dateA;
                })
                .slice(0, settledBrolaysToShow)
                .map(parlay => {
                  const picks = getPicksArray(parlay);
                  const winners = picks.filter(p => getPickResult(p) === 'win');
                  const losers = picks.filter(p => getPickResult(p) === 'loss');
                  const pushes = picks.filter(p => getPickResult(p) === 'push');
                  const allResolved = (losers.length + winners.length + pushes.length) === picks.length;
                  const won = allResolved && losers.length === 0 && winners.length > 0;
                  const placedBy = getSubmittedBy(parlay);

                  return (
                    <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-white">{formatDateForDisplay(parlay.date)}</div>
                          <div className="text-xs text-gray-400">
                            {won ? `Winners paid by ${placedBy || 'Unknown'}: ${winners.map(w => getPickBigGuy(w)).join(', ')}`
                                 : `Losers paid ${placedBy || 'Unknown'}: ${losers.map(l => getPickBigGuy(l)).join(', ')}`}
                          </div>
                        </div>
                        <Button
                          onClick={() => toggleSettlement(parlay.id)}
                          disabled={saving}
                          variant="danger"
                          size="small"
                          className={`ml-3 whitespace-nowrap ${isMobile ? 'min-h-[44px]' : ''}`}
                        >
                          Unsettle
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {/* Pagination controls */}
              {settledParlays.length > settledBrolaysToShow && (
                <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setSettledBrolaysToShow(prev => prev + 10)}
                    variant="outline"
                    size="small"
                  >
                    Show 10 More
                  </Button>
                  <Button
                    onClick={() => setSettledBrolaysToShow(settledParlays.length)}
                    variant="outline"
                    size="small"
                  >
                    Show All ({settledParlays.length})
                  </Button>
                </div>
              )}

              {/* Show Less button when expanded */}
              {settledBrolaysToShow > 10 && settledBrolaysToShow >= settledParlays.length && (
                <div className="flex justify-center mt-4 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setSettledBrolaysToShow(10)}
                    variant="outline"
                    size="small"
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Payments;
