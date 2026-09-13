'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState('正在初始化...');
  const [activeTab, setActiveTab] = useState('home'); // home, orders, member
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [memberPoints, setMemberPoints] = useState<number | null>(null);

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

          // 載入會員點數
          try {
            const { getApp, getApps, initializeApp } = await import('firebase/app');
            const { getDatabase, ref, get } = await import('firebase/database');
            const app = getApps().length ? getApp() : initializeApp({
              apiKey: "AIzaSyDvzZKr2x3TGeOFZGisKKXjbYH00DLVhKg",
              authDomain: "omg-menu-5761a.firebaseapp.com",
              databaseURL: "https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app",
              projectId: "omg-menu-5761a",
              storageBucket: "omg-menu-5761a.firebasestorage.app",
              messagingSenderId: "193209930119",
              appId: "1:193209930119:web:d9216165be9ef6c0bcc322"
            });
            const db = getDatabase(app);
            const memberRef = ref(db, 'members/' + p.userId);
            const snapshot = await get(memberRef);
            if (snapshot.exists()) {
              setMemberPoints(snapshot.val().points || 0);
            } else {
              setMemberPoints(0);
            }
          } catch (err) {
            console.error('載入點數失敗:', err);
            setMemberPoints(0);
          }
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
      const { getApp, getApps, initializeApp } = await import('firebase/app');
      const { getDatabase, ref, query, limitToLast, get } = await import('firebase/database');
      const app = getApps().length ? getApp() : initializeApp({
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
    <div style={{ minHeight: '100vh', background: '#f5f2ef', paddingBottom: '80px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 頂部 Logo 區 */}
      <div style={{ padding: '20px 16px 10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="https://omg-pos-systems.pages.dev/logo1.png" alt="Logo" style={{ height: '50px', borderRadius: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>
            <span style={{ color: '#009246' }}>On </span>
            <span style={{ color: '#4a4a4a' }}>My </span>
            <span style={{ color: '#ce2b37' }}>Gelato</span>
          </span>
          <span style={{ fontSize: '12px', color: '#8a7a6e' }}>義式冰淇淋專賣店</span>
        </div>
      </div>

      {/* 主要內容區 */}
      <div style={{ padding: '16px' }}>
        {activeTab === 'home' && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            {profile && (
              <>
                <img src={profile.pictureUrl} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #e67e4a' }} />
                <h2 style={{ fontSize: '22px', color: '#2c241e', marginTop: '12px' }}>你好，{profile.displayName}！</h2>
                <p style={{ color: '#8f8076', fontSize: '14px', marginBottom: '30px' }}>歡迎回來，今天想來點什麼口味</p>
              </>
            )}
            <a href="/menu/" style={{ display: 'block', background: '#06C755', color: '#fff', padding: '18px', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 8px 20px rgba(6,199,85,0.3)', maxWidth: '300px', margin: '0 auto' }}>
              查看今日口味｜線上預定
            </a>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#2c241e' }}>📋 我的訂單</h3>
            {isLoadingOrders ? <p>載入中...</p> : orders.length === 0 ? <p style={{ color: '#aaa' }}>目前沒有訂單記錄</p> : orders.map((o, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
          <div style={{ textAlign: 'center', marginTop: '20px', padding: '0 16px' }}>
            {profile && (
              <>
                <img src={profile.pictureUrl} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #e67e4a' }} />
                <h2 style={{ fontSize: '24px', color: '#2c241e', marginTop: '16px' }}>{profile.displayName}</h2>
                <p style={{ color: '#8f8076', fontSize: '13px', marginTop: '4px' }}>會員 ID：{profile.userId.slice(-8)}</p>

                {/* 集點卡 UI 開始 */}
                <div style={{
                  marginTop: '24px',
                  background: 'linear-gradient(135deg, #fff5f0, #ffe8d8)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 8px 20px rgba(230, 126, 74, 0.15)',
                  border: '2px dashed #e67e4a'
                }}>
                  <h3 style={{ fontSize: '18px', color: '#e67e4a', margin: '0 0 16px 0' }}>🍦 我的集點卡</h3>

                  {/* 點數顯示 */}
                  <div style={{ fontSize: '48px', fontWeight: '900', color: '#2d1f14', lineHeight: 1 }}>
                    {memberPoints !== null ? memberPoints : '載入中...'}
                    <span style={{ fontSize: '16px', color: '#8a7a6e', fontWeight: 'bold', marginLeft: '8px' }}>點</span>
                  </div>

                  {/* 進度條 */}
                  <div style={{ marginTop: '16px', background: '#f0ebe6', borderRadius: '30px', height: '12px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(((memberPoints || 0) / 12) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #e67e4a, #f5b84d)',
                      borderRadius: '30px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <p style={{ fontSize: '13px', color: '#8a7a6e', marginTop: '8px' }}>
                    再集 {Math.max(12 - (memberPoints || 0), 0)} 點即可兌換一球冰淇淋！
                  </p>
                </div>

                {/* 會員短碼（給店家輸入用） */}
                <div style={{
                  marginTop: '16px',
                  background: '#f0ebe6',
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', color: '#6b5a4a' }}>🔑 會員短碼（給店家輸入）</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d1f14', letterSpacing: '2px' }}>
                    {profile.userId.slice(-6).toUpperCase()}
                  </span>
                </div>
                {/* 集點卡 UI 結束 */}
              </>
            )}
            <a
              href="https://lin.ee/sB558niE"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: '24px' }}
            >
              <img
                src="https://scdn.line-apps.com/n/line_add_friends/btn/zh-Hant.png"
                alt="加入好友"
                style={{ height: '44px', border: '0' }}
              />
            </a>
          </div>
        )}
      </div>

      {/* 底部導航欄 */}
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