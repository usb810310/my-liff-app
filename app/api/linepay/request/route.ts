import { NextResponse } from 'next/server';
import { callLinePay, findOrderByNo, getLiffReturnUrl, getPublicSiteUrl, updateOrder } from '@/lib/linepay';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderNo, userId } = body as { orderNo?: string | number; userId?: string };
    if (!orderNo || !userId) {
      return NextResponse.json({ success: false, error: '缺少 orderNo 或 userId' }, { status: 400 });
    }

    const order = await findOrderByNo(orderNo);
    if (!order) return NextResponse.json({ success: false, error: '找不到這筆訂單' }, { status: 404 });
    if (order.userId && order.userId !== userId) {
      return NextResponse.json({ success: false, error: '無權限操作這筆訂單' }, { status: 403 });
    }
    if (order.voided || order.payment === '已付款') {
      return NextResponse.json({ success: false, error: '這筆訂單目前無法付款' }, { status: 409 });
    }

    const amount = Number(order.total || 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: '訂單金額不正確' }, { status: 400 });
    }

    const products = (order.items || []).map((item, index) => ({
      id: `item-${index + 1}`,
      name: item.name || 'Gelato',
      quantity: Number(item.qty || 1),
      price: Number(item.price || 0),
      ...(item.flavorDisplay ? { options: item.flavorDisplay } : {}),
    }));
    const packages = [{
      id: 'gelato-store',
      amount,
      products: products.length ? products : [{ id: 'gelato-order', name: `On My Gelato 訂單 ${orderNo}`, quantity: 1, price: amount }],
    }];
    const siteUrl = getPublicSiteUrl();
    const requestBody = {
      amount,
      currency: 'TWD',
      orderId: String(orderNo),
      packages,
      redirectUrls: {
        confirmUrl: `${siteUrl}/api/linepay/confirm`,
        cancelUrl: `${siteUrl}/api/linepay/cancel`,
      },
    };

    const linePayResponse = await callLinePay<{ info?: { paymentUrl?: { web?: string; app?: string }; transactionId?: string | number } }>({
      method: 'POST',
      path: '/v4/payments/request',
      body: requestBody,
      timeoutMs: 15000,
    });
    const info = linePayResponse.info;
    const paymentUrl = info?.paymentUrl?.app || info?.paymentUrl?.web;
    if (!paymentUrl || !info?.transactionId) throw new Error('LINE Pay 未回傳付款網址或交易編號');

    await updateOrder(order, {
      payment: '付款處理中',
      paymentProvider: 'LINE_PAY',
      linePayTransactionId: String(info.transactionId),
      paymentRequestedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      webPaymentUrl: info.paymentUrl?.web || paymentUrl,
      appPaymentUrl: info.paymentUrl?.app || paymentUrl,
      transactionId: String(info.transactionId),
      orderNo: String(orderNo),
      returnUrl: getLiffReturnUrl(),
    });
  } catch (error) {
    console.error('LINE Pay request failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'LINE Pay 付款請求失敗' }, { status: 500 });
  }
}
