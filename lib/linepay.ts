import { createHmac, randomUUID } from 'node:crypto';

type LinePayConfig = {
  channelId: string;
  channelSecret: string;
  baseUrl: string;
  merchantDeviceProfileId?: string;
};

type FirebaseOrder = {
  key: string;
  orderNo?: string | number;
  userId?: string | null;
  total?: number | string;
  items?: Array<{ name?: string; price?: number; qty?: number; flavorDisplay?: string }>;
  [key: string]: unknown;
};

const DEFAULT_DATABASE_URL = 'https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app';

export function getLinePayConfig(): LinePayConfig {
  const channelId = process.env.LINEPAY_CHANNEL_ID;
  const channelSecret = process.env.LINEPAY_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    throw new Error('LINE Pay API 憑證尚未設定，請設定 LINEPAY_CHANNEL_ID 與 LINEPAY_CHANNEL_SECRET');
  }
  return {
    channelId,
    channelSecret,
    baseUrl: process.env.LINEPAY_API_BASE || 'https://sandbox-api-pay.line.me',
    merchantDeviceProfileId: process.env.LINEPAY_MERCHANT_DEVICE_PROFILE_ID,
  };
}

export function getPublicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function getLiffReturnUrl() {
  return process.env.NEXT_PUBLIC_LIFF_URL || 'https://liff.line.me/2011536222-v4OvTSup';
}

function encodeLargeIntegers(text: string) {
  return text.replace(/:\s*(\d{16,})(?=\s*[,}])/g, ': "$1"');
}

export async function callLinePay<T>({
  method,
  path,
  body,
  timeoutMs = 40000,
}: {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}) {
  const config = getLinePayConfig();
  const nonce = randomUUID();
  const rawBody = body ? JSON.stringify(body) : '';
  const signature = createHmac('sha256', config.channelSecret)
    .update(config.channelSecret + path + rawBody + nonce)
    .digest('base64');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-LINE-Authorization': signature,
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-ChannelId': config.channelId,
  };
  if (config.merchantDeviceProfileId) {
    headers['X-LINE-MerchantDeviceProfileId'] = config.merchantDeviceProfileId;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers,
    body: method === 'POST' ? rawBody : undefined,
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  const rawResponse = await response.text();
  let data: T & { returnCode?: string; returnMessage?: string; statusMessage?: string };
  try {
    data = JSON.parse(encodeLargeIntegers(rawResponse));
  } catch {
    throw new Error(`LINE Pay 回應格式錯誤（HTTP ${response.status}）`);
  }
  if (!response.ok || data.returnCode !== '0000') {
    throw new Error(data.returnMessage || data.statusMessage || `LINE Pay API 錯誤（${data.returnCode || response.status}）`);
  }
  return data;
}

export async function findOrderByNo(orderNo: string | number) {
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL;
  const response = await fetch(`${databaseUrl}/orders.json`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('無法讀取 Firebase 訂單資料');
  const data = (await response.json()) as Record<string, Omit<FirebaseOrder, 'key'>> | null;
  const match = Object.entries(data || {}).find(([, order]) => String(order?.orderNo) === String(orderNo));
  return match ? ({ key: match[0], ...match[1] } as FirebaseOrder) : null;
}

export async function updateOrder(order: FirebaseOrder, patch: Record<string, unknown>) {
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL;
  const response = await fetch(`${databaseUrl}/orders/${encodeURIComponent(order.key)}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('無法更新 Firebase 訂單狀態');
}

export type { FirebaseOrder };
