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
      payMethod,
    } = body;

    const safeOrderText = orderText?.trim() || '';
    const customerPickupNumber = pickupNumber || pickupNo || '待分配';
    const pickupLabel = buildPickupLabel(pickupDay, pickupTime);

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const liveOrderUrl = new URL(getLiffReturnUrl());
    liveOrderUrl.searchParams.set('orderNo', String(orderNo || ''));

    if (!CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'LINE 環境變數未設定' },
        { status: 500, headers: corsHeaders },
      );
    }

    const itemRows: Record<string, unknown>[] = [];
    let itemCount = 0;
    (Array.isArray(items) ? (items as IncomingItem[]) : []).forEach((item, index) => {
      if (index > 0) {
        itemRows.push({ type: 'separator', margin: 'md', color: '#E5E5E5' });
      }
      const qty = item.qty && item.qty > 1 ? ` × ${item.qty}` : '';
      itemCount += item.qty || 1;
      const lineTotal = item.price != null ? Number(item.price) * (item.qty || 1) : null;
      itemRows.push({
        type: 'box',
        layout: 'horizontal',
        margin: index > 0 ? 'md' : 'md',
        contents: [
          { type: 'text', text: `${item.name || '冰淇淋'}${qty}`, size: 'md', color: '#111111', wrap: true, flex: 5 },
          ...(lineTotal != null
            ? [{ type: 'text', text: `$${lineTotal.toFixed(0)}`, size: 'md', color: '#111111', align: 'end', gravity: 'top', flex: 2 }]
            : []),
        ],
      });
      if (item.flavorDisplay) {
        const flavorText = item.flavorDisplay.split(/\s*\+\s*/).join('＋');
        itemRows.push({ type: 'text', text: flavorText, size: 'sm', color: '#444444', wrap: true, margin: 'xs', offsetStart: '16px' });
      }
    });
    if (!itemRows.length && safeOrderText) {
      itemRows.push({ type: 'text', text: safeOrderText, size: 'sm', color: '#444444', wrap: true, margin: 'md' });
    }

    const totalValue = total != null ? Number(total) : 0;
    const titleText = pickupLabel ? `下單成功~取餐時間: ${pickupLabel} ` : '您已送出訂單';

    const customerCard = {
      type: 'flex',
      altText: `您已送出訂單，取餐號碼 ${customerPickupNumber}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          spacing: 'none',
          contents: [
            { type: 'text', text: titleText, size: 'lg', weight: 'bold', color: '#111111', wrap: true },
            { type: 'text', text: `線上訂單編號：${orderNo || '—'}`, size: 'xs', color: '#555555', wrap: true, margin: 'sm' },
            { type: 'text', text: `取餐號碼：${customerPickupNumber}`, size: 'xl', weight: 'bold', style: 'italic', color: '#2F5BEA', margin: 'md' },
            { type: 'separator', margin: 'lg', color: '#111111' },
            ...itemRows,
            { type: 'separator', margin: 'lg', color: '#111111' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: `共 ${itemCount} 項`, size: 'md', color: '#111111', flex: 1 },
                { type: 'text', text: `合計 $${totalValue.toFixed(0)}`, size: 'md', weight: 'bold', color: '#111111', align: 'end', flex: 1 },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              color: '#2F5BEA',
              action: { type: 'uri', label: '查看訂單狀態', uri: liveOrderUrl.toString() },
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