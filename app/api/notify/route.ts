import { NextResponse } from 'next/server';
import { getLiffReturnUrl } from '@/lib/linepay';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://omg-gelato79.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

type IncomingItem = {
  name?: string;
  qty?: number;
  price?: number;
  flavorDisplay?: string;
};

function formatItemLine(item: IncomingItem) {
  const qty = item.qty && item.qty > 1 ? ` × ${item.qty}` : '';
  const flavor = item.flavorDisplay ? ` · ${item.flavorDisplay}` : '';
  return `${item.name || '冰淇淋'}${qty}${flavor}`;
}

function buildPickupLabel(pickupDay?: string, pickupTime?: string) {
  if (pickupDay && pickupTime) {
    return `${pickupDay === 'tomorrow' ? '明天' : '今天'} ${pickupTime}`;
  }
  return '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderText,
      orderNo,
      pickupNo,
      pickupNumber,
      userId,
      items = [],
      total,
      pickupDay,
      pickupTime,
    } = body;

    const safeOrderText = orderText?.trim() || '';
    const customerPickupNumber = pickupNumber || pickupNo || '待分配';
    const pickupLabel = buildPickupLabel(pickupDay, pickupTime);

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const liveOrderUrl = new URL(getLiffReturnUrl());
    liveOrderUrl.searchParams.set('orderNo', String(orderNo || ''));
    const paymentUrl = new URL(liveOrderUrl);
    paymentUrl.searchParams.set('action', 'pay');

    if (!CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'LINE 環境變數未設定' },
        { status: 500, headers: corsHeaders },
      );
    }

    const detailContents: Record<string, unknown>[] = [];

    if (Array.isArray(items) && items.length) {
      detailContents.push({
        type: 'text',
        text: '您的點選配置',
        size: 'sm',
        weight: 'bold',
        color: '#292521',
        margin: 'lg',
      });

      items.forEach((item: IncomingItem, idx: number) => {
        const lineTotal = item.price != null ? Number(item.price) * (item.qty || 1) : null;
        detailContents.push({
          type: 'box',
          layout: 'horizontal',
          margin: idx === 0 ? 'sm' : 'xs',
          contents: [
            {
              type: 'text',
              text: `• ${formatItemLine(item)}`,
              size: 'sm',
              color: '#333333',
              wrap: true,
              flex: 4,
            },
            ...(lineTotal != null
              ? [{
                  type: 'text',
                  text: `$${lineTotal.toFixed(0)}`,
                  size: 'sm',
                  color: '#897c70',
                  align: 'end',
                  flex: 1,
                }]
              : []),
          ],
        });
      });
    } else if (safeOrderText) {
      detailContents.push({
        type: 'text',
        text: safeOrderText,
        wrap: true,
        size: 'xs',
        color: '#666666',
        margin: 'md',
      });
    }

    if (total != null && Number(total) > 0) {
      detailContents.push(
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: '合計', size: 'sm', color: '#292521', weight: 'bold' },
            {
              type: 'text',
              text: `$${Number(total).toFixed(0)}`,
              size: 'lg',
              color: '#d75b4f',
              weight: 'bold',
              align: 'end',
            },
          ],
        },
      );
    }

    const customerCard = {
      type: 'flex',
      altText: `✅ 訂單已收到！取餐編號 ${customerPickupNumber}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#06C755',
          paddingAll: '16px',
          contents: [
            { type: 'text', text: '✅ 訂單已收到！', color: '#ffffff', weight: 'bold', size: 'xl' },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            { type: 'text', text: '我們會盡快為您準備！', wrap: true, size: 'md', color: '#333333' },
            {
              type: 'text',
              text: `取餐編號：${customerPickupNumber}`,
              weight: 'bold',
              size: 'xl',
              color: '#06C755',
              margin: 'md',
            },
            {
              type: 'text',
              text: `線上訂單編號：${orderNo || '—'}`,
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
            ...(pickupLabel
              ? [
                  { type: 'separator', margin: 'lg' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    contents: [
                      { type: 'text', text: '取餐時間', size: 'xs', color: '#897c70' },
                      {
                        type: 'text',
                        text: pickupLabel,
                        size: 'md',
                        weight: 'bold',
                        color: '#292521',
                        margin: 'xs',
                      },
                    ],
                  },
                ]
              : []),
            ...detailContents,
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          margin: 'lg',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#2d1f14',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'LINE Pay 線上付款',
                uri: paymentUrl.toString(),
              },
            },
            {
              type: 'button',
              style: 'secondary',
              color: '#f0ebe6',
              height: 'sm',
              action: {
                type: 'uri',
                label: '查看訂單 LIVE',
                uri: liveOrderUrl.toString(),
              },
            },
          ],
        },
      },
    };

    let customerError: string | null = null;

    if (userId) {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to: userId, messages: [customerCard] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('❌ 通知客人失敗:', JSON.stringify(err));
        customerError = err.message || `通知客人失敗（HTTP ${res.status}）`;
      }
    }

    return NextResponse.json({ success: true, warning: customerError }, { headers: corsHeaders });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders },
    );
  }
}