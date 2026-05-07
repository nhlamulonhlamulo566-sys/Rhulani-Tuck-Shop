import { query } from '@/lib/db';
import mysql from 'mysql2/promise';
import { NextRequest, NextResponse } from 'next/server';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

// Helper function to check if current time is within store hours
async function isWithinStoreHours(connection: any): Promise<boolean> {
  try {
    const now = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

    const [rows]: any = await connection.execute(
      'SELECT isOpen, openingTime, closingTime FROM store_hours WHERE dayOfWeek = ?',
      [dayOfWeek]
    );

    if (!rows || rows.length === 0) return false;

    const storeHour = rows[0];
    if (!storeHour.isOpen) return false;

    const [openingHour, openingMinute] = storeHour.openingTime.split(':').map(Number);
    const [closingHour, closingMinute] = storeHour.closingTime.split(':').map(Number);

    const openingDate = new Date(now);
    openingDate.setHours(openingHour, openingMinute, 0, 0);

    const closingDate = new Date(now);
    closingDate.setHours(closingHour, closingMinute, 0, 0);

    // If the store closes after midnight, roll closing time to the next day.
    if (closingDate <= openingDate) {
      closingDate.setDate(closingDate.getDate() + 1);
    }

    return now >= openingDate && now <= closingDate;
  } catch (error) {
    console.warn('Error checking store hours:', error);
    // If we can't check store hours, allow PIN (fail open for business continuity)
    return true;
  }
}

/**
 * POST /api/auth/verify-pin
 * Verify a 6-digit PIN for admin authorization
 * 
 * Request body:
 * {
 *   pin: string (6-digit numeric PIN),
 *   action?: string (optional - for audit logging)
 * }
 * 
 * Response:
 * {
 *   user: { id, firstName, lastName, workNumber, email, role, fullName },
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { pin, action } = body;

    // Validate input
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 }
      );
    }

    // Check if current time is within store hours
    const isOpen = await isWithinStoreHours(connection);
    if (!isOpen) {
      return NextResponse.json(
        { error: 'PIN is only valid during store opening hours' },
        { status: 403 }
      );
    }

    // Query for admin user with matching PIN
    const users = await query(
      `SELECT id, firstName, lastName, workNumber, email, role, pin_expires_at FROM users 
       WHERE pin = ? AND role IN ('Administration', 'Super Administration')`,
      [pin]
    ) as any[];

    if (!users || users.length === 0) {
      // Log failed attempt for security audit
      const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
      console.warn(`[SECURITY] Failed PIN verification attempt from ${clientIp} at ${new Date().toISOString()}`);
      
      return NextResponse.json(
        { error: 'Invalid PIN or user is not an administrator.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check if PIN has expired
    if (user.pin_expires_at) {
      const expiresAt = new Date(user.pin_expires_at);
      if (new Date() > expiresAt) {
        return NextResponse.json(
          { error: 'PIN has expired. Please generate a new one.' },
          { status: 401 }
        );
      }
    }

    const fullName = `${user.firstName} ${user.lastName}`;

    // Log successful PIN verification for audit trail if action specified
    if (action) {
      try {
        await query(
          `INSERT INTO audit_logs 
           (id, action, adminId, adminName, timestamp, ipAddress, details)
           VALUES (UUID(), ?, ?, ?, NOW(), ?, ?)`,
          [
            `pin_verified_${action}`,
            user.id,
            fullName,
            request.headers.get('x-forwarded-for') || 'unknown',
            JSON.stringify({ action, timestamp: new Date().toISOString() })
          ]
        ).catch(err => console.warn('Audit log failed (non-critical):', err));
      } catch (auditError) {
        console.warn('Failed to log PIN verification:', auditError);
        // Don't fail the request if audit logging fails
      }
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        workNumber: user.workNumber,
        email: user.email,
        role: user.role,
        fullName
      },
      message: `PIN verified for ${fullName}`
    });
  } catch (error) {
    console.error('Error during PIN verification:', error);
    return NextResponse.json(
      { error: 'PIN verification failed' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

/**
 * GET /api/auth/verify-pin/status
 * Health check for PIN verification service
 */
export async function GET(request: NextRequest) {
  try {
    await query('SELECT 1');
    
    return NextResponse.json({
      status: 'active',
      message: 'PIN verification service is operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PIN verification service check failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Service unavailable' },
      { status: 503 }
    );
  }
}
