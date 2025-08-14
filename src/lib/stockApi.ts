import { StockData } from '@/types/stock';

const STOCK_API_BASE = 'https://qt.gtimg.cn/q=';

// 从东方财富API获取股票名称（备用方案）
export async function fetchStockNameFromEastmoney(code: string): Promise<string | null> {
  try {
    // 转换代码格式
    let apiCode = code;
    if (code.startsWith('sz')) {
      apiCode = `0.${code.substring(2)}`;
    } else if (code.startsWith('sh')) {
      apiCode = `1.${code.substring(2)}`;
    }
    
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${apiCode}&fields=f58`;
    console.log('正在从东方财富API获取股票名称:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('东方财富API响应:', data);
    
    if (data.data && data.data.f58) {
      const stockName = data.data.f58;
      console.log('从东方财富API获取到的股票名称:', stockName);
      return stockName;
    }
    
    return null;
    
  } catch (error) {
    console.error('从东方财富API获取股票名称失败:', error);
    return null;
  }
}

// 解析单个股票数据
function parseStockData(code: string, dataString: string): StockData | null {
  try {
    const data = dataString.split('~');
    
    if (data.length < 32) {
      console.error('股票数据字段不足:', {
        code,
        dataLength: data.length,
        data: dataString.substring(0, 200) + '...'
      });
      return null;
    }
    
    const changePercent = parseFloat(data[32]) || 0;
    
    const stockData: StockData = {
      code: data[0] || code,
      name: data[1] || '',
      currentPrice: parseFloat(data[3]) || 0,
      change: parseFloat(data[31]) || 0,
      changePercent: changePercent,
      open: parseFloat(data[5]) || 0,
      high: parseFloat(data[33]) || 0,
      low: parseFloat(data[34]) || 0,
      volume: parseFloat(data[6]) || 0,
      premium: parseFloat(data[77]) || 0, // 溢价
      timestamp: Date.now()
    };
    
    return stockData;
    
  } catch (error) {
    console.error(`解析股票数据失败 ${code}:`, error);
    return null;
  }
}

// 批量获取股票数据
export async function fetchBatchStockData(codes: string[]): Promise<Record<string, StockData>> {
  if (codes.length === 0) {
    return {};
  }
  
  try {
    // 构建批量请求URL
    const url = `${STOCK_API_BASE}${codes.join(',')}`;
    console.log('正在批量获取股票数据:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('批量API响应数据长度:', text.length);
    
    const result: Record<string, StockData> = {};
    
    // 解析批量响应
    // 格式: v_sz159509="...", v_sh513500="..."
    const stockDataMatches = text.match(/v_([^=]+)="([^"]+)"/g);
    
    if (stockDataMatches) {
      for (const match of stockDataMatches) {
        const stockMatch = match.match(/v_([^=]+)="([^"]+)"/);
        if (stockMatch) {
          const stockCode = stockMatch[1];
          const stockDataString = stockMatch[2];
          
          const stockData = parseStockData(stockCode, stockDataString);
          if (stockData) {
            result[stockCode] = stockData;
          }
        }
      }
    }
    
    console.log(`批量获取完成，成功获取 ${Object.keys(result).length}/${codes.length} 只股票数据`);
    return result;
    
  } catch (error) {
    console.error('批量获取股票数据失败:', error);
    return {};
  }
}

// 获取单个股票数据（保持向后兼容）
export async function fetchStockData(code: string): Promise<StockData | null> {
  try {
    const batchResult = await fetchBatchStockData([code]);
    return batchResult[code] || null;
  } catch (error) {
    console.error('获取单个股票数据失败:', error);
    return null;
  }
}

export async function fetchStockName(code: string): Promise<string | null> {
  try {
    console.log('正在获取股票名称，代码:', code);
    const data = await fetchStockData(code);
    
    if (!data) {
      console.error('获取股票数据失败，无法获取名称');
      return null;
    }
    
    if (!data.name) {
      console.error('股票数据中名称为空');
      return null;
    }
    
    console.log('成功获取股票名称:', data.name);
    return data.name;
    
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
