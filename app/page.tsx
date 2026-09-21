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
};

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

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: '2011536222-v4OvTSup' });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        setStatus('載入中...');
        const p = await liff.getProfile();
        setProfile(p);
        setStatus('');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知錯誤';
        setStatus(`❌ ${message}`);
      }
    };
    initLiff();
  }, []);

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

  if (status.includes('正在初始化')) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingLogo}><img src="/logo-new.png" alt="On My Gelato" /></div>
        <span className={styles.loadingDot} />
        <p>正在準備今天的冰淇淋</p>
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
            <div className={styles.sectionHeading}><div><p className={styles.kicker}>YOUR SWEET MOMENTS</p><h1>我的訂單</h1></div><span className={styles.headingIcon}>▤</span></div>
            {isLoadingOrders ? <div className={styles.emptyState}><span className={styles.loadingDot} /><p>正在找回你的甜蜜紀錄…</p></div> : orders.length === 0 ? <div className={styles.emptyState}><span className={styles.emptyEmoji}>○</span><h3>還沒有訂單</h3><p>今天就選一個喜歡的口味吧！</p><a href="/menu/" className={styles.secondaryButton}>前往今日口味</a></div> : <div className={styles.orderList}>{orders.map((order, index) => <article key={`${order.orderNo}-${index}`} className={styles.orderCard}><div><span className={styles.orderLabel}>ORDER</span><h3>#{order.orderNo ?? '—'}</h3><p>取餐：{order.remark || '未指定'}</p></div><strong>${order.total ?? 0}</strong></article>)}</div>}
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
