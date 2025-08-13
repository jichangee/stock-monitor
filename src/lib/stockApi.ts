import { StockData } from '@/types/stock';

const STOCK_API_BASE = 'https://qt.gtimg.cn/q=';

// 解码股票名称，处理乱码问题
function decodeStockName(name: string): string {
  try {
    // 尝试使用 decodeURIComponent 解码
    return decodeURIComponent(name);
  } catch {
    try {
      // 如果失败，尝试使用 unescape 解码
      return unescape(name);
    } catch {
      // 如果都失败，返回原始名称
      console.warn('无法解码股票名称:', name);
      return name;
    }
  }
}

export async function fetchStockData(code: string): Promise<StockData | null> {
  try {
    const response = await fetch(`${STOCK_API_BASE}${code}`);
    const text = await response.text();
    
    // 解析返回的数据格式
    const match = text.match(/v_([^=]+)="([^"]+)"/);
    if (!match) return null;
    
    const data = match[2].split('~');
    if (data.length < 32) return null;
    
    const changePercent = parseFloat(data[32]) || 0;
    
    return {
      code: data[0],
      name: decodeStockName(data[1]), // 解码股票名称
      currentPrice: parseFloat(data[3]) || 0,
      change: parseFloat(data[31]) || 0,
      changePercent: changePercent,
      open: parseFloat(data[5]) || 0,
      high: parseFloat(data[33]) || 0,
      low: parseFloat(data[34]) || 0,
      volume: parseFloat(data[6]) || 0,
      premium: Math.abs(parseFloat(data[77])), // 溢价使用涨跌幅的绝对值
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
