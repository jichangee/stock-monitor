export interface StockData {
  code: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  premium: number;
  timestamp: number;
}

export interface StockMonitor {
  id: string;
  code: string;
  name: string;
  targetPrice: number;
  condition: 'above' | 'below';
  monitorType: 'price' | 'premium'; // 新增：监控类型
  premiumThreshold?: number; // 新增：溢价阈值（百分比）
  isActive: boolean;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockApiResponse {
  code: string;
  name: string;
  current: string;
  change: string;
  changePercent: string;
  open: string;
  high: string;
  low: string;
  volume: string;
}

export interface EditMonitorData {
  code: string;
  name: string;
  targetPrice: number;
  condition: 'above' | 'below';
  monitorType: 'price' | 'premium';
  premiumThreshold?: number;
}
