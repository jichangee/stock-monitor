'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const SETTINGS_KEY = 'stock-monitor-settings';

interface SettingsData {
  updateInterval: number;
  lastUpdated: number;
}

const DEFAULT_SETTINGS: SettingsData = {
  updateInterval: 10,
  lastUpdated: Date.now()
};

interface SettingsContextType {
  settings: SettingsData;
  updateSettings: (newSettings: Partial<SettingsData>) => void;
  resetSettings: () => void;
  importSettings: (newSettings: SettingsData) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    // 从localStorage加载设置
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isPageActive = true;

    // 检测页面可见性变化
    const handleVisibilityChange = () => {
      isPageActive = !document.hidden;
      updateUpdateInterval(isPageActive);
    };

    // 检测用户活动
    const handleUserActivity = () => {
      if (!isPageActive) {
        isPageActive = true;
        updateUpdateInterval(true);
      }
      
      // 重置活动检测定时器
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        isPageActive = false;
        updateUpdateInterval(false);
      }, 30000); // 30秒无活动后认为用户离开
    };

    // 更新更新频率
    const updateUpdateInterval = (active: boolean) => {
      const newInterval = active ? 5 : 10;
      if (newInterval !== settings.updateInterval) {
        const updatedSettings = { ...settings, updateInterval: newInterval };
        setSettings(updatedSettings);
        
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
        } catch (error) {
          console.error('保存设置失败:', error);
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    // 初始化活动检测
    handleUserActivity();

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
    };
  }, [settings]);

  const updateSettings = (newSettings: Partial<SettingsData>) => {
    const updatedSettings = { ...settings, ...newSettings, lastUpdated: Date.now() };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('重置设置失败:', error);
    }
  };

  const importSettings = (newSettings: SettingsData) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('导入设置失败:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, importSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
