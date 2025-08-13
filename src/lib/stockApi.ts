import { StockData } from '@/types/stock';

const STOCK_API_BASE = 'https://qt.gtimg.cn/q=';

// 从东方财富API获取股票名称（备用方案）
async function fetchStockNameFromEastmoney(code: string): Promise<string | null> {
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

export async function fetchStockData(code: string): Promise<StockData | null> {
  try {
    const url = `${STOCK_API_BASE}${code}`;
    console.log('正在获取股票数据:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('原始响应数据:', text);
    
    // 尝试多种数据格式解析
    let data: string[] | null = null;
    
    // 格式1: v_xxx="..."
    const match1 = text.match(/v_([^=]+)="([^"]+)"/);
    if (match1) {
      data = match1[2].split('~');
      console.log('使用格式1解析，数据数组:', data);
    }
    
    // 格式2: 直接的数据字符串
    if (!data && text.includes('~')) {
      data = text.split('~');
      console.log('使用格式2解析，数据数组:', data);
    }
    
    if (!data || data.length < 32) {
      console.error('无法解析股票数据格式或数据字段不足:', {
        text: text.substring(0, 200) + '...',
        dataLength: data?.length || 0
      });
      return null;
    }
    
    const changePercent = parseFloat(data[32]) || 0;
    let finalName = ''
    finalName = await fetchStockNameFromEastmoney(code) || '';
    
    const stockData: StockData = {
      code: data[0],
      name: finalName,
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
    
    console.log('构建的股票数据:', stockData);
    return stockData;
    
  } catch (error) {
    console.error('获取股票数据失败:', error);
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
