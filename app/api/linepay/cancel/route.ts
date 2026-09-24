import { NextResponse } from 'next/server';
import { findOrderByNo, getLiffReturnUrl, updateOrder } from '@/lib/linepay';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const orderNo = incomingUrl.searchParams.get('orderId');
  const transactionId = incomingUrl.searchParams.get('transactionId');
  const returnUrl = new URL(getLiffReturnUrl());
  returnUrl.searchParams.set('payment', 'cancelled');
  if (orderNo) returnUrl.searchParams.set('orderId', orderNo);

  try {
    if (orderNo) {
      const order = await findOrderByNo(orderNo);
      if (order && order.payment !== '已付款') {
        await updateOrder(order, {
          payment: '已取消',
          linePayTransactionId: transactionId || order.linePayTransactionId || null,
          paymentCancelledAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('LINE Pay cancel handling failed:', error);
    returnUrl.searchParams.set('payment', 'cancel-error');
  }

  return NextResponse.redirect(returnUrl);
}
