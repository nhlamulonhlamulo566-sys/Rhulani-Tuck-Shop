'use client';
import { SalesTable } from "@/components/sales/sales-table";
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SalesPage() {
    const { user, loading } = useUser();
    const router = useRouter();
  
    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);
  
    if (loading || !user) {
      return null;
    }
    return <SalesTable />;
}
