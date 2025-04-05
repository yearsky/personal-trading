export interface Trade {
    openTime: string;
    closeTime: string;
    type: string;
    item: string;
    profit: number;
  }
  
  export interface SummaryByDate {
    date: string;
    totalProfit: number;
    tradeCount: number;
    winCount: number;
    lossCount: number;
  }