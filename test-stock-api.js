// 测试股票API的脚本
// 在浏览器控制台中运行此脚本

async function testStockName() {
  console.log('开始测试股票名称获取...');
  
  try {
    // 测试获取股票名称
    const code = 'sz159509';
    console.log('测试股票代码:', code);
    
    const response = await fetch(`https://qt.gtimg.cn/q=${code}`);
    const text = await response.text();
    
    console.log('原始响应:', text);
    
    // 尝试解析数据
    const match = text.match(/v_([^=]+)="([^"]+)"/);
    if (match) {
      const data = match[2].split('~');
      console.log('解析后的数据数组长度:', data.length);
      console.log('股票代码:', data[0]);
      console.log('原始名称:', data[1]);
      
      // 尝试不同的解码方法
      console.log('=== 解码测试 ===');
      console.log('原始名称:', data[1]);
      console.log('decodeURIComponent:', decodeURIComponent(data[1]));
      console.log('unescape:', unescape(data[1]));
      
      // 检查字符编码
      console.log('=== 字符编码分析 ===');
      for (let i = 0; i < Math.min(data[1].length, 10); i++) {
        const char = data[1][i];
        console.log(`字符 ${i}: "${char}" - 编码: ${char.charCodeAt(0)} (0x${char.charCodeAt(0).toString(16)})`);
      }
    } else {
      console.log('无法匹配数据格式');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testStockName();
