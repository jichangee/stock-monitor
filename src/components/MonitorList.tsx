'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getStockMonitors, updateStockMonitor, deleteStockMonitor, markMetricNotificationSent, resetMonitorNotifications } from '@/lib/stockMonitor';
import { fetchBatchStockData } from '@/lib/stockApi';
import { sendStockMonitorNotification } from '@/lib/notifications';
import { StockMonitor, StockData, MonitorMetric } from '@/types/stock';
import { toast } from 'sonner';
import { Trash2, BellOff, Edit, TrendingUp, DollarSign, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { isWithinTradingHours, getTradingStatus, formatTime, isNewTradingDay } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

interface MonitorListProps {
  refreshTrigger: number;
  onEditMonitor: (monitor: StockMonitor) => void;
}

export function MonitorList({ refreshTrigger, onEditMonitor }: MonitorListProps) {
  const { settings } = useSettings();
  const [monitors, setMonitors] = useState<StockMonitor[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMonitors();
  }, [refreshTrigger]);

  const loadMonitors = () => {
    const loadedMonitors = getStockMonitors();
    setMonitors(loadedMonitors);
  };

  const checkAndSendNotification = useCallback((monitor: StockMonitor, stockData: StockData) => {
    if (!isWithinTradingHours()) {
      return;
    }
    
    // 检查是否为新的交易日，如果是则重置所有指标的通知状态
    if (isNewTradingDay(monitor.lastNotificationDate)) {
      resetMonitorNotifications(monitor.id);
      // 重新加载监控数据以获取更新后的状态
      loadMonitors();
      return; // 本次不发送通知，等待下次更新
    }
    
    // 检查每个指标
    monitor.metrics.forEach(metric => {
      if (!metric.isActive || metric.notificationSent) {
        return;
      }
      
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
        markMetricNotificationSent(monitor.id, metric.id);
        toast.success(`${monitor.name} - ${getMetricDisplayName(metric)} 提醒已发送！`);
      }
    });
  }, []);

  const updateStockData = useCallback(async () => {
    if (!isWithinTradingHours()) {
      console.log('非交易时间，跳过数据更新');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 获取所有活跃监控的股票代码
      const activeCodes = monitors.filter(m => m.isActive).map(m => m.code);
      
      if (activeCodes.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // 批量获取股票数据
      const newStockData = await fetchBatchStockData(activeCodes);
      
      // 检查每个监控是否需要发送通知
      for (const monitor of monitors.filter(m => m.isActive)) {
        const data = newStockData[monitor.code];
        if (data) {
          checkAndSendNotification(monitor, data);
        }
      }
      
      setStockData(newStockData);
      
    } catch (error) {
      console.error('批量获取股票数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [monitors, checkAndSendNotification]);

  useEffect(() => {
    if (monitors.length > 0 && isWithinTradingHours()) {
      const interval = setInterval(updateStockData, settings.updateInterval * 1000); // 使用设置中的更新间隔
      return () => clearInterval(interval);
    }
  }, [monitors, updateStockData, settings.updateInterval]);

  const toggleMonitor = async (monitor: StockMonitor) => {
    const updated = updateStockMonitor(monitor.id, { 
      isActive: !monitor.isActive
    });
    
    if (updated) {
      loadMonitors();
      toast.success(`监控已${updated.isActive ? '启用' : '禁用'}`);
    }
  };

  const toggleMetric = async (monitor: StockMonitor, metricId: string) => {
    const updatedMetrics = monitor.metrics.map(metric => 
      metric.id === metricId 
        ? { ...metric, isActive: !metric.isActive }
        : metric
    );
    
    const updated = updateStockMonitor(monitor.id, { metrics: updatedMetrics });
    
    if (updated) {
      loadMonitors();
      toast.success('指标状态已更新');
    }
  };

  const handleDelete = (monitor: StockMonitor) => {
    if (confirm(`确定要删除对 ${monitor.name} 的监控吗？`)) {
      deleteStockMonitor(monitor.id);
      loadMonitors();
      toast.success('监控已删除');
    }
  };

  const resetMetricNotification = (monitor: StockMonitor, metricId: string) => {
    const updatedMetrics = monitor.metrics.map(metric => 
      metric.id === metricId 
        ? { ...metric, notificationSent: false }
        : metric
    );
    
    updateStockMonitor(monitor.id, { metrics: updatedMetrics });
    loadMonitors();
    toast.success('通知状态已重置');
  };

  const handleEdit = (monitor: StockMonitor) => {
    onEditMonitor(monitor);
  };

  const getMetricDisplayName = (metric: MonitorMetric): string => {
    switch (metric.type) {
      case 'price':
        return `价格${metric.condition === 'above' ? '高于' : '低于'}¥${metric.targetPrice?.toFixed(3)}`;
      case 'premium':
        return `溢价${metric.condition === 'above' ? '高于' : '低于'}${metric.premiumThreshold?.toFixed(2)}%`;
      case 'changePercent':
        return `涨跌幅${metric.condition === 'above' ? '高于' : '低于'}${metric.changePercentThreshold?.toFixed(2)}%`;
      default:
        return '未知指标';
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'price':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'premium':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'changePercent':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCurrentValue = (metric: MonitorMetric, data: StockData | undefined) => {
    if (!data) return null;

    switch (metric.type) {
      case 'price':
        return {
          value: data.currentPrice,
          unit: '¥',
          format: (val: number) => val.toFixed(3)
        };
      case 'premium':
        return {
          value: data.premium,
          unit: '%',
          format: (val: number) => val.toFixed(2)
        };
      case 'changePercent':
        return {
          value: data.changePercent,
          unit: '%',
          format: (val: number) => val.toFixed(2)
        };
      default:
        return null;
    }
  };

  if (monitors.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            暂无监控项目，请添加一个股票监控
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{getTradingStatus()}</span>
        </div>
        <div className="flex items-center gap-2">
          
          <Button 
            onClick={updateStockData} 
            disabled={isLoading || !isWithinTradingHours()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '更新中...' : '手动更新'}
          </Button>
          <div className="text-sm text-muted-foreground">
            共 {monitors.length} 个监控项目
          </div>
        </div>
      </div>
      
      {/* 监控列表 - 改为列表形式 */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* 添加水平滚动容器 */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]"> {/* 减小最小宽度 */}
            <div className="bg-muted/50 px-4 py-2 border-b">
              <div className="grid grid-cols-12 gap-1 text-xs font-medium text-muted-foreground">
                <div className="col-span-3">股票信息</div>
                <div className="col-span-2">价格</div>
                <div className="col-span-2">涨跌</div>
                <div className="col-span-1">溢价</div>
                <div className="col-span-3">指标</div>
                <div className="col-span-1">操作</div>
              </div>
            </div>
            
            <div className="divide-y">
              {monitors.map((monitor) => {
                const currentData = stockData[monitor.code];
                const activeMetrics = monitor.metrics.filter(m => m.isActive);
                const triggeredMetrics = monitor.metrics.filter(metric => {
                  if (!currentData || !metric.isActive || metric.notificationSent) return false;
                  
                  switch (metric.type) {
                    case 'price':
                      if (metric.condition === 'above') {
                        return currentData.currentPrice >= (metric.targetPrice || 0);
                      } else {
                        return currentData.currentPrice <= (metric.targetPrice || 0);
                      }
                    case 'premium':
                      if (metric.condition === 'above') {
                        return currentData.premium >= (metric.premiumThreshold || 0);
                      } else {
                        return currentData.premium <= (metric.premiumThreshold || 0);
                      }
                    case 'changePercent':
                      if (metric.condition === 'above') {
                        return currentData.changePercent >= (metric.changePercentThreshold || 0);
                      } else {
                        return currentData.changePercent <= (metric.changePercentThreshold || 0);
                      }
                    default:
                      return false;
                  }
                });
                
                return (
                  <div key={monitor.id} className={`px-4 py-3 hover:bg-muted/30 transition-colors ${
                    triggeredMetrics.length > 0 ? 'bg-green-50 dark:bg-green-950/20' : ''
                  }`}>
                    <div className="grid grid-cols-12 gap-1 items-center">
                      {/* 股票信息 */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <div className="font-medium text-sm truncate">{monitor.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {monitor.code}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Switch
                            checked={monitor.isActive}
                            onCheckedChange={() => toggleMonitor(monitor)}
                            className="scale-75"
                          />
                          <Badge variant={monitor.isActive ? 'default' : 'secondary'} className="text-xs">
                            {monitor.isActive ? '监控中' : '已暂停'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* 当前价格 */}
                      <div className="col-span-2">
                        {currentData ? (
                          <div className="font-semibold text-sm">¥{currentData.currentPrice.toFixed(3)}</div>
                        ) : (
                          <div className="text-muted-foreground text-sm">--</div>
                        )}
                      </div>
                      
                      {/* 涨跌幅 */}
                      <div className="col-span-2">
                        {currentData ? (
                          <div className={`font-semibold text-sm ${
                            currentData.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                          {currentData.changePercent >= 0 ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                        </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">--</div>
                        )}
                      </div>
                      
                      {/* 溢价 */}
                      <div className="col-span-1">
                        {currentData ? (
                          <div className="font-semibold text-sm">{currentData.premium.toFixed(2)}%</div>
                        ) : (
                          <div className="text-muted-foreground text-sm">--</div>
                        )}
                      </div>
                      
                      {/* 监控指标 */}
                      <div className="col-span-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {activeMetrics.length}/{monitor.metrics.length}
                        </div>
                        <div className="space-y-1">
                          {monitor.metrics.length === 0 ? (
                            <div className="text-xs text-muted-foreground p-1 rounded bg-muted/30">
                              无指标
                            </div>
                          ) : (
                            <>
                              {monitor.metrics.slice(0, 1).map((metric) => {
                                const currentValue = getCurrentValue(metric, currentData);
                                const isTriggered = currentValue && (() => {
                                  switch (metric.type) {
                                    case 'price':
                                      if (metric.condition === 'above') {
                                        return currentValue.value >= (metric.targetPrice || 0);
                                      } else {
                                        return currentValue.value <= (metric.targetPrice || 0);
                                      }
                                    case 'premium':
                                      if (metric.condition === 'above') {
                                        return currentValue.value >= (metric.premiumThreshold || 0);
                                      } else {
                                        return currentValue.value <= (metric.premiumThreshold || 0);
                                      }
                                    case 'changePercent':
                                      if (metric.condition === 'above') {
                                        return currentValue.value >= (metric.changePercentThreshold || 0);
                                      } else {
                                        return currentValue.value <= (metric.changePercentThreshold || 0);
                                      }
                                    default:
                                      return false;
                                  }
                                })();
                                
                                return (
                                  <div key={metric.id} className={`text-xs p-1 rounded ${
                                    metric.notificationSent ? 'bg-green-100 dark:bg-green-900/30' : ''
                                  } ${isTriggered ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`}>
                                    <div className="flex items-center gap-1">
                                      {getMetricIcon(metric.type)}
                                      <span className="truncate">{getMetricDisplayName(metric)}</span>
                                      {isTriggered && <span className="text-orange-600">⚠️</span>}
                                      {metric.notificationSent && <span className="text-green-600">✓</span>}
                                      {metric.notificationSent && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => resetMetricNotification(monitor, metric.id)}
                                          className="h-4 w-4 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                          title="重置通知状态"
                                        >
                                          <RefreshCw className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {monitor.metrics.length > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  +{monitor.metrics.length - 1}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(monitor)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(monitor)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 更新时间 */}
                    {currentData && (
                      <div className="text-xs text-muted-foreground mt-2">
                        更新时间: {formatTime(new Date(currentData.timestamp))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* 数据更新时间提示 */}
      {monitors.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {isWithinTradingHours() 
            ? `数据每${settings.updateInterval}秒自动更新，触发条件的监控项会高亮显示`
            : '非交易时间，数据更新已暂停'
          }
        </div>
      )}
    </div>
  );
}
