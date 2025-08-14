import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 检查是否为工作日（周一到周五）
function isWeekday(date: dayjs.Dayjs): boolean {
  const day = date.day(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
  return day >= 1 && day <= 5;
}

// 检查当前时间是否在工作时间内（工作日 9:30-15:00）
export function isWithinTradingHours(): boolean {
  const now = dayjs();
  
  // 检查是否为工作日
  if (!isWeekday(now)) {
    return false;
  }
  
  // 检查时间是否在 9:30-15:00 之间
  const startTime = now.hour(9).minute(30).second(0);
  const endTime = now.hour(15).minute(0).second(0);
  
  return now.isAfter(startTime) && now.isBefore(endTime);
}

// 获取下一个交易时间
export function getNextTradingTime(): Date {
  const now = dayjs();
  
  // 如果当前是工作日且在交易时间内，返回下一个交易日的开始时间
  if (isWeekday(now) && isWithinTradingHours()) {
    // 如果当前时间超过15:00，返回下一个工作日9:30
    if (now.hour() >= 15) {
      return now.add(1, 'day').hour(9).minute(30).second(0).toDate();
    }
    // 否则返回当天的15:00
    return now.hour(15).minute(0).second(0).toDate();
  }
  
  // 如果当前不是工作日或不在交易时间，找到下一个工作日9:30
  let nextTradingDay = now;
  while (!isWeekday(nextTradingDay)) {
    nextTradingDay = nextTradingDay.add(1, 'day');
  }
  
  return nextTradingDay.hour(9).minute(30).second(0).toDate();
}

// 检查是否为新的交易日（用于重置通知状态）
export function isNewTradingDay(lastNotificationDate?: string): boolean {
  if (!lastNotificationDate) {
    return true;
  }
  
  const lastDate = dayjs(lastNotificationDate);
  const today = dayjs();
  
  // 如果最后通知日期不是今天，则为新交易日
  return !lastDate.isSame(today, 'day');
}

// 格式化时间显示
export function formatTime(date: Date): string {
  return dayjs(date).format('HH:mm:ss');
}

// 格式化日期显示
export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

// 获取当前交易状态描述
export function getTradingStatus(): string {
  if (!isWithinTradingHours()) {
    const nextTime = getNextTradingTime();
    return `非交易时间，下次交易时间：${formatDate(nextTime)} ${formatTime(nextTime)}`;
  }
  
  return '交易中';
}
