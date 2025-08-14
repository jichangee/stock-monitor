'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchStockData } from '@/lib/stockApi';
import { isWithinTradingHours } from '@/lib/utils';

interface IndexData {
  code: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

const INDEX_CODES = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' }
];

export function IndexMonitor() {
  const [indexData, setIndexData] = useState<Record<string, IndexData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchIndexData = async () => {
    if (!isWithinTradingHours()) {
      return;
    }

    setIsLoading(true);
    const newIndexData: Record<string, IndexData> = {};

    for (const index of INDEX_CODES) {
      try {
        const data = await fetchStockData(index.code);
        if (data) {
          newIndexData[index.code] = {
            code: index.code,
            name: index.name,
            currentPrice: data.currentPrice,
            change: data.change,
            changePercent: data.changePercent,
            timestamp: data.timestamp
          };
        }
      } catch (error) {
        console.error(`获取${index.name}数据失败:`, error);
      }
    }

    setIndexData(newIndexData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchIndexData();
    
    if (isWithinTradingHours()) {
      const interval = setInterval(fetchIndexData, 30000); // 每30秒更新一次指数数据
      return () => clearInterval(interval);
    }
  }, []);

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) {
      return <TrendingUp className="h-4 w-4 text-red-600" />;
    } else if (changePercent < 0) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) {
      return 'text-red-600';
    } else if (changePercent < 0) {
      return 'text-green-600';
    } else {
      return 'text-gray-600';
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000) {
      return price.toFixed(0);
    } else if (price >= 1000) {
      return price.toFixed(1);
    } else {
      return price.toFixed(2);
    }
  };

  if (Object.keys(indexData).length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">主要指数</h3>
          <Badge variant="outline" className="text-xs">
            {isWithinTradingHours() ? '实时更新' : '非交易时间'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INDEX_CODES.map((index) => {
            const data = indexData[index.code];
            
            return (
              <div key={index.code} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {data ? getChangeIcon(data.changePercent) : <Minus className="h-4 w-4 text-gray-400" />}
                  <div>
                    <div className="font-medium text-sm">{index.name}</div>
                    {data ? (
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(data.currentPrice)}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">--</div>
                    )}
                  </div>
                </div>
                
                {data ? (
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${getChangeColor(data.changePercent)}`}>
                      {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </div>
                    <div className={`text-xs ${getChangeColor(data.changePercent)}`}>
                      {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-right text-muted-foreground text-sm">
                    --
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {isLoading && (
          <div className="text-center text-xs text-muted-foreground mt-3">
            正在更新指数数据...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
