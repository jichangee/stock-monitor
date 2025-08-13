import { StockData } from '@/types/stock';

const STOCK_API_BASE = 'https://qt.gtimg.cn/q=';

// 解码股票名称，处理乱码问题
function decodeStockName(name: string): string {
  if (!name) return '';
  
  try {
    // 首先尝试直接返回，看是否已经是正确编码
    if (/^[\u4e00-\u9fa5a-zA-Z0-9\s\-\(\)]+$/.test(name)) {
      return name;
    }
    
    // 尝试使用 decodeURIComponent 解码
    try {
      const decoded = decodeURIComponent(name);
      if (decoded && decoded !== name) {
        return decoded;
      }
    } catch {}
    
    // 尝试使用 unescape 解码
    try {
      const unescaped = unescape(name);
      if (unescaped && unescaped !== name) {
        return unescaped;
      }
    } catch {}
    
    // 尝试处理可能的GBK编码（通过URL编码转换）
    try {
      // 如果名称包含 % 字符，可能是URL编码
      if (name.includes('%')) {
        const decoded = decodeURIComponent(name);
        if (decoded && decoded !== name) {
          return decoded;
        }
      }
    } catch {}
    
    // 尝试处理可能的Unicode转义序列
    try {
      if (name.includes('\\u')) {
        const unicodeDecoded = name.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        if (unicodeDecoded && unicodeDecoded !== name) {
          return unicodeDecoded;
        }
      }
    } catch {}
    
    // 如果所有方法都失败，记录警告并返回原始名称
    console.warn('无法解码股票名称，可能存在编码问题:', name);
    return name;
    
  } catch (error) {
    console.error('解码股票名称时发生错误:', error);
    return name;
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
    const rawName = data[1];
    const decodedName = decodeStockName(rawName);
    
    console.log('原始名称:', rawName);
    console.log('解码后名称:', decodedName);
    
    const stockData: StockData = {
      code: data[0],
      name: decodedName,
      currentPrice: parseFloat(data[3]) || 0,
      change: parseFloat(data[31]) || 0,
      changePercent: changePercent,
      open: parseFloat(data[5]) || 0,
      high: parseFloat(data[33]) || 0,
      low: parseFloat(data[34]) || 0,
      volume: parseFloat(data[6]) || 0,
      premium: Math.abs(parseFloat(data[77]) || 0), // 溢价使用涨跌幅的绝对值
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
