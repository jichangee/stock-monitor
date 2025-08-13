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
  // 验证输入数据
  if (!monitor.code || !monitor.name) {
    throw new Error('股票代码和名称不能为空');
  }
  
  // 根据监控类型验证相应字段
  if (monitor.monitorType === 'price') {
    if (!monitor.targetPrice || monitor.targetPrice <= 0) {
      throw new Error('价格监控需要有效的目标价格');
    }
  } else if (monitor.monitorType === 'premium') {
    if (!monitor.premiumThreshold || monitor.premiumThreshold <= 0) {
      throw new Error('溢价监控需要有效的溢价阈值');
    }
  } else if (monitor.monitorType === 'changePercent') {
    if (!monitor.changePercentThreshold || monitor.changePercentThreshold <= 0) {
      throw new Error('涨跌幅监控需要有效的涨跌幅阈值');
    }
  } else {
    throw new Error('无效的监控类型');
  }
  
  try {
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
  } catch (error) {
    console.error('添加监控失败:', error);
    throw new Error('保存监控数据失败，请重试');
  }
}

export function updateStockMonitor(id: string, updates: Partial<StockMonitor>): StockMonitor | null {
  if (!id) {
    console.error('更新监控失败: 缺少监控ID');
    return null;
  }
  
  try {
    const monitors = getStockMonitors();
    const index = monitors.findIndex(m => m.id === id);
    
    if (index === -1) {
      console.error('更新监控失败: 未找到指定的监控');
      return null;
    }
    
    // 验证更新数据
    if (updates.code && !updates.code.trim()) {
      throw new Error('股票代码不能为空');
    }
    
    if (updates.name && !updates.name.trim()) {
      throw new Error('股票名称不能为空');
    }
    
    // 根据监控类型验证相应字段
    if (updates.monitorType === 'price') {
      if (updates.targetPrice !== undefined && updates.targetPrice <= 0) {
        throw new Error('价格监控需要有效的目标价格');
      }
    } else if (updates.monitorType === 'premium') {
      if (updates.premiumThreshold !== undefined && updates.premiumThreshold <= 0) {
        throw new Error('溢价监控需要有效的溢价阈值');
      }
    } else if (updates.monitorType === 'changePercent') {
      if (updates.changePercentThreshold !== undefined && updates.changePercentThreshold <= 0) {
        throw new Error('涨跌幅监控需要有效的涨跌幅阈值');
      }
    }
    
    monitors[index] = {
      ...monitors[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveStockMonitors(monitors);
    return monitors[index];
  } catch (error) {
    console.error('更新监控失败:', error);
    throw error; // 重新抛出错误，让调用者处理
  }
}

export function deleteStockMonitor(id: string): boolean {
  const monitors = getStockMonitors();
  const filtered = monitors.filter(m => m.id !== id);
  
  if (filtered.length === monitors.length) return false;
  
  saveStockMonitors(filtered);
  return true;
}
