import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workNumber, password } = body;

    if (!/^[0-9]{8}$/.test(workNumber)) {
      return NextResponse.json({ error: 'Invalid work number format' }, { status: 400 });
    }

    const users = (await query('SELECT * FROM users WHERE workNumber = ? AND password = ?', [
      workNumber,
      password,
    ])) as any[];

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid work number or password' }, { status: 401 });
    }

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
