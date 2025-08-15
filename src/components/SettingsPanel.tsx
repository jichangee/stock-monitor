'use client';

import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Bell, TestTube, Zap, Clock, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';
import { 
  exportMonitorData, 
  importMonitorData, 
  exportSettingsData, 
  importSettingsData, 
  exportAllData, 
  importAllData 
} from '@/lib/dataExport';

export function SettingsPanel() {
  const { settings, importSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // 文件输入引用
  const monitorFileInputRef = useRef<HTMLInputElement>(null);
  const settingsFileInputRef = useRef<HTMLInputElement>(null);
  const allDataFileInputRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setIsOpen(false);
  };

  const testNotification = async () => {
    setIsTestingNotification(true);
    
    try {
      // 请求通知权限
      const hasPermission = await requestNotificationPermission();
      
      if (hasPermission) {
        // 发送测试通知
        sendNotification(
          '测试通知', 
          '这是一条测试通知，用于验证通知功能是否正常工作。'
        );
        toast.success('测试通知已发送！');
      } else {
        toast.error('通知权限被拒绝，无法发送测试通知');
      }
    } catch (error) {
      console.error('发送测试通知失败:', error);
        toast.error('发送测试通知失败');
    } finally {
      setIsTestingNotification(false);
    }
  };

  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 导出监控数据
  const handleExportMonitors = () => {
    try {
      exportMonitorData();
      toast.success('监控数据导出成功！');
    } catch (error) {
      toast.error('导出失败：' + (error as Error).message);
    }
  };

  // 导出设置数据
  const handleExportSettings = () => {
    try {
      exportSettingsData(settings);
      toast.success('设置数据导出成功！');
    } catch (error) {
      toast.error('导出失败：' + (error as Error).message);
    }
  };

  // 导出所有数据
  const handleExportAllData = () => {
    try {
      exportAllData(settings);
      toast.success('所有数据导出成功！');
    } catch (error) {
      toast.error('导出失败：' + (error as Error).message);
    }
  };

  // 导入监控数据
  const handleImportMonitors = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importMonitorData(file);
      if (result.success) {
        toast.success(result.message);
        // 刷新页面以显示新导入的数据
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('导入失败：' + (error as Error).message);
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (monitorFileInputRef.current) {
        monitorFileInputRef.current.value = '';
      }
    }
  };

  // 导入设置数据
  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importSettingsData(file);
      if (result.success && result.settings) {
        importSettings(result.settings);
        toast.success(result.message);
        // 刷新页面以应用新设置
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('导入失败：' + (error as Error).message);
    } finally {
      // 清空文件输入
      if (settingsFileInputRef.current) {
        settingsFileInputRef.current.value = '';
      }
    }
  };

  // 导入所有数据
  const handleImportAllData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importAllData(file);
      if (result.success) {
        toast.success(result.message);
        // 刷新页面以显示新导入的数据
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('导入失败：' + (error as Error).message);
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (allDataFileInputRef.current) {
        allDataFileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Settings className="h-4 w-4" />
        设置
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              系统设置
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 智能更新设置 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  智能更新频率
                </Label>
                <Badge variant="outline" className="text-xs">
                  当前: {settings.updateInterval}秒
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">智能更新说明</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div>• <strong>页面活跃时</strong>：每5秒更新（实时监控）</div>
                  <div>• <strong>页面非活跃时</strong>：每10秒更新（节能模式）</div>
                  <div>• <strong>自动检测</strong>：根据用户活动自动调整</div>
                  <div>• <strong>无需手动设置</strong>：系统智能管理更新频率</div>
                </div>
              </div>
            </div>

            {/* 数据导出导入 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  数据管理
                </Label>
                <Badge variant="outline" className="text-xs">
                  备份与恢复
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg space-y-4">
                <div className="text-sm text-muted-foreground">
                  导出监控数据和设置，或从备份文件恢复数据。支持单独导出监控数据、设置数据，或一次性导出所有数据。
                </div>
                
                {/* 导出功能 */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">导出数据</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Button
                      onClick={handleExportMonitors}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      导出监控
                    </Button>
                    <Button
                      onClick={handleExportSettings}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      导出设置
                    </Button>
                    <Button
                      onClick={handleExportAllData}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      导出全部
                    </Button>
                  </div>
                </div>
                
                {/* 导入功能 */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">导入数据</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <input
                        ref={monitorFileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportMonitors}
                        className="hidden"
                      />
                      <Button
                        onClick={() => monitorFileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full"
                        disabled={isImporting}
                      >
                        <Download className="h-4 w-4" />
                        {isImporting ? '导入中...' : '导入监控'}
                      </Button>
                    </div>
                    <div>
                      <input
                        ref={settingsFileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportSettings}
                        className="hidden"
                      />
                      <Button
                        onClick={() => settingsFileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full"
                      >
                        <Download className="h-4 w-4" />
                        导入设置
                      </Button>
                    </div>
                    <div>
                      <input
                        ref={allDataFileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportAllData}
                        className="hidden"
                      />
                      <Button
                        onClick={() => allDataFileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full"
                        disabled={isImporting}
                      >
                        <Download className="h-4 w-4" />
                        {isImporting ? '导入中...' : '导入全部'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground p-2 bg-background rounded border">
                  <div className="font-medium mb-1">注意事项：</div>
                  <div>• 导入监控数据会与现有数据合并，相同代码的股票会更新</div>
                  <div>• 导入设置会覆盖当前设置</div>
                  <div>• 建议在导入前先导出当前数据作为备份</div>
                  <div>• 支持的文件格式：JSON</div>
                </div>
              </div>
            </div>

            {/* 通知测试 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  通知功能测试
                </Label>
                <Badge variant="outline" className="text-xs">
                  测试通知权限
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-3">
                  测试桌面通知功能是否正常工作，确保在股票监控触发时能够正常接收通知。
                </div>
                
                <Button
                  onClick={testNotification}
                  disabled={isTestingNotification}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTestingNotification ? (
                    <>
                      <TestTube className="h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      发送测试通知
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 设置信息 */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">设置信息</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">最后更新:</span>
                  <div className="font-medium">
                    {formatLastUpdated(settings.lastUpdated)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">当前频率:</span>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {settings.updateInterval} 秒
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
