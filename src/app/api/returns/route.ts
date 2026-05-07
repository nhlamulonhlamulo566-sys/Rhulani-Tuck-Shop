import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const returns = await query('SELECT * FROM returns ORDER BY date DESC');
    return NextResponse.json(returns);
  } catch (error) {
    console.error('Error fetching returns:', error);
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { saleId, date, reason, status } = body;

    await query(
      'INSERT INTO returns (id, saleId, date, reason, status) VALUES (UUID(), ?, ?, ?, ?)',
      [saleId, date, reason, status]
    );

    return NextResponse.json({ success: true, message: 'Return created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating return:', error);
    return NextResponse.json({ error: 'Failed to create return' }, { status: 500 });
  }
}
