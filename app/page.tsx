'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import liff from '@line/liff';

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl: string;
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('正在初始化 LIFF...');

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: '2011536222-v4OvTSup' });
        
        if (!liff.isLoggedIn()) {
          setStatus('尚未登入，跳轉中...');
          liff.login();
        } else {
          setStatus('已登入，載入資料中...');
          const p = await liff.getProfile();
          setProfile({
            userId: p.userId,
            displayName: p.displayName,
            pictureUrl: p.pictureUrl ?? '',
          });
          setStatus('🎉 歡迎！');
        }
      } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        setStatus('❌ 錯誤：' + errorMessage);
      }
    };
    initLiff();
  }, []);

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
        <Image
          src="https://omg-gelato79.pages.dev/logo1.png"
          alt="OMG! Gelato Channel icon"
          width={80}
          height={80}
          style={{
            objectFit: 'contain',
            marginBottom: '10px',
          }}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 style={{ fontSize: '24px', color: '#2c241e', marginBottom: '8px' }}>
          OMG! Gelato
        </h1>
        <p style={{ fontSize: '14px', color: '#8f8076', marginBottom: '20px' }}>
          {status}
        </p>

        {profile && (
          <div style={{ marginBottom: '20px' }}>
            <Image
              src={profile.pictureUrl}
              alt="大頭貼" 
              width={64}
              height={64}
              style={{ borderRadius: '50%' }}
            />
            <p style={{ fontSize: '16px', marginTop: '8px', color: '#2c241e' }}>
              你好，<strong>{profile.displayName}</strong>！
            </p>
          </div>
        )}
        <a 
          href="/menu/index.html" 
          style={{
            display: 'inline-block',
            background: '#06C755',
            color: '#fff',
            padding: '14px 40px',
            borderRadius: '40px',
            fontSize: '16px',
            fontWeight: '700',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(6, 199, 85, 0.3)'
          }}
        >
          🍦 進入菜單
        </a>
      </div>
    </main>
  );
}