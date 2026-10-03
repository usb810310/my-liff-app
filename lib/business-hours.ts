export type DayHours = { open?: boolean; start?: string; end?: string };
export type BusinessHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>>;

export type ShopStatus = {
  isOpen: boolean;
  reason: 'open' | 'closed-today' | 'before-open' | 'after-close';
  label: string;
  detail: string;
};

const DEFAULT_HOURS = { open: true, start: '13:00', end: '20:00' };

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getTaipeiNow(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    dayKey: get('weekday').toLowerCase().slice(0, 3) as keyof BusinessHours,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

// 尚未設定營業時間（null）時視為營業，避免設定資料遺失就鎖住下單
export function getShopStatus(hours: BusinessHours | null, now = new Date()): ShopStatus {
  if (!hours) return { isOpen: true, reason: 'open', label: '今日營業中', detail: '' };
  const { dayKey, minutes } = getTaipeiNow(now);
  const day = { ...DEFAULT_HOURS, ...(hours[dayKey] || {}) };
  if (!day.open) {
    return { isOpen: false, reason: 'closed-today', label: '今日店休', detail: '今天店休，線上點餐暫停，歡迎先瀏覽口味。' };
  }
  if (minutes < toMinutes(day.start)) {
    return { isOpen: false, reason: 'before-open', label: '尚未營業', detail: `今天 ${day.start} 開始營業，屆時開放線上點餐。` };
  }
  if (minutes >= toMinutes(day.end)) {
    return { isOpen: false, reason: 'after-close', label: '今日已打烊', detail: `今天營業至 ${day.end}，線上點餐已暫停。` };
  }
  return { isOpen: true, reason: 'open', label: '今日營業中', detail: `營業時間 ${day.start} – ${day.end}` };
}
