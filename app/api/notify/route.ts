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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderText, orderNo, pickupNo, pickupNumber, userId } = body;
    const customerPickupNumber = pickupNumber || pickupNo || '待分配';

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

    // 建立客人端的 Flex Message 卡片
    const customerCard = {
      type: 'flex',
      altText: `✅ 訂單已收到！取餐編號 ${customerPickupNumber}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#06C755', paddingAll: '16px',
          contents: [{ type: 'text', text: '✅ 訂單已收到！', color: '#ffffff', weight: 'bold', size: 'xl' }],
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '我們會盡快為您準備！', wrap: true, size: 'md', color: '#333333' },
            { type: 'text', text: `取餐編號：${customerPickupNumber}`, weight: 'bold', size: 'xl', color: '#06C755', margin: 'md' },
            { type: 'text', text: `線上訂單編號：${orderNo || '—'}`, size: 'sm', color: '#666666', margin: 'sm' },
            { type: 'separator' },
            { type: 'text', text: orderText, wrap: true, size: 'xs', color: '#666666' },
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

    // 只通知客人（不再通知店家）
    if (userId) {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` },
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
