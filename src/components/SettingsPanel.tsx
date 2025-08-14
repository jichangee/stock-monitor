'use client';

import { useState, useEffect } from 'react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Save, RotateCcw, Bell, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';

const UPDATE_INTERVALS = [
  { value: 3, label: '3秒', description: '最快速更新' },
  { value: 5, label: '5秒', description: '平衡更新' },
  { value: 10, label: '10秒', description: '标准更新' }
];

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // 当弹窗打开时，同步最新的设置数据
  useEffect(() => {
    if (isOpen) {
      setTempSettings(settings);
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  const handleIntervalChange = (value: string) => {
    const newInterval = parseInt(value);
    const newTempSettings = { ...tempSettings, updateInterval: newInterval };
    setTempSettings(newTempSettings);
    setHasChanges(newTempSettings.updateInterval !== settings.updateInterval);
  };

  const saveSettings = () => {
    updateSettings(tempSettings);
    setHasChanges(false);
    toast.success('设置已保存');
  };

  const handleReset = () => {
    setTempSettings(settings);
    setHasChanges(false);
    toast.info('设置已重置为当前值');
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setHasChanges(false);
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
            {/* 自动更新设置 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="updateInterval" className="text-base font-medium">
                  自动更新时间间隔
                </Label>
                <Badge variant="outline" className="text-xs">
                  当前: {tempSettings.updateInterval}秒
                </Badge>
              </div>
              
              <Select
                value={tempSettings.updateInterval.toString()}
                onValueChange={handleIntervalChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择更新间隔" />
                </SelectTrigger>
                <SelectContent>
                  {UPDATE_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{interval.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {interval.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-sm text-muted-foreground">
                选择数据自动更新的时间间隔。较短的间隔提供更实时的数据，但会增加网络请求频率。
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
                    {formatLastUpdated(tempSettings.lastUpdated)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">更新间隔:</span>
                  <div className="font-medium">
                    {tempSettings.updateInterval} 秒
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                重置为当前
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  取消
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={!hasChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
