export type DayHours = { open?: boolean; start?: string; end?: string };
export type BusinessHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>> & { shopClosed?: boolean };

export type ShopStatus = {
  isOpen: boolean;
  canOrder: boolean;
  label: string;
  detail: string;
};

const DEFAULT_HOURS = { open: true, start: '13:00', end: '20:00' };
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function taipeiParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    dayKey: get('weekday').toLowerCase().slice(0, 3) as (typeof DAY_KEYS)[number],
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function dayHours(hours: BusinessHours, key: (typeof DAY_KEYS)[number]) {
  return { ...DEFAULT_HOURS, ...(hours[key] || {}) };
}

// 尚未設定營業時間（null）時視為營業，避免設定資料遺失就鎖住下單
export function getShopStatus(hours: BusinessHours | null, now = new Date()): ShopStatus {
  if (!hours) return { isOpen: true, canOrder: true, label: '今日營業中', detail: '' };
  if (hours.shopClosed) {
    return { isOpen: false, canOrder: false, label: '店休中', detail: '目前店休中，線上點餐暫停，歡迎先瀏覽口味。' };
  }
  const { dayKey, minutes } = taipeiParts(now);
  const today = dayHours(hours, dayKey);
  const tomorrow = dayHours(hours, taipeiParts(new Date(now.getTime() + 86400000)).dayKey);

  const isOpen = today.open && minutes >= toMinutes(today.start) && minutes < toMinutes(today.end);
  const todayCanOrder = today.open && minutes < toMinutes(today.end);
  const canOrder = todayCanOrder || tomorrow.open;
  if (isOpen) return { isOpen, canOrder, label: '今日營業中', detail: `營業時間 ${today.start} – ${today.end}` };

  const label = !today.open ? '今日店休' : minutes < toMinutes(today.start) ? '尚未營業' : '今日已打烊';
  if (!canOrder) return { isOpen, canOrder, label, detail: '今天與明天都不營業，線上點餐暫停，歡迎先瀏覽口味。' };
  const when = todayCanOrder ? '今天' : '明天';
  return { isOpen, canOrder, label, detail: `目前未營業，仍可預約${when}取餐。` };
}
