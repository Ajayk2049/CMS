'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role) {
      router.push('/login');
    } else {
      if (role === 'merchant') {
        router.push('/merchant');
      } else if (role === 'advertiser') {
        router.push('/advertiser');
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-medium text-sm">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <p className="text-slate-400">Loading your space...</p>
      </div>
    </div>
  );
}
