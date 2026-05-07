import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const logs = await query('SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 1000');
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, details } = body;

    await query(
      'INSERT INTO audit_logs (id, userId, action, details) VALUES (UUID(), ?, ?, ?)',
      [userId || null, action, details || null]
    );

    return NextResponse.json({ success: true, message: 'Log recorded' }, { status: 201 });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
