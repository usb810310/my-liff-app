'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState('正在初始化...');
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState<any[]>([]);
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
        } else {
          setStatus('載入中...');
          const p = await liff.getProfile();
          setProfile(p);
          setStatus('');
        }
      } catch (err: any) {
        setStatus('❌ 錯誤：' + (err.message || '未知錯誤'));
      }
    };
    initLiff();
  }, []);

  const loadOrders = async () => {
    if (!profile || !profile.userId) return;
    setIsLoadingOrders(true);
    try {
      const { initializeApp } = await import('firebase/app');
      const { getDatabase, ref, query, limitToLast, get } = await import('firebase/database');
      const app = initializeApp({
        apiKey: "AIzaSyDvzZKr2x3TGeOFZGisKKXjbYH00DLVhKg",
        authDomain: "omg-menu-5761a.firebaseapp.com",
        databaseURL: "https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "omg-menu-5761a",
        storageBucket: "omg-menu-5761a.firebasestorage.app",
        messagingSenderId: "193209930119",
        appId: "1:193209930119:web:d9216165be9ef6c0bcc322"
      });
      const db = getDatabase(app);
      const snapshot = await get(query(ref(db, 'orders'), limitToLast(20)));
      const userOrders: any[] = [];
      snapshot.forEach((child) => {
        const order = child.val();
        if (order.userId === profile.userId) userOrders.push(order);
      });
      userOrders.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
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
      const { initializeApp } = await import('firebase/app');
      const { getDatabase, ref, push, set } = await import('firebase/database');
      const app = initializeApp({
        apiKey: "AIzaSyDvzZKr2x3TGeOFZGisKKXjbYH00DLVhKg",
        authDomain: "omg-menu-5761a.firebaseapp.com",
        databaseURL: "https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "omg-menu-5761a",
        storageBucket: "omg-menu-5761a.firebasestorage.app",
        messagingSenderId: "193209930119",
        appId: "1:193209930119:web:d9216165be9ef6c0bcc322"
      });
      const db = getDatabase(app);
      const wishRef = push(ref(db, 'wishlist'));
      await set(wishRef, {
        userId: profile.userId,
        displayName: profile.displayName,
        wishText: wishText.trim(),
        timestamp: Date.now(),
        status: 'pending'
      });
      setWishSuccess(true);
      setWishText('');
      setTimeout(() => setWishSuccess(false), 3000);
    } catch (err) {
      console.error('許願失敗:', err);
      alert('許願失敗，請稍後再試');
    } finally {
      setIsSubmittingWish(false);
    }
  };

  if (status && status.includes('正在初始化')) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f2ef', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '64px', animation: 'spin 1.5s linear infinite' }}>🍨</div>
        <p style={{ color: '#8f8076', fontSize: '16px' }}>載入中...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: '#f5f2ef', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-transition {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>

      {/* 頂部 Logo 區（左上方，不在框框內） */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '16px 20px', 
        background: '#f5f2ef'
      }}>
        <img 
          src="https://omg-pos-systems.pages.dev/logo1.png" 
          alt="On My Gelato" 
          style={{ height: '50px', width: 'auto', objectFit: 'contain', borderRadius: '10px' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
            <span style={{ color: '#009246' }}>On </span>
            <span style={{ color: '#4a4a4a' }}>My </span>
            <span style={{ color: '#ce2b37' }}>Gelato</span>
          </span>
          <span style={{ fontSize: '12px', fontWeight: 400, color: '#8a7a6e', letterSpacing: '1px' }}> 義式冰淇淋 專賣店</span>
        </div>
      </div>

          {/* 👇 主要內容區（重新包上白色卡片） 👇 */}
      <div 
        key={activeTab} 
        className="page-transition"
        style={{ 
          padding: '20px 16px',
          height: 'calc(100dvh - 100px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}
      >
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '30px 24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginTop: '20px'
        }}>
          {activeTab === 'home' && (
            <div style={{ textAlign: 'center' }}>
              {profile && (
                <>
                  <img src={profile.pictureUrl} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #e67e4a' }} />
                  <h2 style={{ fontSize: '22px', color: '#2c241e', marginTop: '12px' }}>你好，{profile.displayName}！</h2>
                  <p style={{ color: '#8f8076', fontSize: '14px', marginBottom: '30px' }}>歡迎回來，今天想來點什麼口味呢？</p>
                </>
              )}
              <a href="/menu/" style={{ display: 'block', background: '#06C755', color: '#fff', padding: '18px', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 8px 20px rgba(6,199,85,0.3)' }}>
                🍦 立即點餐
              </a>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#2c241e', textAlign: 'center' }}>📋 我的訂單</h3>
              {isLoadingOrders ? <p style={{ textAlign: 'center' }}>載入中...</p> : orders.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center' }}>目前沒有訂單記錄</p> : orders.map((o, i) => (
                <div key={i} style={{ background: '#fcf9f6', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid #f0e8e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong>#{o.orderNo}</strong>
                    <span style={{ color: '#e67e4a', fontWeight: 'bold' }}>${o.total}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#8a7a6e' }}>取餐：{o.remark || '未指定'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'member' && (
            <div style={{ textAlign: 'center' }}>
              {profile && (
                <>
                  <img src={profile.pictureUrl} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #e67e4a' }} />
                  <h2 style={{ fontSize: '24px', color: '#2c241e', marginTop: '16px' }}>{profile.displayName}</h2>
                  <p style={{ color: '#8f8076', fontSize: '13px', marginTop: '4px' }}>會員 ID：{profile.userId.slice(-8)}</p>
                </>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '30px' }}>
                <a href="https://lin.ee/sB558niE" target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                  <img src="https://scdn.line-apps.com/n/line_add_friends/btn/zh-Hant.png" alt="加入好友" style={{ height: '44px', border: '0', margin: '0 auto' }} />
                </a>

                {/* 許願池功能 */}
                <div style={{ marginTop: '24px', background: '#fcf9f6', borderRadius: '20px', padding: '20px', border: '1px solid #f0e8e0', textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', color: '#2c241e', margin: '0 0 8px 0', textAlign: 'center' }}>⭐ 口味許願池</h3>
                  <p style={{ fontSize: '13px', color: '#8a7a6e', marginBottom: '12px', textAlign: 'center' }}>想吃什麼口味？寫下來，我們會認真評估！</p>
                  <textarea value={wishText} onChange={(e) => setWishText(e.target.value)} placeholder="例如：海鹽焦糖、開心果..." style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #e0d6ce', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <button onClick={submitWish} disabled={isSubmittingWish || !wishText.trim()} style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '40px', border: 'none', background: isSubmittingWish || !wishText.trim() ? '#ccc' : '#e67e4a', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {isSubmittingWish ? '⏳ 送出中...' : '✨ 送出願望'}
                  </button>
                  {wishSuccess && <p style={{ color: '#06C755', textAlign: 'center', marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>✅ 許願成功！感謝您的建議。</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e3de', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'home' ? '#e67e4a' : '#aaa', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px' }}>🏠</span>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}>首頁</span>
        </button>
        <button onClick={() => { setActiveTab('orders'); loadOrders(); }} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'orders' ? '#e67e4a' : '#aaa', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'orders' ? 'bold' : 'normal' }}>訂單</span>
        </button>
        <button onClick={() => setActiveTab('member')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'member' ? '#e67e4a' : '#aaa', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px' }}>👤</span>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'member' ? 'bold' : 'normal' }}>會員</span>
        </button>
      </nav>
    </div>
  );
}