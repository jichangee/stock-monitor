import { StockMonitor } from '@/types/stock';

const STORAGE_KEY = 'stock-monitors';

// 数据迁移函数，为现有数据添加新字段
function migrateMonitorData(monitor: Record<string, unknown>): StockMonitor {
  return {
    ...monitor,
    monitorType: (monitor.monitorType as 'price' | 'premium' | 'changePercent') || 'price',
    premiumThreshold: monitor.premiumThreshold as number | undefined,
    changePercentThreshold: monitor.changePercentThreshold as number | undefined,
    createdAt: new Date(monitor.createdAt as string),
    updatedAt: new Date(monitor.updatedAt as string)
  } as StockMonitor;
}

export function getStockMonitors(): StockMonitor[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const monitors = JSON.parse(stored);
    return monitors.map(migrateMonitorData);
  } catch (error) {
    console.error('读取监控列表失败:', error);
    return [];
  }
}

export function saveStockMonitors(monitors: StockMonitor[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(monitors));
  } catch (error) {
    console.error('保存监控列表失败:', error);
  }
}

export function addStockMonitor(monitor: Omit<StockMonitor, 'id' | 'createdAt' | 'updatedAt'>): StockMonitor {
  const newMonitor: StockMonitor = {
    ...monitor,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const monitors = getStockMonitors();
  monitors.push(newMonitor);
  saveStockMonitors(monitors);
  
  return newMonitor;
}

export function updateStockMonitor(id: string, updates: Partial<StockMonitor>): StockMonitor | null {
  const monitors = getStockMonitors();
  const index = monitors.findIndex(m => m.id === id);
  
  if (index === -1) return null;
  
  monitors[index] = {
    ...monitors[index],
    ...updates,
    updatedAt: new Date()
  };
  
  saveStockMonitors(monitors);
  return monitors[index];
}

export function deleteStockMonitor(id: string): boolean {
  const monitors = getStockMonitors();
  const filtered = monitors.filter(m => m.id !== id);
  
  if (filtered.length === monitors.length) return false;
  
  saveStockMonitors(filtered);
  return true;
}
