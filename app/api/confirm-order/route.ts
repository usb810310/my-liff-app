import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, orderNo } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
    }

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: `✅ 您的訂單 #${orderNo} 已確認！\n\n我們正在為您準備，請依選擇的時間前來取餐。`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('❌ 通知顧客失敗:', err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API 錯誤:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}