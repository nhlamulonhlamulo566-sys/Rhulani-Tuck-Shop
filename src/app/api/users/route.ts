import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const users = await query('SELECT * FROM users');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, workNumber, email, password, role, pin } = body;

    if (!workNumber || !/^[0-9]{8}$/.test(workNumber)) {
      return NextResponse.json({ error: 'Work number must be exactly 8 digits.' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO users (id, firstName, lastName, workNumber, email, password, role, pin, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())',
      [firstName, lastName, workNumber, email || null, password, role, pin || null]
    );

    return NextResponse.json({ success: true, message: 'User created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
