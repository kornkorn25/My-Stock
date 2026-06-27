export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
}

export type TxType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  symbol: string;
  type: TxType;
  quantity: string;
  price: string;
  fee: string;
  note: string | null;
  executedAt: string;
  createdAt: string;
}

export interface Holding {
  id: string;
  symbol: string;
  quantity: string;
  avgCost: string;
  realizedPnl: string;
  targetPct: string | null;
  updatedAt: string;
}

export interface Position {
  symbol: string;
  quantity: string;
  avgCost: string;
  currentPrice: string | null;
  marketValue: string | null;
  costBasis: string;
  unrealizedPnl: string | null;
  unrealizedPnlPct: string | null;
  realizedPnl: string;
  allocationPct: string | null;
  targetPct: string | null;
  overTarget: boolean;
  priceError: string | null;
  change: number | null;
  percentChange: number | null;
}

export interface PortfolioSummary {
  totalCost: string;
  totalValue: string;
  totalUnrealized: string;
  totalRealized: string;
  totalReturnPct: string;
  positionCount: number;
}

export interface PortfolioResponse {
  summary: PortfolioSummary;
  positions: Position[];
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string | null;
  exchange: string | null;
  industry: string | null;
  currency: string | null;
}

export interface Quote {
  symbol: string;
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  fetchedAt: string;
}
