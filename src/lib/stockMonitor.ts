import { StockMonitor } from '@/types/stock';

export async function getStockMonitors(): Promise<StockMonitor[]> {
  try {
    const response = await fetch('/api/monitor');
    if (!response.ok) {
      throw new Error('Failed to fetch monitors');
    }
    const data = await response.json();
    return (Array.isArray(data) ? data : []).map((m: any) => ({
      ...m,
      metrics: Array.isArray(m?.metrics) ? m.metrics : [],
      createdAt: m?.createdAt ? new Date(m.createdAt) : undefined,
      updatedAt: m?.updatedAt ? new Date(m.updatedAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch monitors from API:', error);
    return [];
  }
}

export async function addStockMonitor(monitor: Omit<StockMonitor, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockMonitor> {
  try {
    const response = await fetch('/api/monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(monitor),
    });

    if (!response.ok) {
      throw new Error('Failed to add monitor');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to add monitor via API:', error);
    throw error;
  }
}

export async function updateStockMonitor(id: string, updates: Partial<StockMonitor>): Promise<StockMonitor | null> {
  try {
    const response = await fetch('/api/monitor', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to update monitor');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update monitor via API:', error);
    return null;
  }
}

export async function deleteStockMonitor(id: string): Promise<boolean> {
  try {
    const response = await fetch('/api/monitor', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete monitor via API:', error);
    return false;
  }
}

// 重置监控的通知状态
export async function resetMonitorNotifications(monitorId: string): Promise<void> {
  const monitors = await getStockMonitors();
  const monitor = monitors.find(m => m.id === monitorId);

  if (monitor) {
    (monitor.metrics || []).forEach(metric => {
      metric.notificationSent = false;
    });
    
    monitor.lastNotificationDate = new Date().toISOString();
    await updateStockMonitor(monitorId, monitor);
  }
}

// 标记指标已发送通知
export async function markMetricNotificationSent(monitorId: string, metricId: string): Promise<void> {
  const monitors = await getStockMonitors();
  const monitor = monitors.find(m => m.id === monitorId);

  if (monitor) {
    const metric = (monitor.metrics || []).find(m => m.id === metricId);
    if (metric) {
      metric.notificationSent = true;
      monitor.lastNotificationDate = new Date().toISOString();
      await updateStockMonitor(monitorId, monitor);
    }
  }
}

