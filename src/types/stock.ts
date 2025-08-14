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

// 单个监控指标
export interface MonitorMetric {
  id: string;
  type: 'price' | 'premium' | 'changePercent';
  targetPrice?: number; // 价格监控时使用
  condition: 'above' | 'below';
  premiumThreshold?: number; // 溢价阈值（百分比）
  changePercentThreshold?: number; // 涨跌幅阈值（百分比）
  isActive: boolean;
  notificationSent: boolean;
}

export interface StockMonitor {
  id: string;
  code: string;
  name: string;
  metrics: MonitorMetric[]; // 支持多个指标
  isActive: boolean;
  lastNotificationDate?: string; // 最后通知日期，用于每日重置
  createdAt: Date;
  updatedAt: Date;
}

// 兼容旧版本的接口
export interface LegacyStockMonitor {
  id: string;
  code: string;
  name: string;
  targetPrice?: number;
  condition: 'above' | 'below';
  monitorType: 'price' | 'premium' | 'changePercent';
  premiumThreshold?: number;
  changePercentThreshold?: number;
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
  metrics: MonitorMetric[];
}
