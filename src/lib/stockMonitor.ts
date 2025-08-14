import { StockMonitor, MonitorMetric, LegacyStockMonitor, StockData } from '@/types/stock';
import { isWithinTradingHours, isNewTradingDay } from '@/lib/utils';

const STORAGE_KEY = 'stock-monitors';

// 数据迁移函数，将旧版本数据转换为新版本
function migrateMonitorData(monitor: Record<string, unknown>): StockMonitor {
  // 检查是否为新版本数据
  if ('metrics' in monitor) {
    return {
      ...monitor,
      createdAt: new Date(monitor.createdAt as string),
      updatedAt: new Date(monitor.updatedAt as string)
    } as StockMonitor;
  }
  
  // 旧版本数据迁移
  const legacyMonitor = monitor as unknown as LegacyStockMonitor;
  const metric: MonitorMetric = {
    id: crypto.randomUUID(),
    type: legacyMonitor.monitorType,
    targetPrice: legacyMonitor.targetPrice,
    condition: legacyMonitor.condition,
    premiumThreshold: legacyMonitor.premiumThreshold,
    changePercentThreshold: legacyMonitor.changePercentThreshold,
    isActive: legacyMonitor.isActive,
    notificationSent: legacyMonitor.notificationSent
  };
  
  return {
    id: legacyMonitor.id,
    code: legacyMonitor.code,
    name: legacyMonitor.name,
    metrics: [metric],
    isActive: legacyMonitor.isActive,
    lastNotificationDate: legacyMonitor.notificationSent ? new Date().toISOString() : undefined,
    createdAt: new Date(legacyMonitor.createdAt as unknown as string),
    updatedAt: new Date(legacyMonitor.updatedAt as unknown as string)
  };
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
  
  if (!monitor.metrics || monitor.metrics.length === 0) {
    throw new Error('至少需要添加一个监控指标');
  }
  
  // 验证每个指标
  for (const metric of monitor.metrics) {
    if (metric.type === 'price') {
      if (!metric.targetPrice || metric.targetPrice <= 0) {
        throw new Error('价格监控需要有效的目标价格');
      }
    } else if (metric.type === 'premium') {
      if (!metric.premiumThreshold || metric.premiumThreshold <= 0) {
        throw new Error('溢价监控需要有效的溢价阈值');
      }
    } else if (metric.type === 'changePercent') {
      if (metric.changePercentThreshold === undefined || metric.changePercentThreshold === 0) {
        throw new Error('涨跌幅监控需要有效的涨跌幅阈值');
      }
    } else {
      throw new Error('无效的监控类型');
    }
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
    
    if (updates.metrics) {
      if (updates.metrics.length === 0) {
        throw new Error('至少需要保留一个监控指标');
      }
      
      // 验证每个指标
      for (const metric of updates.metrics) {
        if (metric.type === 'price') {
          if (!metric.targetPrice || metric.targetPrice <= 0) {
            throw new Error('价格监控需要有效的目标价格');
          }
        } else if (metric.type === 'premium') {
          if (!metric.premiumThreshold || metric.premiumThreshold <= 0) {
            throw new Error('溢价监控需要有效的溢价阈值');
          }
        } else if (metric.type === 'changePercent') {
          if (metric.changePercentThreshold === undefined || metric.changePercentThreshold === 0) {
            throw new Error('涨跌幅监控需要有效的涨跌幅阈值');
          }
        }
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
    throw error;
  }
}

export function deleteStockMonitor(id: string): boolean {
  const monitors = getStockMonitors();
  const filtered = monitors.filter(m => m.id !== id);
  
  if (filtered.length === monitors.length) return false;
  
  saveStockMonitors(filtered);
  return true;
}

// 检查监控条件是否满足
export function checkMonitorConditions(monitor: StockMonitor, stockData: StockData): boolean {
  // 检查是否在交易时间内
  if (!isWithinTradingHours()) {
    return false;
  }
  
  // 检查是否为新的交易日，如果是则重置所有指标的通知状态
  if (isNewTradingDay(monitor.lastNotificationDate)) {
    resetMonitorNotifications(monitor.id);
  }
  
  // 检查每个指标
  for (const metric of monitor.metrics) {
    if (!metric.isActive || metric.notificationSent) {
      continue;
    }
    
    let conditionMet = false;
    
    switch (metric.type) {
      case 'price':
        if (metric.condition === 'above') {
          conditionMet = stockData.currentPrice >= (metric.targetPrice || 0);
        } else {
          conditionMet = stockData.currentPrice <= (metric.targetPrice || 0);
        }
        break;
        
      case 'premium':
        if (metric.condition === 'above') {
          conditionMet = stockData.premium >= (metric.premiumThreshold || 0);
        } else {
          conditionMet = stockData.premium <= (metric.premiumThreshold || 0);
        }
        break;
        
      case 'changePercent':
        if (metric.condition === 'above') {
          conditionMet = stockData.changePercent >= (metric.changePercentThreshold || 0);
        } else {
          conditionMet = stockData.changePercent <= (metric.changePercentThreshold || 0);
        }
        break;
    }
    
    if (conditionMet) {
      return true;
    }
  }
  
  return false;
}

// 重置监控的通知状态
export function resetMonitorNotifications(monitorId: string): void {
  const monitors = getStockMonitors();
  const monitor = monitors.find(m => m.id === monitorId);
  
  if (monitor) {
    // 重置所有指标的通知状态
    monitor.metrics.forEach(metric => {
      metric.notificationSent = false;
    });
    
    // 更新最后通知日期为今天
    monitor.lastNotificationDate = new Date().toISOString();
    monitor.updatedAt = new Date();
    
    saveStockMonitors(monitors);
  }
}

// 标记指标已发送通知
export function markMetricNotificationSent(monitorId: string, metricId: string): void {
  const monitors = getStockMonitors();
  const monitor = monitors.find(m => m.id === monitorId);
  
  if (monitor) {
    const metric = monitor.metrics.find(m => m.id === metricId);
    if (metric) {
      metric.notificationSent = true;
      monitor.lastNotificationDate = new Date().toISOString();
      monitor.updatedAt = new Date();
      saveStockMonitors(monitors);
    }
  }
}

// 获取活跃的监控列表
export function getActiveMonitors(): StockMonitor[] {
  return getStockMonitors().filter(monitor => monitor.isActive);
}
