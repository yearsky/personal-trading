// Perbarui tipe Trade di file types/trade.ts
export interface Trade {
  openTime: string;
  closeTime: string;
  type: string;
  item: string;
  profit: number;
  volume: number; // Menambahkan volume
  openPrice: number; // Menambahkan harga open
  closePrice: number; // Menambahkan harga close
}

export interface SummaryByDate {
  date: string;
  totalProfit: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  trades: Trade[];
}