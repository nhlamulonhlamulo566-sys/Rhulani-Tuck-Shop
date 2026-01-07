'use client';
import { StockTable } from "@/components/stock/stock-table";
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function StockCountPage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
        router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return null; // or a loading spinner
    }

    return <StockTable />;
}
