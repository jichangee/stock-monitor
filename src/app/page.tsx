'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MonitorDialog } from '@/components/MonitorDialog';
import { MonitorList } from '@/components/MonitorList';
import { IndexMonitor } from '@/components/IndexMonitor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AdminPanel } from '@/components/AdminPanel';
import { requestNotificationPermission } from '@/lib/notifications';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { StockMonitor } from '@/types/stock';
import { Plus, Clock, LogIn, LogOut } from 'lucide-react';
import { isWithinTradingHours, getTradingStatus } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { settings } = useSettings();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMonitor, setEditingMonitor] = useState<StockMonitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tradingStatus, setTradingStatus] = useState('');
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
    const updateTradingStatus = async () => {
      setTradingStatus(await getTradingStatus());
      setIsTrading(await isWithinTradingHours());
    };
    updateTradingStatus();
    const interval = setInterval(updateTradingStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMonitorAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAuthCheck = () => {
    if (status === 'unauthenticated') {
      toast.info('请先登录再执行此操作。');
      router.push('/auth');
      return false;
    }
    return true;
  }

  const handleEditMonitor = (monitor: StockMonitor) => {
    if (!handleAuthCheck()) return;
    setEditingMonitor(monitor);
    setDialogOpen(true);
  };

  const handleAddMonitor = () => {
    if (!handleAuthCheck()) return;
    setEditingMonitor(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMonitor(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="text-left">
                <h1 className="text-3xl font-bold text-foreground mb-1">
                    股票监控系统
                </h1>
                <p className="text-muted-foreground text-base">
                  实时监控股票价格、溢价和涨跌幅，达到目标时自动发送通知
                </p>
            </div>
            {session ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">欢迎, {session.user?.name || session.user?.email}</p>
                <Button onClick={() => signOut()} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    登出
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push('/auth')} variant="outline" size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  登录 / 注册
              </Button>
            )}
        </div>

        {/* 交易状态提示 */}
        <div className={`mb-4 p-3 rounded-lg border ${
          isTrading 
            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
            : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${
              isTrading ? 'text-green-600' : 'text-orange-600'
            }`} />
            <div>
              <div className={`font-medium text-sm ${
                isTrading ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
              }`}>
                {tradingStatus}
              </div>
              <div className={`text-xs ${
                isTrading ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
              }`}>
                {isTrading 
                  ? `系统正在实时监控中，数据每${settings.updateInterval}秒自动更新`
                  : '非交易时间，监控已暂停，数据更新将在下一个交易日自动恢复'
                }
              </div>
            </div>
          </div>
        </div>

        <IndexMonitor />

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <div className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">监控列表</h2>
              <div className="flex items-center gap-2">
                <SettingsPanel />
                <Button 
                  onClick={handleAddMonitor} 
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  添加监控
                </Button>
              </div>
            </div>
            {session ? (
              <MonitorList 
                refreshTrigger={refreshTrigger}
                onEditMonitor={handleEditMonitor}
              />
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
                <p>请登录以查看和管理您的监控列表。</p>
              </div>
            )}
          </div>
        </div>

        {/* 管理员面板 */}
        {session && (
          <div className="mt-6">
            <AdminPanel />
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-3">使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-1">交易时间</h3>
              <ul className="space-y-0.5 text-xs">
                <li>• <strong>工作日 9:30-15:00</strong></li>
                <li>• 非交易时间监控暂停</li>
                <li>• 每日自动重置通知状态</li>
                <li>• 支持多个指标同时监控</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">添加监控</h3>
              <ul className="space-y-0.5 text-xs">
                <li>• 点击&ldquo;添加监控&rdquo;按钮打开弹窗</li>
                <li>• 输入股票代码后点击搜索自动获取名称</li>
                <li>• 系统会自动添加sz前缀（深圳）</li>
                <li>• 支持添加多个监控指标</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">监控类型</h3>
              <ul className="space-y-0.5 text-xs">
                <li>• <strong>价格监控</strong>：监控股票价格达到目标值</li>
                <li>• <strong>溢价监控</strong>：监控溢价达到阈值</li>
                <li>• <strong>涨跌幅监控</strong>：监控当日涨跌幅达到阈值</li>
                <li>• 支持价格高于/低于目标价格</li>
                <li>• 支持溢价高于/低于设定阈值</li>
                <li>• 支持涨跌幅高于/低于设定阈值</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">实时信息</h3>
              <ul className="space-y-0.5 text-xs">
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
