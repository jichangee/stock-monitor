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
import { formatStockCode, fetchStockName } from '@/lib/stockApi';
import { toast } from 'sonner';
import { StockMonitor } from '@/types/stock';
import { Search, Loader2 } from 'lucide-react';

const addMonitorSchema = z.object({
  code: z.string().min(1, '请输入股票代码'),
  name: z.string().min(1, '请输入股票名称'),
  targetPrice: z.number().positive('目标价格必须大于0'),
  condition: z.enum(['above', 'below']),
  monitorType: z.enum(['price', 'premium', 'changePercent']),
  premiumThreshold: z.number().optional(),
  changePercentThreshold: z.number().optional()
}).refine((data) => {
  if (data.monitorType === 'premium' && !data.premiumThreshold) {
    return false;
  }
  if (data.monitorType === 'changePercent' && !data.changePercentThreshold) {
    return false;
  }
  return true;
}, {
  message: '溢价监控需要设置溢价阈值，涨跌幅监控需要设置涨跌幅阈值',
  path: ['premiumThreshold', 'changePercentThreshold']
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    clearErrors
  } = useForm<AddMonitorFormData>({
    resolver: zodResolver(addMonitorSchema),
    defaultValues: {
      condition: 'above',
      monitorType: 'price'
    }
  });

  const watchMonitorType = watch('monitorType');

  useEffect(() => {
    if (editMonitor && open) {
      setIsEditMode(true);
      reset({
        code: editMonitor.code,
        name: editMonitor.name,
        targetPrice: editMonitor.targetPrice,
        condition: editMonitor.condition,
        monitorType: editMonitor.monitorType,
        premiumThreshold: editMonitor.premiumThreshold,
        changePercentThreshold: editMonitor.changePercentThreshold
      });
    } else if (!editMonitor && open) {
      setIsEditMode(false);
      reset({
        code: '',
        name: '',
        targetPrice: 0,
        condition: 'above',
        monitorType: 'price',
        premiumThreshold: undefined,
        changePercentThreshold: undefined
      });
    }
  }, [editMonitor, open, reset]);

  const searchStockName = async () => {
    const code = watch('code');
    if (!code) {
      toast.error('请先输入股票代码');
      return;
    }

    setIsSearching(true);
    try {
      const formattedCode = formatStockCode(code);
      const name = await fetchStockName(formattedCode);
      
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
      const formattedCode = formatStockCode(data.code);
      
      if (isEditMode && editMonitor) {
        // 编辑模式
        updateStockMonitor(editMonitor.id, {
          code: formattedCode,
          name: data.name,
          targetPrice: data.targetPrice,
          condition: data.condition,
          monitorType: data.monitorType,
          premiumThreshold: data.premiumThreshold,
          changePercentThreshold: data.changePercentThreshold
        });
        toast.success('监控更新成功！');
        onOpenChange(false);
      } else {
        // 添加模式
        addStockMonitor({
          code: formattedCode,
          name: data.name,
          targetPrice: data.targetPrice,
          condition: data.condition,
          monitorType: data.monitorType,
          premiumThreshold: data.premiumThreshold,
          changePercentThreshold: data.changePercentThreshold,
          isActive: true,
          notificationSent: false
        });
        toast.success('监控添加成功！');
        onOpenChange(false);
      }
      
      onMonitorAdded();
    } catch {
      toast.error(isEditMode ? '更新监控失败，请重试' : '添加监控失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditMode ? '编辑股票监控' : '添加股票监控'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="monitorType">监控类型</Label>
            <Select
              value={watchMonitorType}
              onValueChange={(value) => {
                setValue('monitorType', value as 'price' | 'premium' | 'changePercent');
                if (value === 'price') {
                  setValue('premiumThreshold', undefined);
                  setValue('changePercentThreshold', undefined);
                  clearErrors('premiumThreshold');
                  clearErrors('changePercentThreshold');
                } else if (value === 'premium') {
                  setValue('changePercentThreshold', undefined);
                  clearErrors('changePercentThreshold');
                } else if (value === 'changePercent') {
                  setValue('premiumThreshold', undefined);
                  clearErrors('premiumThreshold');
                }
              }}
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

          {watchMonitorType === 'price' ? (
            <div className="space-y-2">
              <Label htmlFor="targetPrice">目标价格</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                {...register('targetPrice', { valueAsNumber: true })}
              />
              {errors.targetPrice && (
                <p className="text-sm text-red-500">{errors.targetPrice.message}</p>
              )}
            </div>
          ) : watchMonitorType === 'premium' ? (
            <div className="space-y-2">
              <Label htmlFor="premiumThreshold">溢价阈值 (%)</Label>
              <Input
                id="premiumThreshold"
                type="number"
                step="0.0001"
                placeholder="5.0000"
                {...register('premiumThreshold', { valueAsNumber: true })}
              />
              {errors.premiumThreshold && (
                <p className="text-sm text-red-500">{errors.premiumThreshold.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="changePercentThreshold">涨跌幅阈值 (%)</Label>
              <Input
                id="changePercentThreshold"
                type="number"
                step="0.0001"
                placeholder="5.0000"
                {...register('changePercentThreshold', { valueAsNumber: true })}
              />
              {errors.changePercentThreshold && (
                <p className="text-sm text-red-500">{errors.changePercentThreshold.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="condition">监控条件</Label>
            <Select
              value={watch('condition')}
              onValueChange={(value) => setValue('condition', value as 'above' | 'below')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">
                  {watchMonitorType === 'price' ? '价格高于目标价格时通知' : 
                   watchMonitorType === 'premium' ? '溢价高于阈值时通知' : '涨跌幅高于阈值时通知'}
                </SelectItem>
                <SelectItem value="below">
                  {watchMonitorType === 'price' ? '价格低于目标价格时通知' : 
                   watchMonitorType === 'premium' ? '溢价低于阈值时通知' : '涨跌幅低于阈值时通知'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditMode ? '更新中...' : '添加中...') : (isEditMode ? '更新监控' : '添加监控')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
