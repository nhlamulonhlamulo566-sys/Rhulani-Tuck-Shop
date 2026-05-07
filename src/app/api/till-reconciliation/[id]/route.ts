import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/till-reconciliation/[id] - Get detailed till session with reconciliation data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get detailed session data with sales, withdrawals, voids, returns
    const sessionResult = await query(
      `SELECT
        tm.id,
        tm.userId,
        tm.userName,
        tm.openingBalance,
        tm.closingBalance,
        tm.openedAt,
        tm.closedAt,
        tm.status,
        tm.reconciliationStatus,
        tm.reconciliationApprovedBy,
        tm.reconciliationApprovedAt,
        tm.reconciliationNotes,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod = 'Cash' THEN s.total ELSE 0 END), 0) as totalCashSales,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod = 'Card' THEN s.total ELSE 0 END), 0) as totalCardSales,
        COALESCE(SUM(CASE WHEN s.status = 'voided' THEN s.total ELSE 0 END), 0) as totalVoids,
        COALESCE(SUM(CASE WHEN s.status = 'returned' THEN s.total ELSE 0 END), 0) as totalReturns,
        COALESCE(SUM(CASE WHEN s.transactionType = 'withdrawal' THEN s.total ELSE 0 END), 0) as totalWithdrawals
      FROM till_management tm
      LEFT JOIN sales s ON s.userId = tm.userId
        AND s.date >= tm.openedAt
        AND (s.date <= tm.closedAt OR tm.closedAt IS NULL)
      WHERE tm.id = ?
      GROUP BY tm.id`,
      [id]
    );

    if (!sessionResult || (Array.isArray(sessionResult) && sessionResult.length === 0)) {
      return NextResponse.json({ error: 'Till session not found' }, { status: 404 });
    }

    const session = Array.isArray(sessionResult) ? sessionResult[0] as any : sessionResult as any;

    // Calculate expected balance
    const openingBalance = Number(session.openingBalance || 0);
    const totalCashSales = Number(session.totalCashSales || 0);
    const totalWithdrawals = Number(session.totalWithdrawals || 0);
    const totalVoids = Number(session.totalVoids || 0);
    const totalReturns = Number(session.totalReturns || 0);
    const expectedBalance = openingBalance + totalCashSales - totalWithdrawals - totalVoids - totalReturns;

    // Get actual closing balance
    const actualBalance = Number(session.closingBalance || 0);
    const difference = actualBalance - expectedBalance;

    const detailedSession = {
      ...session,
      startDate: session.openedAt,
      endDate: session.closedAt,
      totalSales: totalCashSales + Number(session.totalCardSales || 0),
      totalCashSales,
      totalCardSales: Number(session.totalCardSales || 0),
      totalWithdrawals,
      totalVoids,
      totalReturns,
      expectedBalance,
      actualBalance,
      difference,
      reconciliationStatus: session.reconciliationStatus || 'pending'
    };

    return NextResponse.json(detailedSession);
  } catch (error) {
    console.error('Error fetching till session details:', error);
    return NextResponse.json({ error: 'Failed to fetch till session details' }, { status: 500 });
  }
}

/**
 * PUT /api/till-reconciliation/[id] - Update reconciliation status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reconciliationStatus, reconciliationNotes, reconciliationApprovedBy } = body;

    const updateResult = await query(
      `UPDATE till_management
       SET reconciliationStatus = ?,
           reconciliationNotes = ?,
           reconciliationApprovedBy = ?,
           reconciliationApprovedAt = NOW()
       WHERE id = ?`,
      [reconciliationStatus, reconciliationNotes, reconciliationApprovedBy, id]
    );

    if (!updateResult || (Array.isArray(updateResult) && (updateResult as any).affectedRows === 0)) {
      return NextResponse.json({ error: 'Failed to update reconciliation status' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reconciliation status:', error);
    return NextResponse.json({ error: 'Failed to update reconciliation status' }, { status: 500 });
  }
}