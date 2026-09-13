'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState('正在初始化 LIFF...');
  const [orders, setOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: '2011536222-v4OvTSup' });
        
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          setStatus('已登入，載入資料中...');
          const p = await liff.getProfile();
          setProfile(p);
          setStatus('🎉 歡迎！');
        }
      } catch (err: any) {
        setStatus('❌ 錯誤：' + (err.message || '未知錯誤'));
      }
    };
    initLiff();
  }, []);

  // 查詢歷史訂單
  const loadOrders = async () => {
    if (!profile || !profile.userId) return;
    setIsLoadingOrders(true);
    try {
      // 動態載入 Firebase（避免 Next.js SSR 錯誤）
      const { initializeApp } = await import('firebase/app');
      const { getDatabase, ref, query, limitToLast, get } = await import('firebase/database');

      const firebaseConfig = {
        apiKey: "AIzaSyDvzZKr2x3TGeOFZGisKKXjbYH00DLVhKg",
        authDomain: "omg-menu-5761a.firebaseapp.com",
        databaseURL: "https://omg-menu-5761a-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "omg-menu-5761a",
        storageBucket: "omg-menu-5761a.firebasestorage.app",
        messagingSenderId: "193209930119",
        appId: "1:193209930119:web:d9216165be9ef6c0bcc322"
      };
      const app = initializeApp(firebaseConfig);
      const db = getDatabase(app);

      // 抓取最近 20 筆訂單，在前端過濾出這位客人的訂單（避免需要設定 Firebase 索引）
      const ordersRef = query(ref(db, 'orders'), limitToLast(20));
      const snapshot = await get(ordersRef);
      
      const userOrders: any[] = [];
      snapshot.forEach((child) => {
        const order = child.val();
        if (order.userId === profile.userId) {
          userOrders.push(order);
        }
      });

      // 依時間新到舊排序
      userOrders.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setOrders(userOrders);
      setShowOrders(true);
    } catch (err) {
      console.error('查詢訂單失敗:', err);
      alert('查詢訂單失敗，請稍後再試');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  return (
    <main style={{ 
      padding: '20px', 
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f5f2ef'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '30px 24px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <img 
            src="https://omg-pos-systems.pages.dev/logo1.png" 
            alt="On My Gelato" 
            style={{ height: '60px', width: 'auto', objectFit: 'contain', borderRadius: '10px' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, textAlign: 'left' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>
              <span style={{ color: '#009246' }}>On</span>
              <span style={{ color: '#4a4a4a' }}>My</span>
              <span style={{ color: '#ce2b37' }}>Gelato</span>
            </span>
            <span style={{ fontSize: '14px', fontWeight: 400, color: '#8a7a6e', letterSpacing: '1px' }}>義式冰淇淋專賣店</span>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#8f8076', marginBottom: '20px' }}>
          {status}
        </p>

        {profile && (
          <div style={{ marginBottom: '20px' }}>
            <img 
              src={profile.pictureUrl} 
              alt="大頭貼" 
              style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #e67e4a' }} 
            />
            <p style={{ fontSize: '16px', marginTop: '8px', color: '#2c241e', fontWeight: 'bold' }}>
              你好，{profile.displayName}！
            </p>
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
              會員 ID: {profile.userId.slice(-6)}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          <a 
            href="/menu/" 
            style={{
              display: 'block',
              background: '#06C755',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: '40px',
              fontSize: '16px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(6, 199, 85, 0.3)'
            }}
          >
            🍦 進入菜單
          </a>

          <button 
            onClick={loadOrders}
            disabled={isLoadingOrders}
            style={{
              display: 'block',
              width: '100%',
              background: '#f0ebe6',
              color: '#2d1f14',
              padding: '14px 20px',
              borderRadius: '40px',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            {isLoadingOrders ? '⏳ 載入中...' : '📋 查詢歷史訂單'}
          </button>

          <a 
            href="https://line.me/R/ti/p/@585fychj"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              background: '#fff',
              color: '#06C755',
              padding: '14px 20px',
              borderRadius: '40px',
              fontSize: '16px',
              fontWeight: '700',
              textDecoration: 'none',
              border: '2px solid #06C755'
            }}
          >
            💚 加入官方好友領優惠
          </a>
        </div>
      </div>

      {/* 歷史訂單彈窗 */}
      {showOrders && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '24px',
            maxWidth: '400px', width: '100%', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', color: '#2c241e', margin: 0 }}>📋 我的歷史訂單</h3>
              <button 
                onClick={() => setShowOrders(false)}
                style={{ background: '#f0ebe6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {orders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>目前沒有歷史訂單</p>
              ) : (
                orders.map((order, idx) => (
                  <div key={idx} style={{
                    background: '#fcf9f6', borderRadius: '12px', padding: '14px 16px',
                    marginBottom: '8px', border: '1px solid #f0e8e0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '16px', color: '#2d1f14' }}>#{order.orderNo}</strong>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#e67e4a' }}>${order.total}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#8a7a6e', marginBottom: '4px' }}>
                      取餐時間：{order.remark || '未指定'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      {order.items.map((i: any) => `${i.name}×${i.qty}`).join('、')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}