import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

// Generate a random 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get PIN expiry time (end of business day)
async function getPinExpiryTime(connection: any): Promise<Date> {
  try {
    const now = new Date();
    const dayOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ][now.getDay()];

    const [rows] = await connection.execute(
      'SELECT closingTime FROM store_hours WHERE dayOfWeek = ?',
      [dayOfWeek]
    ) as any[];

    if (rows.length === 0) {
      // Default to 24 hours from now if store hours not found
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      return expiresAt;
    }

    const closingTime = rows[0].closingTime; // Format: HH:mm:ss
    const [hours, minutes] = closingTime.split(':').map(Number);

    const expiresAt = new Date();
    expiresAt.setHours(hours, minutes, 0, 0);

    // If closing time has already passed today, set for tomorrow
    if (expiresAt < now) {
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

    return expiresAt;
  } catch (error) {
    console.error('Error getting PIN expiry time:', error);
    // Default to 24 hours from now on error
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    return expiresAt;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // Generate new PIN
      const newPin = generatePin();
      
      // PIN expires at end of business day (closing time)
      const expiresAt = await getPinExpiryTime(connection);

      // Update user PIN and expiry
      const query = `
        UPDATE users 
        SET pin = ?, pin_expires_at = ? 
        WHERE id = ?
      `;

      await connection.execute(query, [newPin, expiresAt, userId]);

      // Fetch updated user to return current PIN info
      const userQuery = `
        SELECT id, firstName, lastName, pin, pin_expires_at 
        FROM users 
        WHERE id = ?
      `;

      const [rows] = await connection.execute(userQuery, [userId]) as any[];
      const user = rows[0];

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        pin: user.pin,
        expiresAt: user.pin_expires_at,
        message: 'New PIN generated successfully',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Generate PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PIN' },
      { status: 500 }
    );
  }
}

// GET current PIN info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      const query = `
        SELECT 
          id, 
          firstName, 
          lastName, 
          pin, 
          pin_expires_at,
          CASE 
            WHEN pin_expires_at IS NULL THEN 'no_pin'
            WHEN pin_expires_at < NOW() THEN 'expired'
            ELSE 'active'
          END as pin_status,
          TIMESTAMPDIFF(HOUR, NOW(), pin_expires_at) as hours_remaining
        FROM users 
        WHERE id = ?
      `;

      const [rows] = await connection.execute(query, [userId]) as any[];
      const user = rows[0];

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        pin: user.pin,
        expiresAt: user.pin_expires_at,
        status: user.pin_status,
        hoursRemaining: user.hours_remaining || 0,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Fetch PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PIN info' },
      { status: 500 }
    );
  }
}
