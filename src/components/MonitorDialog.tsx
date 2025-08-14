'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { addStockMonitor, updateStockMonitor } from '@/lib/stockMonitor';
import { formatStockCode, fetchStockNameFromEastmoney } from '@/lib/stockApi';
import { toast } from 'sonner';
import { StockMonitor, MonitorMetric } from '@/types/stock';
import { Search, Loader2, Plus, Trash2 } from 'lucide-react';
import { generateUUID } from '@/lib/utils';

// 单个指标的验证模式
const metricSchema = z.object({
  type: z.enum(['price', 'premium', 'changePercent']),
  targetPrice: z.number().optional(),
  condition: z.enum(['above', 'below']),
  premiumThreshold: z.number().optional(),
  changePercentThreshold: z.number().optional(),
  isActive: z.boolean()
}).refine((data) => {
  if (data.type === 'price') {
    return data.targetPrice && data.targetPrice > 0;
  } else if (data.type === 'premium') {
    return data.premiumThreshold && data.premiumThreshold > 0;
  } else if (data.type === 'changePercent') {
    // 涨跌幅阈值可以是正数或负数，但不能为0
    return data.changePercentThreshold !== undefined && data.changePercentThreshold !== 0;
  }
  return false;
}, {
  message: '请根据监控类型设置相应的有效值'
});

// 表单验证模式
const addMonitorSchema = z.object({
  code: z.string().min(1, '请输入股票代码').trim(),
  name: z.string().min(1, '请输入股票名称').trim(),
  metrics: z.array(metricSchema).min(1, '至少需要添加一个监控指标')
});

type AddMonitorFormData = z.infer<typeof addMonitorSchema>;

interface MonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMonitor?: StockMonitor | null;
  onMonitorAdded: () => void;
}

export function MonitorDialog({ open, onOpenChange, editMonitor, onMonitorAdded }: MonitorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!editMonitor);
  const [metrics, setMetrics] = useState<MonitorMetric[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<AddMonitorFormData>({
    resolver: zodResolver(addMonitorSchema),
    defaultValues: {
      code: '',
      name: '',
      metrics: []
    }
  });

  const watchCode = watch('code');

  useEffect(() => {
    if (editMonitor && open) {
      setIsEditMode(true);
      setMetrics(editMonitor.metrics);
      reset({
        code: editMonitor.code,
        name: editMonitor.name,
        metrics: editMonitor.metrics
      });
    } else if (!editMonitor && open) {
      setIsEditMode(false);
      setMetrics([]);
      reset({
        code: '',
        name: '',
        metrics: []
      });
    }
  }, [editMonitor, open, reset]);

  const addMetric = () => {
    const newMetric: MonitorMetric = {
      id: generateUUID(),
      type: 'price',
      targetPrice: 0,
      condition: 'above',
      premiumThreshold: 0,
      changePercentThreshold: 0,
      isActive: true,
      notificationSent: false
    };
    
    const updatedMetrics = [...metrics, newMetric];
    setMetrics(updatedMetrics);
    setValue('metrics', updatedMetrics);
  };

  const removeMetric = (index: number) => {
    const updatedMetrics = metrics.filter((_, i) => i !== index);
    setMetrics(updatedMetrics);
    setValue('metrics', updatedMetrics);
  };

  const updateMetric = (index: number, field: keyof MonitorMetric, value: string | number | boolean) => {
    const updatedMetrics = [...metrics];
    updatedMetrics[index] = { ...updatedMetrics[index], [field]: value };
    setMetrics(updatedMetrics);
    setValue('metrics', updatedMetrics);
  };

  const searchStockName = async () => {
    if (!watchCode) {
      toast.error('请先输入股票代码');
      return;
    }

    setIsSearching(true);
    try {
      const formattedCode = formatStockCode(watchCode);
      const name = await fetchStockNameFromEastmoney(formattedCode);
      
      if (name) {
        setValue('name', name);
        toast.success(`已获取股票名称: ${name}`);
      } else {
        toast.error('未找到该股票，请检查代码是否正确');
      }
    } catch {
      toast.error('获取股票名称失败');
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (data: AddMonitorFormData) => {
    setIsLoading(true);
    
    try {
      if (metrics.length === 0) {
        toast.error('请至少添加一个监控指标');
        return;
      }

      const formattedCode = formatStockCode(data.code);
      
      if (isEditMode && editMonitor) {
        // 编辑模式
        const updateData: Partial<StockMonitor> = {
          code: formattedCode,
          name: data.name,
          metrics: metrics
        };
        
        const updated = updateStockMonitor(editMonitor.id, updateData);
        
        if (updated) {
          toast.success('监控更新成功！');
          onOpenChange(false);
          onMonitorAdded();
        } else {
          toast.error('更新监控失败，请重试');
        }
      } else {
        // 添加模式
        const monitorData = {
          code: formattedCode,
          name: data.name,
          metrics: metrics,
          isActive: true
        };
        
        const newMonitor = addStockMonitor(monitorData);
        
        if (newMonitor && newMonitor.id) {
          toast.success('监控添加成功！');
          onOpenChange(false);
          onMonitorAdded();
        } else {
          toast.error('添加监控失败，请重试');
        }
      }
    } catch (error) {
      console.error('提交表单时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : (isEditMode ? '更新监控失败，请重试' : '添加监控失败，请重试');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setMetrics([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditMode ? '编辑股票监控' : '添加股票监控'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">股票代码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="例如: 159509 或 sz159509"
                  {...register('code')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={searchStockName}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">股票名称</Label>
              <Input
                id="name"
                placeholder="例如: 创业板50ETF"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>监控指标</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMetric}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                添加指标
              </Button>
            </div>

            {metrics.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                请点击&ldquo;添加指标&rdquo;按钮来添加监控指标
              </div>
            )}

            {metrics.map((metric, index) => (
              <div key={metric.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">指标 {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMetric(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>监控类型</Label>
                    <Select
                      value={metric.type}
                      onValueChange={(value) => updateMetric(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">价格监控</SelectItem>
                        <SelectItem value="premium">溢价监控</SelectItem>
                        <SelectItem value="changePercent">涨跌幅监控</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>监控条件</Label>
                    <Select
                      value={metric.condition}
                      onValueChange={(value) => updateMetric(index, 'condition', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">
                          {metric.type === 'price' ? '价格高于目标价格时通知' : 
                           metric.type === 'premium' ? '溢价高于阈值时通知' : '涨跌幅高于阈值时通知'}
                        </SelectItem>
                        <SelectItem value="below">
                          {metric.type === 'price' ? '价格低于目标价格时通知' : 
                           metric.type === 'premium' ? '溢价低于阈值时通知' : '涨跌幅低于阈值时通知'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {metric.type === 'price' && (
                  <div className="space-y-2">
                    <Label>目标价格</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      value={metric.targetPrice || ''}
                      onChange={(e) => updateMetric(index, 'targetPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {metric.type === 'premium' && (
                  <div className="space-y-2">
                    <Label>溢价阈值 (%)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="5.0000"
                      value={metric.premiumThreshold || ''}
                      onChange={(e) => updateMetric(index, 'premiumThreshold', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {metric.type === 'changePercent' && (
                  <div className="space-y-2">
                    <Label>涨跌幅阈值 (%)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="5.0000"
                      value={metric.changePercentThreshold || ''}
                      onChange={(e) => updateMetric(index, 'changePercentThreshold', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`active-${metric.id}`}
                    checked={metric.isActive}
                    onChange={(e) => updateMetric(index, 'isActive', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`active-${metric.id}`}>启用此指标</Label>
                </div>
              </div>
            ))}
          </div>

          {errors.metrics && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{errors.metrics.message}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || metrics.length === 0}>
              {isLoading ? (isEditMode ? '更新中...' : '添加中...') : (isEditMode ? '更新监控' : '添加监控')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
