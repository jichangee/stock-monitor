import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { isHoliday } from './holidays';

dayjs.extend(isBetween);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 兼容的 UUID 生成函数
export function generateUUID(): string {
  // 优先使用 crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 降级方案：使用 Math.random 生成伪随机 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 检查是否为工作日（周一到周五）
async function isTradingDay(date: dayjs.Dayjs): Promise<boolean> {
  const day = date.day(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
  const isWd = day >= 1 && day <= 5;
  if (!isWd) {
    return false;
  }
  return !(await isHoliday(date));
}

// 检查当前时间是否在工作时间内（工作日 9:30-15:00）
export async function isWithinTradingHours(): Promise<boolean> {
  const now = dayjs();
  if (!(await isTradingDay(now))) {
    return false;
  }

  const morningStart = now.hour(9).minute(30).second(0);
  const morningEnd = now.hour(11).minute(30).second(0);
  const afternoonStart = now.hour(13).minute(0).second(0);
  const afternoonEnd = now.hour(15).minute(0).second(0);

  return now.isBetween(morningStart, morningEnd, null, '()') || now.isBetween(afternoonStart, afternoonEnd, null, '()');
}

// 获取下一个交易时间
export async function getNextTradingTime(): Promise<Date> {
  let nextTradingDay = dayjs();

  // 循环直到找到下一个交易日
  while (true) {
    // 如果当天是交易日
    if (await isTradingDay(nextTradingDay)) {
      const morningStart = nextTradingDay.hour(9).minute(30).second(0);
      const afternoonStart = nextTradingDay.hour(13).minute(0).second(0);
      const afternoonEnd = nextTradingDay.hour(15).minute(0).second(0);

      // 如果当前时间在开盘前
      if (dayjs().isBefore(morningStart)) {
        return morningStart.toDate();
      }
      // 如果当前时间在午休
      if (dayjs().isBefore(afternoonStart)) {
        return afternoonStart.toDate();
      }
      // 如果当前时间在下午收盘后
      if (dayjs().isAfter(afternoonEnd)) {
        // 从第二天开始找
        nextTradingDay = nextTradingDay.add(1, 'day');
        continue;
      }
      // 交易时间内，理论上不会调用此函数，但作为兜底，返回下一个交易日的开盘时间
      nextTradingDay = nextTradingDay.add(1, 'day');
      continue;
    } else {
      // 如果当天不是交易日，则检查下一天
      nextTradingDay = nextTradingDay.add(1, 'day');
    }
  }
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
export async function getTradingStatus(): Promise<string> {
  if (!(await isWithinTradingHours())) {
    const nextTime = await getNextTradingTime();
    return `非交易时间，下次交易时间：${formatDate(nextTime)} ${formatTime(nextTime)}`;
  }
  
  return '交易中';
}
