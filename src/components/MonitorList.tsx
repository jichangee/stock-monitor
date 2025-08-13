'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getStockMonitors, updateStockMonitor, deleteStockMonitor } from '@/lib/stockMonitor';
import { fetchStockData } from '@/lib/stockApi';
import { sendNotification } from '@/lib/notifications';
import { StockMonitor, StockData } from '@/types/stock';
import { toast } from 'sonner';
import { Trash2, BellOff, Edit, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

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
    
    if (monitor.monitorType === 'price') {
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
      
      if (monitor.monitorType === 'price') {
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
          {isLoading ? '更新中...' : '手动更新'}
        </Button>
      </div>
      
      <div className="grid gap-4">
        {monitors.map((monitor) => {
          const currentData = stockData[monitor.code];
          let isTriggered = false;
          
          if (currentData) {
            if (monitor.monitorType === 'price') {
              isTriggered = (monitor.condition === 'above' && currentData.currentPrice >= monitor.targetPrice) ||
                           (monitor.condition === 'below' && currentData.currentPrice <= monitor.targetPrice);
            } else if (monitor.monitorType === 'premium' && monitor.premiumThreshold !== undefined) {
              const currentPremium = currentData.premium; // 使用premium字段，不使用涨跌幅的绝对值
              isTriggered = (monitor.condition === 'above' && currentPremium >= monitor.premiumThreshold) ||
                           (monitor.condition === 'below' && currentPremium <= monitor.premiumThreshold);
            } else if (monitor.monitorType === 'changePercent' && monitor.changePercentThreshold !== undefined) {
              isTriggered = (monitor.condition === 'above' && currentData.changePercent >= monitor.changePercentThreshold) ||
                           (monitor.condition === 'below' && currentData.changePercent <= monitor.changePercentThreshold);
            }
          }
          
          return (
            <Card key={monitor.id} className={`${isTriggered ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {monitor.monitorType === 'price' ? (
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    ) : monitor.monitorType === 'premium' ? (
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{monitor.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{monitor.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={monitor.isActive}
                      onCheckedChange={() => toggleMonitor(monitor)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(monitor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(monitor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 监控配置信息 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {monitor.monitorType === 'price' ? '目标价格' : 
                       monitor.monitorType === 'premium' ? '溢价阈值' : '涨跌幅阈值'}
                    </p>
                    <p className="font-semibold">
                      {monitor.monitorType === 'price' 
                        ? monitor.targetPrice.toFixed(3)
                        : monitor.monitorType === 'premium'
                        ? `${monitor.premiumThreshold?.toFixed(3)}%`
                        : `${monitor.changePercentThreshold?.toFixed(2)}%`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">监控条件</p>
                    <p className="font-semibold">
                      {monitor.condition === 'above' 
                        ? (monitor.monitorType === 'price' ? '价格高于目标' : 
                           monitor.monitorType === 'premium' ? '溢价高于阈值' : '涨跌幅高于阈值')
                        : (monitor.monitorType === 'price' ? '价格低于目标' : 
                           monitor.monitorType === 'premium' ? '溢价低于阈值' : '涨跌幅低于阈值')
                      }
                    </p>
                  </div>
                </div>
                
                {/* 实时数据信息 - 常显 */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-sm mb-3 text-foreground">实时数据</h4>
                  {currentData ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">当前股价</p>
                        <p className={`font-semibold text-lg ${isTriggered ? 'text-green-600' : 'text-foreground'}`}>
                          ¥{currentData.currentPrice.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">涨跌幅</p>
                        <p className={`font-semibold text-lg ${currentData.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {currentData.changePercent >= 0 ? '+' : ''}{currentData.changePercent.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">最高价</p>
                        <p className="font-semibold">¥{currentData.high.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">当前溢价</p>
                        <p className="font-semibold">{currentData.premium.toFixed(3)}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">暂无实时数据，点击&ldquo;手动更新&rdquo;获取最新数据</span>
                    </div>
                  )}
                </div>
                
                {/* 状态和操作 */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant={monitor.isActive ? 'default' : 'secondary'}>
                      {monitor.isActive ? '监控中' : '已暂停'}
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      {monitor.monitorType === 'price' ? '价格监控' : 
                       monitor.monitorType === 'premium' ? '溢价监控' : '涨跌幅监控'}
                    </Badge>
                    {monitor.notificationSent && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        已通知
                      </Badge>
                    )}
                  </div>
                  
                  {monitor.notificationSent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetNotification(monitor)}
                    >
                      <BellOff className="h-4 w-4 mr-1" />
                      重置通知
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
