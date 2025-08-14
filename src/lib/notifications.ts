import { StockMonitor, MonitorMetric, StockData } from '@/types/stock';
import { isWithinTradingHours, formatTime, formatDate } from '@/lib/utils';

export function sendNotification(title: string, body: string): void {
  // 检查浏览器是否支持通知
  if (!('Notification' in window)) {
    console.log('此浏览器不支持桌面通知');
    return;
  }
  
  // 检查通知权限
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return Promise.resolve(false);
  }
  
  if (Notification.permission === 'granted') {
    return Promise.resolve(true);
  }
  
  if (Notification.permission === 'denied') {
    return Promise.resolve(false);
  }
  
  return Notification.requestPermission().then(permission => permission === 'granted');
}

// 发送股票监控通知
export function sendStockMonitorNotification(monitor: StockMonitor, metric: MonitorMetric, stockData: StockData): void {
  if (!isWithinTradingHours()) {
    console.log('非交易时间，不发送通知');
    return;
  }
  
  const now = new Date();
  const timeStr = formatTime(now);
  const dateStr = formatDate(now);
  
  let title = '';
  let body = '';
  
  switch (metric.type) {
    case 'price':
      title = `股票价格提醒 - ${monitor.name}(${monitor.code})`;
      body = `${dateStr} ${timeStr}\n当前价格: ¥${stockData.currentPrice}\n目标价格: ¥${metric.targetPrice}\n条件: ${metric.condition === 'above' ? '高于' : '低于'}`;
      break;
      
    case 'premium':
      title = `股票溢价提醒 - ${monitor.name}(${monitor.code})`;
      body = `${dateStr} ${timeStr}\n当前溢价: ${stockData.premium}%\n阈值: ${metric.premiumThreshold}%\n条件: ${metric.condition === 'above' ? '高于' : '低于'}`;
      break;
      
    case 'changePercent':
      title = `股票涨跌幅提醒 - ${monitor.name}(${monitor.code})`;
      body = `${dateStr} ${timeStr}\n当前涨跌幅: ${stockData.changePercent}%\n阈值: ${metric.changePercentThreshold}%\n条件: ${metric.condition === 'above' ? '高于' : '低于'}`;
      break;
  }
  
  sendNotification(title, body);
}

// 批量发送监控通知
export function sendBatchMonitorNotifications(monitors: StockMonitor[], stockDataMap: Record<string, StockData>): void {
  if (!isWithinTradingHours()) {
    console.log('非交易时间，不发送通知');
    return;
  }
  
  monitors.forEach(monitor => {
    if (!monitor.isActive) return;
    
    const stockData = stockDataMap[monitor.code];
    if (!stockData) return;
    
    monitor.metrics.forEach(metric => {
      if (!metric.isActive || metric.notificationSent) return;
      
      let shouldNotify = false;
      
      switch (metric.type) {
        case 'price':
          if (metric.condition === 'above') {
            shouldNotify = stockData.currentPrice >= (metric.targetPrice || 0);
          } else {
            shouldNotify = stockData.currentPrice <= (metric.targetPrice || 0);
          }
          break;
          
        case 'premium':
          if (metric.condition === 'above') {
            shouldNotify = stockData.premium >= (metric.premiumThreshold || 0);
          } else {
            shouldNotify = stockData.premium <= (metric.premiumThreshold || 0);
          }
          break;
          
        case 'changePercent':
          if (metric.condition === 'above') {
            shouldNotify = stockData.changePercent >= (metric.changePercentThreshold || 0);
          } else {
            shouldNotify = stockData.changePercent <= (metric.changePercentThreshold || 0);
          }
          break;
      }
      
      if (shouldNotify) {
        sendStockMonitorNotification(monitor, metric, stockData);
      }
    });
  });
}
