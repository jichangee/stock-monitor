'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getStockMonitors, updateStockMonitor, deleteStockMonitor, markMetricNotificationSent } from '@/lib/stockMonitor';
import { fetchBatchStockData } from '@/lib/stockApi';
import { sendStockMonitorNotification } from '@/lib/notifications';
import { StockMonitor, StockData, MonitorMetric } from '@/types/stock';
import { toast } from 'sonner';
import { Trash2, BellOff, Edit, TrendingUp, DollarSign, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { isWithinTradingHours, getTradingStatus, formatTime } from '@/lib/utils';
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
    <div className="space-y-4">
      {/* 交易状态显示 */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{getTradingStatus()}</span>
        </div>
        <Button 
          onClick={updateStockData} 
          disabled={isLoading || !isWithinTradingHours()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '更新中...' : '手动更新'}
        </Button>
      </div>
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">监控列表</h2>
        <div className="text-sm text-muted-foreground">
          共 {monitors.length} 个监控项目
        </div>
      </div>
      
      {/* 监控列表 */}
      <div className="space-y-4">
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
            <Card key={monitor.id} className={`transition-all ${
              triggeredMetrics.length > 0 ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20' : ''
            }`}>
              <CardContent className="p-6">
                {/* 监控头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">{monitor.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {monitor.code}
                      </Badge>
                    </div>
                    <Switch
                      checked={monitor.isActive}
                      onCheckedChange={() => toggleMonitor(monitor)}
                    />
                    <Badge variant={monitor.isActive ? 'default' : 'secondary'}>
                      {monitor.isActive ? '监控中' : '已暂停'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(monitor)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(monitor)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 当前股票数据 */}
                {currentData && (
                  <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">当前价格</div>
                      <div className="font-semibold">¥{currentData.currentPrice.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">涨跌幅</div>
                      <div className={`font-semibold ${
                        currentData.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {currentData.changePercent >= 0 ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">溢价</div>
                      <div className="font-semibold">{currentData.premium.toFixed(2)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">更新时间</div>
                      <div className="text-xs">{formatTime(new Date(currentData.timestamp))}</div>
                    </div>
                  </div>
                )}

                {/* 监控指标列表 */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    监控指标 ({activeMetrics.length}/{monitor.metrics.length})
                  </div>
                  
                  {monitor.metrics.map((metric) => {
                    // 获取当前指标数值
                    const getCurrentValue = () => {
                      if (!currentData) return null;
                      
                      switch (metric.type) {
                        case 'price':
                          return {
                            value: currentData.currentPrice,
                            unit: '¥',
                            format: (val: number) => val.toFixed(3)
                          };
                        case 'premium':
                          return {
                            value: currentData.premium,
                            unit: '%',
                            format: (val: number) => val.toFixed(2)
                          };
                        case 'changePercent':
                          return {
                            value: currentData.changePercent,
                            unit: '%',
                            format: (val: number) => val.toFixed(2)
                          };
                        default:
                          return null;
                      }
                    };

                    const currentValue = getCurrentValue();
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
                      <div key={metric.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                        metric.notificationSent ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : ''
                      } ${isTriggered ? 'ring-2 ring-orange-400 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          {getMetricIcon(metric.type)}
                          <div>
                            <div className="font-medium">{getMetricDisplayName(metric)}</div>
                            <div className="text-xs text-muted-foreground">
                              {metric.condition === 'above' ? '高于目标时通知' : '低于目标时通知'}
                            </div>
                            {/* 当前数值显示 */}
                            {currentValue && (
                              <div className="text-xs mt-1">
                                <span className="text-muted-foreground">当前: </span>
                                <span className={`font-medium ${
                                  isTriggered ? 'text-orange-600' : 'text-foreground'
                                }`}>
                                  {currentValue.unit}{currentValue.format(currentValue.value)}
                                </span>
                                {isTriggered && (
                                  <span className="text-orange-600 ml-1">⚠️ 已触发</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={metric.isActive}
                            onCheckedChange={() => toggleMetric(monitor, metric.id)}
                          />
                          
                          {metric.notificationSent && (
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                              已通知
                            </Badge>
                          )}
                          
                          {metric.notificationSent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetMetricNotification(monitor, metric.id)}
                              className="h-6 w-6 p-0"
                              title="重置通知"
                            >
                              <BellOff className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
