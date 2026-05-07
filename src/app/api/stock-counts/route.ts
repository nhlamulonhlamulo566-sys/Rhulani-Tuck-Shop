import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const stockCountsResult = await query('SELECT * FROM stock_counts ORDER BY countDate DESC');
    const stockCounts = Array.isArray(stockCountsResult) ? stockCountsResult : [];
    return NextResponse.json(stockCounts);
  } catch (error) {
    console.error('Error fetching stock counts:', error);
    return NextResponse.json({ error: 'Failed to fetch stock counts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, countedQuantity, systemQuantity, countDate } = body;

    const variance = countedQuantity - systemQuantity;

    await query(
      'INSERT INTO stock_counts (id, productId, countedQuantity, systemQuantity, variance, countDate) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [productId, countedQuantity, systemQuantity, variance, countDate]
    );

    return NextResponse.json({ success: true, message: 'Stock count created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating stock count:', error);
    return NextResponse.json({ error: 'Failed to create stock count' }, { status: 500 });
  }
}
