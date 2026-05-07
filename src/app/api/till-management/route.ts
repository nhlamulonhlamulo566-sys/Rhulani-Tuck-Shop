import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const tillSessions = await query(`
      SELECT
        tm.*,
        (
          SELECT COALESCE(SUM(s.total), 0)
          FROM sales s
          WHERE s.userId = tm.userId
            AND s.status = 'Completed'
            AND s.paymentMethod = 'Cash'
            AND s.date BETWEEN tm.openedAt AND COALESCE(tm.closedAt, NOW())
        ) AS computedCashSales
      FROM till_management tm
      ORDER BY tm.openedAt DESC
    `) as any[];

    const sessions = (Array.isArray(tillSessions) ? tillSessions : []).map((session: any) => {
      const openingBalance = Number(session.openingBalance) || 0;
      const computedCashSales = Number(session.computedCashSales || 0);
      const expectedCashValue = session.expectedCash != null ? Number(session.expectedCash) : openingBalance + computedCashSales;
      const closingBalanceValue = session.closingBalance != null ? Number(session.closingBalance) : null;
      const differenceValue = session.difference != null
        ? Number(session.difference)
        : closingBalanceValue != null
          ? closingBalanceValue - expectedCashValue
          : null;

      return {
        id: session.id,
        startDate: session.openedAt,
        openingBalance,
        endDate: session.closedAt,
        closingBalance: closingBalanceValue,
        expectedCash: expectedCashValue,
        countedCash: session.countedCash != null ? Number(session.countedCash) : closingBalanceValue,
        difference: differenceValue,
        status: session.closedAt ? 'Closed' : 'Active',
        userId: session.userId,
        userName: session.userName || '',
      };
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching till management:', error);
    return NextResponse.json({ error: 'Failed to fetch till management' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, openingBalance, startDate, userName, status } = body;

    console.log('📋 Till Session Request:', { userId, openingBalance, startDate, userName, status });

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (openingBalance === undefined || openingBalance === null || isNaN(openingBalance)) {
      return NextResponse.json(
        { error: 'openingBalance must be a valid number' },
        { status: 400 }
      );
    }

    // Verify user exists
    const userExists = await query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: `User with ID ${userId} not found` },
        { status: 404 }
      );
    }

    const sessionId = uuidv4();
    const now = new Date();
    const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const startDateTime = startDate 
      ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ')
      : mysqlDateTime;

    // Validate status - use 'Active' as default
    const finalStatus = (status === 'Active' || status === 'Closed') ? status : 'Active';
    
    console.log('🔧 Processing:', { sessionId, startDateTime, mysqlDateTime, finalStatus, userName, userId, openingBalance });

    await query(
      'INSERT INTO till_management (id, userId, openingBalance, openedAt, userName, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, userId, parseFloat(openingBalance), startDateTime, userName || '', mysqlDateTime]
    );

    const createdSession = {
      id: sessionId,
      startDate: startDateTime,
      openingBalance: openingBalance,
      status: 'Active',
      userId: userId,
      userName: userName || '',
    };

    console.log('✅ Till session created:', createdSession);
    return NextResponse.json(createdSession, { status: 201 });
  } catch (error: any) {
    console.error('Error creating till management:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sql: error.sql,
    });
    return NextResponse.json(
      { error: 'Failed to create till management', details: error.message },
      { status: 500 }
    );
  }
}
