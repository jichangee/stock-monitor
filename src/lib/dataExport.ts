import { StockMonitor } from '@/types/stock';
import { getStockMonitors, saveStockMonitors } from './stockMonitor';
import { generateUUID } from './utils';

// 设置数据的接口定义
export interface SettingsData {
  updateInterval: number;
  lastUpdated: number;
}

// 导出数据的接口定义
export interface ExportData {
  version: string;
  exportDate: string;
  monitors: StockMonitor[];
  settings?: SettingsData;
}

// 当前数据版本
const CURRENT_VERSION = '1.0.0';

/**
 * 导出所有监控数据
 */
export function exportMonitorData(): void {
  try {
    const monitors = getStockMonitors();
    
    const exportData: ExportData = {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      monitors: monitors
    };
    
    // 创建并下载文件
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stock-monitors-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('导出数据失败:', error);
    throw new Error('导出数据失败');
  }
}

/**
 * 导入监控数据
 */
export function importMonitorData(file: File): Promise<{ success: boolean; message: string; importedCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData: ExportData = JSON.parse(content);
        
        // 验证数据格式
        if (!importData.version || !importData.monitors || !Array.isArray(importData.monitors)) {
          resolve({
            success: false,
            message: '文件格式无效，请选择正确的导出文件',
            importedCount: 0
          });
          return;
        }
        
        // 验证版本兼容性
        if (importData.version !== CURRENT_VERSION) {
          resolve({
            success: false,
            message: `版本不兼容，当前版本: ${CURRENT_VERSION}，文件版本: ${importData.version}`,
            importedCount: 0
          });
          return;
        }
        
        // 验证监控数据
        const validMonitors = importData.monitors.filter(monitor => {
          return monitor.code && monitor.name && monitor.metrics && Array.isArray(monitor.metrics);
        });
        
        if (validMonitors.length === 0) {
          resolve({
            success: false,
            message: '文件中没有有效的监控数据',
            importedCount: 0
          });
          return;
        }
        
        // 获取现有数据
        const existingMonitors = getStockMonitors();
        
        // 合并数据（避免重复ID）
        const mergedMonitors = [...existingMonitors];
        
        validMonitors.forEach(importedMonitor => {
          // 检查是否已存在相同代码的监控
          const existingIndex = mergedMonitors.findIndex(m => m.code === importedMonitor.code);
          
          if (existingIndex >= 0) {
            // 更新现有监控
            mergedMonitors[existingIndex] = {
              ...importedMonitor,
              id: mergedMonitors[existingIndex].id, // 保持现有ID
              updatedAt: new Date()
            };
          } else {
            // 添加新监控
            mergedMonitors.push({
              ...importedMonitor,
              id: generateUUID(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        });
        
        // 保存合并后的数据
        saveStockMonitors(mergedMonitors);
        
        resolve({
          success: true,
          message: `成功导入 ${validMonitors.length} 个监控项目`,
          importedCount: validMonitors.length
        });
        
      } catch (error) {
        console.error('解析导入文件失败:', error);
        resolve({
          success: false,
          message: '文件解析失败，请检查文件格式',
          importedCount: 0
        });
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 导出设置数据
 */
export function exportSettingsData(settings: SettingsData): void {
  try {
    const exportData = {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      settings: settings
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stock-monitor-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('导出设置失败:', error);
    throw new Error('导出设置失败');
  }
}

/**
 * 导入设置数据
 */
export function importSettingsData(file: File): Promise<{ success: boolean; message: string; settings: SettingsData | null }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        if (!importData.version || !importData.settings) {
          resolve({
            success: false,
            message: '文件格式无效，请选择正确的设置文件',
            settings: null
          });
          return;
        }
        
        if (importData.version !== CURRENT_VERSION) {
          resolve({
            success: false,
            message: `版本不兼容，当前版本: ${CURRENT_VERSION}，文件版本: ${importData.version}`,
            settings: null
          });
          return;
        }
        
        resolve({
          success: true,
          message: '设置数据导入成功',
          settings: importData.settings as SettingsData
        });
        
      } catch (error) {
        console.error('解析设置文件失败:', error);
        resolve({
          success: false,
          message: '文件解析失败，请检查文件格式',
          settings: null
        });
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 导出所有数据（监控数据 + 设置数据）
 */
export function exportAllData(settings: SettingsData): void {
  try {
    const monitors = getStockMonitors();
    
    const exportData: ExportData = {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      monitors: monitors,
      settings: settings
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stock-monitor-all-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('导出所有数据失败:', error);
    throw new Error('导出所有数据失败');
  }
}

/**
 * 导入所有数据
 */
export function importAllData(file: File): Promise<{ success: boolean; message: string; importedCount: number; hasSettings: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData: ExportData = JSON.parse(content);
        
        if (!importData.version) {
          resolve({
            success: false,
            message: '文件格式无效，请选择正确的导出文件',
            importedCount: 0,
            hasSettings: false
          });
          return;
        }
        
        if (importData.version !== CURRENT_VERSION) {
          resolve({
            success: false,
            message: `版本不兼容，当前版本: ${CURRENT_VERSION}，文件版本: ${importData.version}`,
            importedCount: 0,
            hasSettings: false
          });
          return;
        }
        
        let importedCount = 0;
        let hasSettings = false;
        
        // 导入监控数据
        if (importData.monitors && Array.isArray(importData.monitors)) {
          const result = await importMonitorData(file);
          importedCount = result.importedCount;
        }
        
        // 检查是否有设置数据
        if (importData.settings) {
          hasSettings = true;
        }
        
        resolve({
          success: true,
          message: `成功导入 ${importedCount} 个监控项目${hasSettings ? '和设置数据' : ''}`,
          importedCount,
          hasSettings
        });
        
      } catch (error) {
        console.error('解析导入文件失败:', error);
        resolve({
          success: false,
          message: '文件解析失败，请检查文件格式',
          importedCount: 0,
          hasSettings: false
        });
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
}
