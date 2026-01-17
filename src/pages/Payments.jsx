import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS } from '../constants/sports';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { AlertCircle } from 'lucide-react';
import { formatDateForDisplay } from '../utils/formatters';

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

      // PlacedBy filter
      if (filters.placedBy && parlay.placedBy !== filters.placedBy) return false;

      return true;
    });
  };

  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    const aKey = a.id || a.id;
    const bKey = b.id || b.id;
    return String(aKey).localeCompare(String(bKey));
  });

  const unsettledParlays = filteredParlays.filter(p => !p.settled);
  const settledParlays = filteredParlays.filter(p => p.settled);

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
    const and1 = losers.length === 1 && winners.length === participants.length - 1;
    const totalAmount = parlay.betAmount * participants.length;
    const amountPerLoser = losers.length === 1 ? totalAmount : totalAmount / losers.length;

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
              const participants = Object.values(parlay.participants);
              const winners = participants.filter(p => p.result === 'win');
              const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
              const amountPerWinner = winners.length > 0 ? (netProfit / winners.length).toFixed(2) : 0;

              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-400">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-500">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">{parlay.placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
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
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              const totalLost = parlay.betAmount * participants.length;
              const amountPerLoser = losers.length > 0 ? (totalLost / losers.length) : 0;

              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-400">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-400 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">Losers pay {parlay.placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${loser.player} ($${Number(amountPerLoser).toFixed(2)})`).join(', ')}
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
                  const participants = Object.values(parlay.participants);
                  const winners = participants.filter(p => p.result === 'win');
                  const losers = participants.filter(p => p.result === 'loss');
                  const won = losers.length === 0 && winners.length > 0;

                  return (
                    <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-white">{formatDateForDisplay(parlay.date)}</div>
                          <div className="text-xs text-gray-400">
                            {won ? `Winners paid by ${parlay.placedBy || 'Unknown'}: ${winners.map(w => w.player).join(', ')}`
                                 : `Losers paid ${parlay.placedBy || 'Unknown'}: ${losers.map(l => l.player).join(', ')}`}
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
