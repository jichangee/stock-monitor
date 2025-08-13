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
  code: z.string().min(1, '请输入股票代码').trim(),
  name: z.string().min(1, '请输入股票名称').trim(),
  targetPrice: z.number().optional(),
  condition: z.enum(['above', 'below']),
  monitorType: z.enum(['price', 'premium', 'changePercent']),
  premiumThreshold: z.number().optional(),
  changePercentThreshold: z.number().optional()
}).refine((data) => {
  if (data.monitorType === 'price') {
    return data.targetPrice && data.targetPrice > 0;
  } else if (data.monitorType === 'premium') {
    return data.premiumThreshold && data.premiumThreshold > 0;
  } else if (data.monitorType === 'changePercent') {
    return data.changePercentThreshold && data.changePercentThreshold > 0;
  }
  return false;
}, {
  message: '请根据监控类型设置相应的有效值',
  path: ['monitorType']
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
        targetPrice: editMonitor.targetPrice || 0,
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
        targetPrice: undefined,
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
      // 验证必填字段
      if (!data.code.trim()) {
        toast.error('请输入股票代码');
        return;
      }
      
      if (!data.name.trim()) {
        toast.error('请输入股票名称');
        return;
      }
      
      // 根据监控类型验证相应字段
      if (data.monitorType === 'price') {
        if (!data.targetPrice || data.targetPrice <= 0) {
          toast.error('请输入有效的目标价格');
          return;
        }
      } else if (data.monitorType === 'premium') {
        if (!data.premiumThreshold || data.premiumThreshold <= 0) {
          toast.error('请输入有效的溢价阈值');
          return;
        }
      } else if (data.monitorType === 'changePercent') {
        if (!data.changePercentThreshold || data.changePercentThreshold <= 0) {
          toast.error('请输入有效的涨跌幅阈值');
          return;
        }
      }
      
      const formattedCode = formatStockCode(data.code);
      
      if (isEditMode && editMonitor) {
        // 编辑模式
        try {
                  const updateData: Partial<StockMonitor> = {
          code: formattedCode,
          name: data.name,
          condition: data.condition,
          monitorType: data.monitorType
        };
          
          // 根据监控类型添加相应字段
          if (data.monitorType === 'price') {
            updateData.targetPrice = data.targetPrice;
          } else if (data.monitorType === 'premium') {
            updateData.premiumThreshold = data.premiumThreshold;
          } else if (data.monitorType === 'changePercent') {
            updateData.changePercentThreshold = data.changePercentThreshold;
          }
          
          const updated = updateStockMonitor(editMonitor.id, updateData);
          
          if (updated) {
            toast.success('监控更新成功！');
            onOpenChange(false);
            onMonitorAdded();
          } else {
            toast.error('更新监控失败，请重试');
          }
        } catch (updateError) {
          console.error('更新监控时发生错误:', updateError);
          const errorMessage = updateError instanceof Error ? updateError.message : '更新监控失败，请重试';
          toast.error(errorMessage);
        }
      } else {
        // 添加模式
        try {
                  const monitorData: {
          code: string;
          name: string;
          condition: 'above' | 'below';
          monitorType: 'price' | 'premium' | 'changePercent';
          isActive: boolean;
          notificationSent: boolean;
          targetPrice?: number;
          premiumThreshold?: number;
          changePercentThreshold?: number;
        } = {
          code: formattedCode,
          name: data.name,
          condition: data.condition,
          monitorType: data.monitorType,
          isActive: true,
          notificationSent: false
        };
          
          // 根据监控类型添加相应字段
          if (data.monitorType === 'price') {
            monitorData.targetPrice = data.targetPrice;
          } else if (data.monitorType === 'premium') {
            monitorData.premiumThreshold = data.premiumThreshold;
          } else if (data.monitorType === 'changePercent') {
            monitorData.changePercentThreshold = data.changePercentThreshold;
          }
          
          const newMonitor = addStockMonitor(monitorData);
          
          if (newMonitor && newMonitor.id) {
            toast.success('监控添加成功！');
            onOpenChange(false);
            onMonitorAdded();
          } else {
            toast.error('添加监控失败，请重试');
          }
        } catch (addError) {
          console.error('添加监控时发生错误:', addError);
          const errorMessage = addError instanceof Error ? addError.message : '添加监控失败，请检查输入数据后重试';
          toast.error(errorMessage);
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
                  setValue('targetPrice', 0);
                  setValue('changePercentThreshold', undefined);
                  clearErrors('targetPrice');
                  clearErrors('changePercentThreshold');
                } else if (value === 'changePercent') {
                  setValue('targetPrice', 0);
                  setValue('premiumThreshold', undefined);
                  clearErrors('targetPrice');
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

          {/* 通用错误显示区域 */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-2">请修正以下错误：</p>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.code && <li>• {errors.code.message}</li>}
                {errors.name && <li>• {errors.name.message}</li>}
                {errors.targetPrice && <li>• {errors.targetPrice.message}</li>}
                {errors.premiumThreshold && <li>• {errors.premiumThreshold.message}</li>}
                {errors.changePercentThreshold && <li>• {errors.changePercentThreshold.message}</li>}
                {errors.monitorType && <li>• {errors.monitorType.message}</li>}
                {errors.condition && <li>• {errors.condition.message}</li>}
              </ul>
            </div>
          )}

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
