'use client';

import { useState, useEffect } from 'react';
import { MonitorDialog } from '@/components/MonitorDialog';
import { MonitorList } from '@/components/MonitorList';
import { IndexMonitor } from '@/components/IndexMonitor';
import { requestNotificationPermission } from '@/lib/notifications';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { StockMonitor } from '@/types/stock';
import { Plus, Clock } from 'lucide-react';
import { isWithinTradingHours, getTradingStatus } from '@/lib/utils';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMonitor, setEditingMonitor] = useState<StockMonitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tradingStatus, setTradingStatus] = useState('');

  useEffect(() => {
    // 请求通知权限
    requestNotificationPermission();
    
    // 更新交易状态
    const updateTradingStatus = () => {
      setTradingStatus(getTradingStatus());
    };
    
    updateTradingStatus();
    const interval = setInterval(updateTradingStatus, 60000); // 每分钟更新一次
    
    return () => clearInterval(interval);
  }, []);

  const handleMonitorAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditMonitor = (monitor: StockMonitor) => {
    setEditingMonitor(monitor);
    setDialogOpen(true);
  };

  const handleAddMonitor = () => {
    setEditingMonitor(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMonitor(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            股票监控系统
          </h1>
          <p className="text-muted-foreground text-lg">
            实时监控股票价格、溢价和涨跌幅，达到目标时自动发送通知
          </p>
        </div>

        {/* 交易状态提示 */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isWithinTradingHours() 
            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
            : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
        }`}>
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${
              isWithinTradingHours() ? 'text-green-600' : 'text-orange-600'
            }`} />
            <div>
              <div className={`font-medium ${
                isWithinTradingHours() ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
              }`}>
                {tradingStatus}
              </div>
              <div className={`text-sm ${
                isWithinTradingHours() ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
              }`}>
                {isWithinTradingHours() 
                  ? '系统正在实时监控中，数据每10秒自动更新'
                  : '非交易时间，监控已暂停，数据更新将在下一个交易日自动恢复'
                }
              </div>
            </div>
          </div>
        </div>

        {/* 主要指数监控 */}
        <IndexMonitor />

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* 监控列表 */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">监控列表</h2>
              <Button 
                onClick={handleAddMonitor} 
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                添加监控
              </Button>
            </div>
            <MonitorList 
              refreshTrigger={refreshTrigger}
              onEditMonitor={handleEditMonitor}
            />
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">交易时间</h3>
              <ul className="space-y-1">
                <li>• <strong>工作日 9:30-15:00</strong></li>
                <li>• 非交易时间监控暂停</li>
                <li>• 每日自动重置通知状态</li>
                <li>• 支持多个指标同时监控</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">添加监控</h3>
              <ul className="space-y-1">
                <li>• 点击&ldquo;添加监控&rdquo;按钮打开弹窗</li>
                <li>• 输入股票代码后点击搜索自动获取名称</li>
                <li>• 系统会自动添加sz前缀（深圳）</li>
                <li>• 支持添加多个监控指标</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">监控类型</h3>
              <ul className="space-y-1">
                <li>• <strong>价格监控</strong>：监控股票价格达到目标值</li>
                <li>• <strong>溢价监控</strong>：监控溢价达到阈值</li>
                <li>• <strong>涨跌幅监控</strong>：监控当日涨跌幅达到阈值</li>
                <li>• 支持价格高于/低于目标价格</li>
                <li>• 支持溢价高于/低于设定阈值</li>
                <li>• 支持涨跌幅高于/低于设定阈值</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">实时信息</h3>
              <ul className="space-y-1">
                <li>• <strong>常显数据</strong>：当前股价、涨跌幅、溢价、更新时间</li>
                <li>• 交易时间内每10秒自动更新</li>
                <li>• 达到条件时发送桌面通知</li>
                <li>• 支持编辑、暂停、删除监控</li>
                <li>• 支持单独启用/禁用指标</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* 弹窗组件 */}
      <MonitorDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editMonitor={editingMonitor}
        onMonitorAdded={handleMonitorAdded}
      />
      
      <Toaster />
    </div>
  );
}
