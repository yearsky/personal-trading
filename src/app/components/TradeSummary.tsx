"use client";
import { useMemo, useState } from "react";
import { Trade, SummaryByDate } from "../types/trade";

interface TradeSummaryProps {
  trades: Trade[];
}

export default function TradeSummary({ trades }: TradeSummaryProps) {
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // First, deduplicate trades based on a composite key
  // First, deduplicate trades based on a composite key
const uniqueTrades = useMemo(() => {
  const tradeMap = new Map();

  trades.forEach((trade) => {
    // Create a composite key using openTime, closeTime, and item (since these should uniquely identify a trade)
    const tradeKey = `${trade.openTime}-${trade.closeTime}-${trade.item}`;

    // If this tradeKey already exists in the map, keep the trade with non-zero volume, openPrice, and closePrice
    if (!tradeMap.has(tradeKey)) {
      tradeMap.set(tradeKey, trade);
    } else {
      // If the existing trade in the map has zero volume, openPrice, or closePrice, replace it with the new trade if the new trade is valid
      const existingTrade = tradeMap.get(tradeKey);
      if (
        (existingTrade.volume === 0 || existingTrade.openPrice === 0 || existingTrade.closePrice === 0) &&
        trade.volume > 0 &&
        trade.openPrice > 0 &&
        trade.closePrice > 0
      ) {
        tradeMap.set(tradeKey, trade);
      }
    }
  });

  // Convert map values back to array and ensure only valid trades are included
  return Array.from(tradeMap.values()).filter(
    (trade) => trade.volume > 0 && trade.openPrice > 0 && trade.closePrice > 0
  );
}, [trades]);
  
  // Mengelompokkan trades berdasarkan tanggal dari "Close Time"
  const summaryByDate: SummaryByDate[] = useMemo(() => {
    const grouped = uniqueTrades.reduce(
      (acc: { [date: string]: { totalProfit: number; trades: Trade[] } }, trade) => {
        const date = trade.closeTime.split(" ")[0]; // Ambil tanggal saja (misal: "2025.04.02")
        if (!acc[date]) {
          acc[date] = { totalProfit: 0, trades: [] };
        }
        acc[date].totalProfit += trade.profit;
        acc[date].trades.push(trade);
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        totalProfit: data.totalProfit,
        tradeCount: data.trades.length,
        winCount: data.trades.filter(trade => trade.profit > 0).length,
        lossCount: data.trades.filter(trade => trade.profit < 0).length,
        trades: data.trades
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
  }, [uniqueTrades]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalProfit = uniqueTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const profitableTrades = uniqueTrades.filter(trade => trade.profit > 0);
    const lossTrades = uniqueTrades.filter(trade => trade.profit < 0);
    
    return {
      totalProfit,
      tradeCount: uniqueTrades.length,
      winCount: profitableTrades.length,
      lossCount: lossTrades.length,
      winRate: uniqueTrades.length > 0 ? (profitableTrades.length / uniqueTrades.length) * 100 : 0,
      avgProfit: profitableTrades.length > 0 ? 
        profitableTrades.reduce((sum, trade) => sum + trade.profit, 0) / profitableTrades.length : 0,
      avgLoss: lossTrades.length > 0 ? 
        lossTrades.reduce((sum, trade) => sum + trade.profit, 0) / lossTrades.length : 0,
    };
  }, [uniqueTrades]);

  // Get trades for selected date
  const selectedDateTrades = useMemo(() => {
    if (!selectedDate) return [];
    const dateData = summaryByDate.find(summary => summary.date === selectedDate);
    return dateData ? dateData.trades : [];
  }, [selectedDate, summaryByDate]);

  // Handle opening the modal with selected date
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowDetailsModal(true);
  };

  return (
    <div>
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Profit/Loss</h3>
          <p className={`text-2xl font-bold ${overallStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${overallStats.totalProfit.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow">
          <h3 className="text-gray-500 text-sm font-medium">Win Rate</h3>
          <p className="text-2xl font-bold text-blue-600">
            {overallStats.winRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            ({overallStats.winCount}/{overallStats.tradeCount} trades)
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow">
          <h3 className="text-gray-500 text-sm font-medium">Average Win</h3>
          <p className="text-2xl font-bold text-green-600">
            ${overallStats.avgProfit.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow">
          <h3 className="text-gray-500 text-sm font-medium">Average Loss</h3>
          <p className="text-2xl font-bold text-red-600">
            ${overallStats.avgLoss.toFixed(2)}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Trade Summary by Date</h2>
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              view === 'table'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Table View
          </button>
          <button
            type="button"
            onClick={() => setView('cards')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              view === 'cards'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Card View
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Profit/Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win/Loss
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summaryByDate.map((summary) => (
                <tr key={summary.date} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleDateClick(summary.date)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    {summary.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${summary.totalProfit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {summary.tradeCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600 font-medium">{summary.winCount}</span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-red-600 font-medium">{summary.lossCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {summaryByDate.map((summary) => (
            <div 
              key={summary.date} 
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleDateClick(summary.date)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline">{summary.date}</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Total Profit/Loss</dt>
                    <dd className={`mt-1 text-xl font-semibold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${summary.totalProfit.toFixed(2)}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Number of Trades</dt>
                    <dd className="mt-1 text-xl font-semibold text-gray-900">{summary.tradeCount}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Win/Loss Ratio</dt>
                    <dd className="mt-1 flex items-center space-x-2">
                      <span className="flex items-center">
                        <span className="h-4 w-4 bg-green-500 rounded-full mr-1"></span>
                        <span className="font-medium">{summary.winCount} wins</span>
                      </span>
                      <span className="text-gray-500">/</span>
                      <span className="flex items-center">
                        <span className="h-4 w-4 bg-red-500 rounded-full mr-1"></span>
                        <span className="font-medium">{summary.lossCount} losses</span>
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedDate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Transactions for {selectedDate}
              </h2>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (Lot)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedDateTrades.map((trade, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.openTime}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.closeTime}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.type}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.item}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.volume}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.openPrice}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.closePrice}</td>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}