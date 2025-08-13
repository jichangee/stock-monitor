import { StockData, StockApiResponse } from '@/types/stock';

const STOCK_API_BASE = 'https://qt.gtimg.cn/q=';

export async function fetchStockData(code: string): Promise<StockData | null> {
  try {
    const response = await fetch(`${STOCK_API_BASE}${code}`);
    const text = await response.text();
    
    // 解析返回的数据格式
    const match = text.match(/v_([^=]+)="([^"]+)"/);
    if (!match) return null;
    
    const data = match[2].split('~');
    if (data.length < 32) return null;
    
    return {
      code: data[0],
      name: data[1],
      currentPrice: parseFloat(data[3]) || 0,
      change: parseFloat(data[31]) || 0,
      changePercent: parseFloat(data[32]) || 0,
      open: parseFloat(data[5]) || 0,
      high: parseFloat(data[33]) || 0,
      low: parseFloat(data[34]) || 0,
      volume: parseFloat(data[6]) || 0,
      premium: parseFloat(data[77]) || 0,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('获取股票数据失败:', error);
    return null;
  }
}

export async function fetchStockName(code: string): Promise<string | null> {
  try {
    const data = await fetchStockData(code);
    return data?.name || null;
  } catch (error) {
    console.error('获取股票名称失败:', error);
    return null;
  }
}

export function formatStockCode(code: string): string {
  // 确保股票代码格式正确
  if (code.startsWith('sz') || code.startsWith('sh')) {
    return code;
  }
  // 默认添加sz前缀
  return `sz${code}`;
}
