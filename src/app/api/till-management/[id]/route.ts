import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tillRecord = await query(`
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
      WHERE tm.id = ?
    `, [id]) as any[];
    
    if (tillRecord.length === 0) {
      return NextResponse.json({ error: 'Till record not found' }, { status: 404 });
    }

    const session = tillRecord[0];
    const openingBalance = Number(session.openingBalance) || 0;
    const computedCashSales = Number(session.computedCashSales || 0);
    const expectedCashValue = session.expectedCash != null ? Number(session.expectedCash) : openingBalance + computedCashSales;
    const closingBalanceValue = session.closingBalance != null ? Number(session.closingBalance) : null;
    const differenceValue = session.difference != null
      ? Number(session.difference)
      : closingBalanceValue != null
        ? closingBalanceValue - expectedCashValue
        : null;

    return NextResponse.json({
      id: session.id,
      startDate: session.openedAt,
      openingBalance,
      endDate: session.closedAt,
      closingBalance: closingBalanceValue,
      expectedCash: expectedCashValue,
      countedCash: session.countedCash != null ? Number(session.countedCash) : closingBalanceValue,
      difference: differenceValue,
      status: session.status || (session.closedAt ? 'Closed' : 'Active'),
      userId: session.userId,
      userName: session.userName || '',
      closedBy: session.closedBy,
    });
  } catch (error) {
    console.error('Error fetching till record:', error);
    return NextResponse.json({ error: 'Failed to fetch till record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { closingBalance, endDate, closedAt, expectedCash, countedCash, difference, status, closedBy } = body;

    // Convert closedAt/endDate to MySQL datetime format if provided
    const mysqlClosedAt = (closedAt || endDate)
      ? new Date(closedAt || endDate).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Update the till session with closing information
    await query(
      `UPDATE till_management
       SET closingBalance = ?, closedAt = ?, expectedCash = ?, countedCash = ?, difference = ?, status = ?, closedBy = ?
       WHERE id = ?`,
      [
        closingBalance != null ? closingBalance : 0,
        mysqlClosedAt,
        expectedCash != null ? expectedCash : null,
        countedCash != null ? countedCash : null,
        difference != null ? difference : null,
        status || 'Closed',
        closedBy != null ? closedBy : null,
        id,
      ]
    );

    // Return the updated session
    const updatedSession = await query('SELECT * FROM till_management WHERE id = ?', [id]) as any[];

    if (updatedSession.length === 0) {
      return NextResponse.json({ error: 'Till record not found' }, { status: 404 });
    }

    // Map database fields to type fields
    const session = {
      id: updatedSession[0].id,
      startDate: updatedSession[0].openedAt,
      openingBalance: Number(updatedSession[0].openingBalance) || 0,
      endDate: updatedSession[0].closedAt,
      closingBalance: updatedSession[0].closingBalance ? Number(updatedSession[0].closingBalance) : 0,
      expectedCash: updatedSession[0].expectedCash != null ? Number(updatedSession[0].expectedCash) : null,
      countedCash: updatedSession[0].countedCash != null ? Number(updatedSession[0].countedCash) : null,
      difference: updatedSession[0].difference != null ? Number(updatedSession[0].difference) : null,
      status: updatedSession[0].status || 'Closed',
      userId: updatedSession[0].userId,
      userName: updatedSession[0].userName || '',
      closedBy: updatedSession[0].closedBy,
    };

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating till record:', error);
    return NextResponse.json({ error: 'Failed to update till record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM till_management WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Till record deleted' });
  } catch (error) {
    console.error('Error deleting till record:', error);
    return NextResponse.json({ error: 'Failed to delete till record' }, { status: 500 });
  }
}
