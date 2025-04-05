"use client";
import { useMemo, useState } from "react";
import { Trade, SummaryByDate } from "../types/trade";

interface TradeSummaryProps {
  trades: Trade[];
}

export default function TradeSummary({ trades }: TradeSummaryProps) {
  const [view, setView] = useState<'table' | 'cards'>('table');
  
  // Mengelompokkan trades berdasarkan tanggal dari "Close Time"
  const summaryByDate: SummaryByDate[] = useMemo(() => {
    const grouped = trades.reduce(
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
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
  }, [trades]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
    const profitableTrades = trades.filter(trade => trade.profit > 0);
    const lossTrades = trades.filter(trade => trade.profit < 0);
    
    return {
      totalProfit,
      tradeCount: trades.length,
      winCount: profitableTrades.length,
      lossCount: lossTrades.length,
      winRate: trades.length > 0 ? (profitableTrades.length / trades.length) * 100 : 0,
      avgProfit: profitableTrades.length > 0 ? 
        profitableTrades.reduce((sum, trade) => sum + trade.profit, 0) / profitableTrades.length : 0,
      avgLoss: lossTrades.length > 0 ? 
        lossTrades.reduce((sum, trade) => sum + trade.profit, 0) / lossTrades.length : 0,
    };
  }, [trades]);

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
                <tr key={summary.date} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
            <div key={summary.date} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">{summary.date}</h3>
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
    </div>
  );
}