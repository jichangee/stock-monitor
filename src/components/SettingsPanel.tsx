'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Bell, TestTube, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';

export function SettingsPanel() {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);



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
