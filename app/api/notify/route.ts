import { NextResponse } from 'next/server';

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
    const { orderText, userId, displayName, pictureUrl } = body;

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const OWNER_USER_ID = process.env.LINE_OWNER_USER_ID;

    if (!CHANNEL_ACCESS_TOKEN || !OWNER_USER_ID) {
      return NextResponse.json(
        { success: false, error: 'LINE 環境變數未設定' },
        { status: 500, headers: corsHeaders },
      );
    }

    // 建立店家端的 Flex Message 卡片
    const ownerCard = {
      type: 'flex',
      altText: `🔔 新訂單！來自 ${displayName || '客人'}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#06C755', paddingAll: '16px',
          contents: [{ type: 'text', text: '🔔 新訂單！', color: '#ffffff', weight: 'bold', size: 'xl' }],
        },
        hero: pictureUrl ? { type: 'image', url: pictureUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' } : undefined,
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: `👤 ${displayName || '匿名客人'}`, weight: 'bold', size: 'lg' },
            { type: 'separator' },
            { type: 'text', text: orderText, wrap: true, size: 'sm', color: '#333333' },
          ],
        },
      },
    };

    // 建立客人端的 Flex Message 卡片
    const customerCard = {
      type: 'flex',
      altText: '✅ 您的訂單已收到！',
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
            { type: 'separator' },
            { type: 'text', text: orderText, wrap: true, size: 'xs', color: '#666666' },
          ],
        },
      },
    };

    let customerError: string | null = null;

    // 1. 通知客人
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

    // 2. 通知店家
    const ownerRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: OWNER_USER_ID, messages: [ownerCard] }),
    });

    if (!ownerRes.ok) {
      const err = await ownerRes.json().catch(() => ({}));
      console.error('❌ 通知店家失敗:', JSON.stringify(err));
      return NextResponse.json(
        { success: false, error: err.message || 'LINE API 錯誤' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json({ success: true, warning: customerError }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}