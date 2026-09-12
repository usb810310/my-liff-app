import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderText, userId } = body;

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const OWNER_USER_ID = process.env.LINE_OWNER_USER_ID;

    // 1. 通知客人：訂單已收到
    if (userId) {
      await fetch('https://api.line.me/v2/bot/message/push', {
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
              text: `✅ 您的訂單已收到！\n\n${orderText}\n\n我們會盡快為您準備！`,
            },
          ],
        }),
      });
    }

    // 2. 通知店家：有新訂單
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: OWNER_USER_ID,
        messages: [
          {
            type: 'text',
            text: `🔔 新訂單！\n\n${orderText}`,
          },
        ],
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}