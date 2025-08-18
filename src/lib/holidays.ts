import dayjs from "dayjs";

interface Holiday {
  date: string;
  name: string;
  isOffDay: boolean;
}

interface HolidayData {
  [date: string]: Holiday;
}

let holidays: HolidayData = {};
let isFetching = false;
let fetchPromise: Promise<void> | null = null;

async function fetchHolidays(year: number): Promise<void> {
  if (isFetching && fetchPromise) {
    return fetchPromise;
  }
  isFetching = true;
  fetchPromise = (async () => {
    try {
      // Use the internal proxy API route
      const response = await fetch(`/api/holidays/${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch holidays');
      }
      holidays = await response.json();
    } catch (error) {
      console.error("Error fetching holidays:", error);
      // In case of error, we can set it to empty to avoid retrying for a while
      holidays = {}; 
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();
  return fetchPromise;
}

async function ensureHolidays(date: dayjs.Dayjs): Promise<void> {
  const year = date.year();
  // Simple check if holidays for the year are loaded.
  // A more robust solution might check the range of dates in `holidays`.
  if (!Object.keys(holidays).some(d => d.startsWith(year.toString()))) {
    await fetchHolidays(year);
  }
}

export async function isHoliday(date: dayjs.Dayjs): Promise<boolean> {
  await ensureHolidays(date);
  const dateString = date.format('YYYY-MM-DD');
  const holiday = holidays[dateString];
  return holiday ? holiday.isOffDay : false;
}
