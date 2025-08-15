import { StockMonitor } from '@/types/stock';
import { getStockMonitors, addStockMonitor, updateStockMonitor } from './stockMonitor';

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
export async function exportMonitorData(): Promise<void> {
  try {
    const monitors = await getStockMonitors();
    
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
export async function importMonitorData(file: File): Promise<{ success: boolean; message: string; importedCount: number }> {
  const content = await file.text();
  const importData: ExportData = JSON.parse(content);

  if (!importData.version || !importData.monitors || !Array.isArray(importData.monitors)) {
    return { success: false, message: '文件格式无效', importedCount: 0 };
  }

  if (importData.version !== CURRENT_VERSION) {
    return { success: false, message: `版本不兼容`, importedCount: 0 };
  }

  const existingMonitors = await getStockMonitors();
  let importedCount = 0;

  for (const monitor of importData.monitors) {
    const existing = existingMonitors.find(m => m.code === monitor.code);
    if (existing) {
      await updateStockMonitor(existing.id, monitor);
    } else {
      await addStockMonitor(monitor);
    }
    importedCount++;
  }

  return { success: true, message: `成功导入 ${importedCount} 个监控`, importedCount };
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
export async function exportAllData(settings: SettingsData): Promise<void> {
  try {
    const monitors = await getStockMonitors();
    
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
export async function importAllData(file: File): Promise<{ success: boolean; message: string; importedCount: number; hasSettings: boolean }> {
  const content = await file.text();
  const importData: ExportData = JSON.parse(content);

  if (!importData.version) {
    return { success: false, message: '文件格式无效', importedCount: 0, hasSettings: false };
  }

  if (importData.version !== CURRENT_VERSION) {
    return { success: false, message: `版本不兼容`, importedCount: 0, hasSettings: false };
  }

  let importedCount = 0;
  if (importData.monitors && Array.isArray(importData.monitors)) {
    const result = await importMonitorData(file);
    importedCount = result.importedCount;
  }

  const hasSettings = !!importData.settings;

  return { 
    success: true, 
    message: `成功导入 ${importedCount} 个监控${hasSettings ? '和设置' : ''}`, 
    importedCount, 
    hasSettings 
  };
}
