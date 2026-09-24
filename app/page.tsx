'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, get, limitToLast, push, query, ref, set } from 'firebase/database';
import styles from './page.module.css';

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type Order = {
  orderNo?: string | number;
  total?: string | number;
  remark?: string;
  time?: string;
  date?: string;
  status?: string;
  payment?: string;
  voided?: boolean;
  items?: OrderItem[];
};

function getPaymentStatus(order: Order) {
  if (order.voided || order.payment === '已取消') return '已取消';
  if (order.payment === '已付款' || order.payment === 'paid' || order.payment === '已確認') return '已付款';
  if (order.payment === '付款處理中' || order.payment === 'processing') return '付款處理中';
  if (order.payment === '付款失敗' || order.payment === 'failed') return '付款失敗';
  return '尚未付款';
}

type OrderItem = {
  name?: string;
  price?: number;
  qty?: number;
  flavorDisplay?: string;
};

function getOrderStatus(order: Order) {
  if (order.voided) return '已取消';
  const status = order.status || order.payment;
  if (status === 'confirmed' || status === '已確認') return '已確認';
  if (status === 'preparing' || status === '製作中') return '製作中';
  if (status === 'ready' || status === '可取餐') return '可取餐';
  if (status === 'completed' || status === '已完成') return '已完成';
  if (status === 'cancelled' || status === '已取消') return '已取消';
  if (status === '待確認' || status === 'pending') return '待確認';
  return status || '已送出';
}

function formatOrderDate(order: Order) {
  const rawDate = order.time || order.date;
  if (!rawDate) return '日期未提供';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return order.date || rawDate;
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatOrderItems(items?: OrderItem[]) {
  if (!items?.length) return ['品項明細請洽店家確認'];
  return items.map((item) => {
    const quantity = item.qty && item.qty > 1 ? ` × ${item.qty}` : '';
    const flavor = item.flavorDisplay ? ` · ${item.flavorDisplay}` : '';
    return `${item.name || '冰淇淋品項'}${quantity}${flavor}`;
  });
}

const firebaseConfig = {
  apiKey: 'AIzaSyDvzZKr2x3TGeOFZGisKKXjbYH00DLVhKg',
  authDomain: 'omg-menu-5761a.firebaseapp.com',
  databaseURL: 'https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'omg-menu-5761a',
  storageBucket: 'omg-menu-5761a.firebasestorage.app',
  messagingSenderId: '193209930119',
  appId: '1:193209930119:web:d9216165be9ef6c0bcc322',
};

function getGelatoDatabase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getDatabase(app);
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('正在初始化...');
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'member'>('home');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [wishText, setWishText] = useState('');
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [wishSuccess, setWishSuccess] = useState(false);
  const [payingOrderNo, setPayingOrderNo] = useState<string | number | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const initLiff = async () => {
      setStatus('正在初始化...');
      try {
        await Promise.race([
          liff.init({ liffId: '2011536222-v4OvTSup' }),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('連線逾時，請確認網路後重試')), 10000)),
        ]);
        if (!liff.isLoggedIn()) {
          if (!cancelled) setStatus('請從 LINE 開啟此頁面以完成登入');
          liff.login();
          return;
        }
        if (cancelled) return;
        setStatus('載入中...');
        const p = await liff.getProfile();
        if (cancelled) return;
        setProfile(p);
        setStatus('');
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '未知錯誤';
        setStatus(message);
      }
    };
    initLiff();
    return () => {
      cancelled = true;
    };
  }, [initAttempt]);

  const loadOrders = async () => {
    if (!profile?.userId) return;
    setIsLoadingOrders(true);
    try {
      const snapshot = await get(query(ref(getGelatoDatabase(), 'orders'), limitToLast(20)));
      const userOrders: Order[] = [];
      snapshot.forEach((child) => {
        const order = child.val() as Order & { userId?: string };
        if (order.userId === profile.userId) userOrders.push(order);
      });
      userOrders.sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());
      setOrders(userOrders);
    } catch (err) {
      console.error(err);
      alert('查詢失敗，請稍後再試');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const submitWish = async () => {
    if (!wishText.trim() || !profile) return;
    setIsSubmittingWish(true);
    try {
      const wishRef = push(ref(getGelatoDatabase(), 'wishlist'));
      await set(wishRef, {
        userId: profile.userId,
        displayName: profile.displayName,
        wishText: wishText.trim(),
        timestamp: Date.now(),
        status: 'pending',
      });
      setWishSuccess(true);
      setWishText('');
      window.setTimeout(() => setWishSuccess(false), 3000);
    } catch (err) {
      console.error('許願失敗:', err);
      alert('許願失敗，請稍後再試');
    } finally {
      setIsSubmittingWish(false);
    }
  };

  const switchTab = (tab: 'home' | 'orders' | 'member') => {
    setActiveTab(tab);
    if (tab === 'orders') loadOrders();
  };

  const retryLiff = () => {
    setProfile(null);
    setInitAttempt((attempt) => attempt + 1);
  };

  const startLinePay = async (order: Order) => {
    if (!order.orderNo || !profile?.userId || payingOrderNo) return;
    setPayingOrderNo(order.orderNo);
    try {
      const response = await fetch('/api/linepay/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          orderNo: order.orderNo,
          amount: Number(order.total || 0),
          items: order.items || [],
          remark: order.remark || '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.error || 'LINE Pay 付款服務尚未完成設定');
      }
      window.location.href = result.paymentUrl;
    } catch (err) {
      console.error('LINE Pay 付款請求失敗:', err);
      alert(err instanceof Error ? err.message : 'LINE Pay 付款失敗，請稍後再試');
      setPayingOrderNo(null);
    }
  };

  if (!profile && (status.includes('正在初始化') || status === '載入中...')) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingLogo}><img src="/logo-new.png" alt="On My Gelato" /></div>
        <span className={styles.loadingDot} />
        <p>正在準備今天的冰淇淋</p>
      </main>
    );
  }

  if (!profile && status) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingLogo}><img src="/logo-new.png" alt="On My Gelato" /></div>
        <div className={styles.initErrorCard}>
          <p className={styles.initErrorKicker}>PLEASE TRY AGAIN</p>
          <h1>頁面暫時無法載入</h1>
          <p>{status}</p>
          <button type="button" className={styles.retryButton} onClick={retryLiff}>重新載入</button>
          <button type="button" className={styles.reloadButton} onClick={() => window.location.reload()}>重新整理頁面</button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.appShell}>
      <header className={styles.topbar}>
        <div className={styles.brandLockup}>
          <img src="/logo-new.png" alt="On My Gelato" className={styles.brandLogo} />
          <div>
            <p className={styles.eyebrow}>ARTISAN GELATO</p>
            <p className={styles.brandName}><span>On</span> My <b>Gelato</b></p>
          </div>
        </div>
        <span className={styles.livePill}><i /> 今日營業中</span>
      </header>

      <section className={styles.content} key={activeTab}>
        {status && !profile && <div className={styles.errorBanner}>{status}</div>}

        {activeTab === 'home' && (
          <div className={styles.homeView}>
            <section className={styles.heroCard}>
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>BUON GIORNO, GELATO LOVER</p>
                <h1>今天，<br /><em>想來一球</em>什麼？</h1>
                <p className={styles.heroDescription}>每天新鮮製作，讓一口冰涼的義式風味，替今天留下一點甜。</p>
                <a className={styles.primaryButton} href="/menu/">探索今日口味 <span>↗</span></a>
              </div>
              <div className={styles.heroArt} aria-hidden="true">
                <div className={styles.sunShape} />
                <div className={`${styles.scoop} ${styles.scoopPistachio}`} />
                <div className={`${styles.scoop} ${styles.scoopStrawberry}`} />
                <div className={styles.cone}><span /></div>
                <span className={styles.artLabel}>FRESH<br />EVERY DAY</span>
              </div>
            </section>

            <section className={styles.welcomeRow}>
              <div className={styles.avatarWrap}>
                {profile?.pictureUrl ? <img src={profile.pictureUrl} alt="會員頭像" /> : <span>OG</span>}
              </div>
              <div>
                <p className={styles.miniLabel}>WELCOME BACK</p>
                <h2>{profile ? `${profile.displayName}，歡迎回來` : '歡迎來到 On My Gelato'}</h2>
              </div>
              <span className={styles.sparkle}>✦</span>
            </section>

            <div className={styles.quickGrid}>
              <a href="/menu/" className={`${styles.quickCard} ${styles.greenCard}`}><span className={styles.quickIcon}>✦</span><span><b>今日口味</b><small>立即點餐</small></span><strong>↗</strong></a>
              <button onClick={() => switchTab('orders')} className={`${styles.quickCard} ${styles.creamCard}`}><span className={styles.quickIcon}>▤</span><span><b>我的訂單</b><small>查看取餐進度</small></span><strong>›</strong></button>
            </div>

            <section className={styles.noteCard}>
              <span className={styles.noteMark}>“</span>
              <p>真正的義式冰淇淋，<br /><b>不只是一種甜。</b></p>
              <span className={styles.noteCaption}>— MADE WITH PASSION</span>
            </section>
          </div>
        )}

        {activeTab === 'orders' && (
          <section className={styles.pageView}>
            <div className={styles.sectionHeading}><div><p className={styles.kicker}>YOUR SWEET MOMENTS</p><h1>我的訂單</h1></div><button type="button" className={styles.refreshButton} onClick={loadOrders} disabled={isLoadingOrders} aria-label="重新整理訂單">{isLoadingOrders ? '…' : '↻'}</button></div>
            {isLoadingOrders ? <div className={styles.emptyState}><span className={styles.loadingDot} /><p>正在找回你的甜蜜紀錄…</p></div> : orders.length === 0 ? <div className={styles.emptyState}><span className={styles.emptyEmoji}>○</span><h3>還沒有訂單</h3><p>今天就選一個喜歡的口味吧！</p><a href="/menu/" className={styles.secondaryButton}>前往今日口味</a></div> : <div className={styles.orderList}>{orders.map((order, index) => <article key={`${order.orderNo}-${index}`} className={styles.orderCard}>
              <div className={styles.orderTopline}><span className={styles.orderLabel}>ORDER · {formatOrderDate(order)}</span><span className={`${styles.orderStatus} ${order.voided ? styles.orderStatusCancelled : ''}`}>{getOrderStatus(order)}</span></div>
              <div className={styles.orderMain}><div><h3>#{order.orderNo ?? '—'}</h3><p className={styles.pickupText}>{order.remark || '取餐時間未指定'}</p></div><strong>${order.total ?? 0}</strong></div>
              <div className={styles.orderDetails}><span className={styles.detailLabel}>品項摘要</span><ul>{formatOrderItems(order.items).map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul></div>
              <div className={styles.paymentRow}><span>LINE Pay <b>{getPaymentStatus(order)}</b></span>{getPaymentStatus(order) === '尚未付款' && !order.voided && <button className={styles.linePayButton} onClick={() => startLinePay(order)} disabled={payingOrderNo === order.orderNo}>{payingOrderNo === order.orderNo ? '前往付款中…' : '使用 LINE Pay'}</button>}</div>
            </article>)}</div>}
          </section>
        )}

        {activeTab === 'member' && (
          <section className={styles.pageView}>
            <div className={styles.memberHero}><div className={styles.memberAvatar}>{profile?.pictureUrl ? <img src={profile.pictureUrl} alt="會員頭像" /> : <span>OG</span>}</div><p className={styles.kicker}>GELATO CLUB MEMBER</p><h1>{profile?.displayName || 'Gelato Lover'}</h1><p className={styles.memberId}>ID · {profile?.userId?.slice(-8) || 'WELCOME'}</p></div>
            <a href="https://lin.ee/sB558niE" target="_blank" rel="noopener noreferrer" className={styles.lineButton}><span>LINE</span> 加入好友，接收最新口味 <b>↗</b></a>
            <div className={styles.wishCard}><div className={styles.wishHeading}><span>✦</span><div><p className={styles.kicker}>TASTE LAB</p><h2>口味許願池</h2></div></div><p>下一球，也許就是你最想吃的那一球。</p><textarea value={wishText} onChange={(e) => setWishText(e.target.value)} placeholder="例如：海鹽焦糖、開心果…" /><button onClick={submitWish} disabled={isSubmittingWish || !wishText.trim()} className={styles.wishButton}>{isSubmittingWish ? '送出中…' : '送出我的願望 ✦'}</button>{wishSuccess && <p className={styles.successMessage}>✓ 收到了！謝謝你的口味提案。</p>}</div>
          </section>
        )}
      </section>

      <nav className={styles.bottomNav} aria-label="主要導覽">
        {([['home', '⌂', '首頁'], ['orders', '▤', '訂單'], ['member', '○', '會員']] as const).map(([tab, icon, label]) => <button key={tab} onClick={() => switchTab(tab)} className={activeTab === tab ? styles.activeNav : ''}><span>{icon}</span><small>{label}</small></button>)}
      </nav>
    </main>
  );
}
