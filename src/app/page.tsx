'use client';

import { useState, useEffect } from 'react';
import { AddMonitorForm } from '@/components/AddMonitorForm';
import { MonitorList } from '@/components/MonitorList';
import { requestNotificationPermission } from '@/lib/notifications';
import { Toaster } from '@/components/ui/sonner';
import { StockMonitor } from '@/types/stock';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMonitor, setEditingMonitor] = useState<StockMonitor | null>(null);

  useEffect(() => {
    // 请求通知权限
    requestNotificationPermission();
  }, []);

  const handleMonitorAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditMonitor = (monitor: StockMonitor) => {
    setEditingMonitor(monitor);
  };

  const handleCancelEdit = () => {
    setEditingMonitor(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            股票价格监控
          </h1>
          <p className="text-muted-foreground text-lg">
            实时监控股票价格和溢价，达到目标时自动发送通知
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：添加/编辑监控表单 */}
          <div className="lg:col-span-1">
            <AddMonitorForm 
              onMonitorAdded={handleMonitorAdded}
              editMonitor={editingMonitor}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* 右侧：监控列表 */}
          <div className="lg:col-span-2">
            <MonitorList 
              refreshTrigger={refreshTrigger}
              onEditMonitor={handleEditMonitor}
            />
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">添加监控</h3>
              <ul className="space-y-1">
                <li>• 输入股票代码（如：159509 或 sz159509）</li>
                <li>• 点击搜索按钮自动获取股票名称</li>
                <li>• 系统会自动添加sz前缀（深圳）</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">监控类型</h3>
              <ul className="space-y-1">
                <li>• <strong>价格监控</strong>：监控股票价格达到目标值</li>
                <li>• <strong>溢价监控</strong>：监控涨跌幅达到阈值</li>
                <li>• 支持价格高于/低于目标价格</li>
                <li>• 支持溢价高于/低于设定阈值</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">实时信息</h3>
              <ul className="space-y-1">
                <li>• <strong>常显数据</strong>：当前股价、涨跌幅、开盘价、最高价</li>
                <li>• 每10秒自动更新股票数据</li>
                <li>• 达到条件时发送桌面通知</li>
                <li>• 支持编辑、暂停、删除监控</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
}
