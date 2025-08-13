'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getStockMonitors, updateStockMonitor, deleteStockMonitor } from '@/lib/stockMonitor';
import { fetchStockData } from '@/lib/stockApi';
import { sendNotification } from '@/lib/notifications';
import { StockMonitor, StockData } from '@/types/stock';
import { toast } from 'sonner';
import { Trash2, BellOff, Edit, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';

interface MonitorListProps {
  refreshTrigger: number;
  onEditMonitor: (monitor: StockMonitor) => void;
}

export function MonitorList({ refreshTrigger, onEditMonitor }: MonitorListProps) {
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
    if (monitor.notificationSent) return;
    
    let shouldNotify = false;
    
    if (monitor.monitorType === 'price' && monitor.targetPrice !== undefined) {
      // 价格监控
      if (monitor.condition === 'above' && stockData.currentPrice >= monitor.targetPrice) {
        shouldNotify = true;
      } else if (monitor.condition === 'below' && stockData.currentPrice <= monitor.targetPrice) {
        shouldNotify = true;
      }
    } else if (monitor.monitorType === 'premium' && monitor.premiumThreshold !== undefined) {
      // 溢价监控
      const currentPremium = stockData.premium; // 直接使用溢价字段，不使用绝对值
      if (monitor.condition === 'above' && currentPremium >= monitor.premiumThreshold) {
        shouldNotify = true;
      } else if (monitor.condition === 'below' && currentPremium <= monitor.premiumThreshold) {
        shouldNotify = true;
      }
    } else if (monitor.monitorType === 'changePercent' && monitor.changePercentThreshold !== undefined) {
      // 涨跌幅监控
      if (monitor.condition === 'above' && stockData.changePercent >= monitor.changePercentThreshold) {
        shouldNotify = true;
      } else if (monitor.condition === 'below' && stockData.changePercent <= monitor.changePercentThreshold) {
        shouldNotify = true;
      }
    }
    
    if (shouldNotify) {
      let notificationTitle = '';
      let notificationBody = '';
      
      if (monitor.monitorType === 'price' && monitor.targetPrice !== undefined) {
        const conditionText = monitor.condition === 'above' ? '高于' : '低于';
        notificationTitle = '股票价格提醒';
        notificationBody = `${monitor.name}(${monitor.code}) 当前价格 ${stockData.currentPrice.toFixed(3)} 已${conditionText}目标价格 ${monitor.targetPrice.toFixed(3)}`;
      } else if (monitor.monitorType === 'premium') {
        const conditionText = monitor.condition === 'above' ? '高于' : '低于';
        notificationTitle = '股票溢价提醒';
        notificationBody = `${monitor.name}(${monitor.code}) 当前溢价 ${stockData.premium.toFixed(2)}% 已${conditionText}阈值 ${monitor.premiumThreshold?.toFixed(2)}%`;
      } else {
        const conditionText = monitor.condition === 'above' ? '高于' : '低于';
        notificationTitle = '股票涨跌幅提醒';
        notificationBody = `${monitor.name}(${monitor.code}) 当前涨跌幅 ${stockData.changePercent.toFixed(2)}% 已${conditionText}阈值 ${monitor.changePercentThreshold?.toFixed(2)}%`;
      }
      
      sendNotification(notificationTitle, notificationBody);
      
      // 标记通知已发送
      updateStockMonitor(monitor.id, { notificationSent: true });
      loadMonitors(); // 重新加载列表
      
      toast.success(`${monitor.name} 提醒已发送！`);
    }
  }, []);

  const updateStockData = useCallback(async () => {
    setIsLoading(true);
    const newStockData: Record<string, StockData> = {};
    
    for (const monitor of monitors.filter(m => m.isActive)) {
      try {
        const data = await fetchStockData(monitor.code);
        if (data) {
          newStockData[monitor.code] = data;
          
          // 检查是否需要发送通知
          checkAndSendNotification(monitor, data);
        }
      } catch (error) {
        console.error(`获取${monitor.code}数据失败:`, error);
      }
    }
    
    setStockData(newStockData);
    setIsLoading(false);
  }, [monitors, checkAndSendNotification]);

  useEffect(() => {
    if (monitors.length > 0) {
      const interval = setInterval(updateStockData, 10000); // 每10秒更新一次
      return () => clearInterval(interval);
    }
  }, [monitors, updateStockData]);

  const toggleMonitor = async (monitor: StockMonitor) => {
    const updated = updateStockMonitor(monitor.id, { 
      isActive: !monitor.isActive,
      notificationSent: false // 重置通知状态
    });
    
    if (updated) {
      loadMonitors();
      toast.success(`监控已${updated.isActive ? '启用' : '禁用'}`);
    }
  };

  const handleDelete = (monitor: StockMonitor) => {
    if (confirm(`确定要删除对 ${monitor.name} 的监控吗？`)) {
      deleteStockMonitor(monitor.id);
      loadMonitors();
      toast.success('监控已删除');
    }
  };

  const resetNotification = (monitor: StockMonitor) => {
    updateStockMonitor(monitor.id, { notificationSent: false });
    loadMonitors();
    toast.success('通知状态已重置');
  };

  const handleEdit = (monitor: StockMonitor) => {
    onEditMonitor(monitor);
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">监控列表</h2>
        <Button 
          onClick={updateStockData} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '更新中...' : '手动更新'}
        </Button>
      </div>
      
      {/* 表格形式的监控列表 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">股票</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">监控类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">目标值</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">当前价格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">涨跌幅</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">溢价</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monitors.map((monitor) => {
                const currentData = stockData[monitor.code];
                let isTriggered = false;
                
                if (currentData) {
                  if (monitor.monitorType === 'price' && monitor.targetPrice !== undefined) {
                    isTriggered = (monitor.condition === 'above' && currentData.currentPrice >= monitor.targetPrice) ||
                                 (monitor.condition === 'below' && currentData.currentPrice <= monitor.targetPrice);
                  } else if (monitor.monitorType === 'premium' && monitor.premiumThreshold !== undefined) {
                    const currentPremium = currentData.premium;
                    isTriggered = (monitor.condition === 'above' && currentPremium >= monitor.premiumThreshold) ||
                                 (monitor.condition === 'below' && currentPremium <= monitor.premiumThreshold);
                  } else if (monitor.monitorType === 'changePercent' && monitor.changePercentThreshold !== undefined) {
                    isTriggered = (monitor.condition === 'above' && currentData.changePercent >= monitor.changePercentThreshold) ||
                                 (monitor.condition === 'below' && currentData.changePercent <= monitor.changePercentThreshold);
                  }
                }
                
                return (
                  <tr 
                    key={monitor.id} 
                    className={`hover:bg-muted/30 transition-colors ${
                      isTriggered ? 'bg-green-50 dark:bg-green-950/20' : ''
                    }`}
                  >
                    {/* 股票信息 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {monitor.monitorType === 'price' ? (
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        ) : monitor.monitorType === 'premium' ? (
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        )}
                        <div>
                          <div className="font-medium">{monitor.name}</div>
                          <div className="text-sm text-muted-foreground">{monitor.code}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* 监控类型 */}
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {monitor.monitorType === 'price' ? '价格监控' : 
                         monitor.monitorType === 'premium' ? '溢价监控' : '涨跌幅监控'}
                      </Badge>
                    </td>
                    
                    {/* 目标值 */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium">
                          {monitor.monitorType === 'price' 
                            ? `¥${monitor.targetPrice?.toFixed(3) || '--'}`
                            : monitor.monitorType === 'premium'
                            ? `${monitor.premiumThreshold?.toFixed(2)}%`
                            : `${monitor.changePercentThreshold?.toFixed(2)}%`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {monitor.condition === 'above' ? '高于目标' : '低于目标'}
                        </div>
                      </div>
                    </td>
                    
                    {/* 当前价格 */}
                    <td className="px-4 py-3">
                      {currentData ? (
                        <div className={`font-medium ${isTriggered ? 'text-green-600' : ''}`}>
                          ¥{currentData.currentPrice.toFixed(3)}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">--</div>
                      )}
                    </td>
                    
                    {/* 涨跌幅 */}
                    <td className="px-4 py-3">
                      {currentData ? (
                        <div className={`font-medium ${
                          currentData.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {currentData.changePercent >= 0 ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">--</div>
                      )}
                    </td>
                    
                    {/* 溢价 */}
                    <td className="px-4 py-3">
                      {currentData ? (
                        <div className="font-medium">{currentData.premium.toFixed(2)}%</div>
                      ) : (
                        <div className="text-muted-foreground text-sm">--</div>
                      )}
                    </td>
                    
                    {/* 状态 */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={monitor.isActive}
                            onCheckedChange={() => toggleMonitor(monitor)}
                          />
                          <Badge variant={monitor.isActive ? 'default' : 'secondary'} className="text-xs">
                            {monitor.isActive ? '监控中' : '已暂停'}
                          </Badge>
                        </div>
                        {monitor.notificationSent && (
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                            已通知
                          </Badge>
                        )}
                      </div>
                    </td>
                    
                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(monitor)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {monitor.notificationSent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetNotification(monitor)}
                            className="h-8 w-8 p-0"
                            title="重置通知"
                          >
                            <BellOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(monitor)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 数据更新时间提示 */}
      {monitors.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          数据每10秒自动更新，触发条件的监控项会高亮显示
        </div>
      )}
    </div>
  );
}
