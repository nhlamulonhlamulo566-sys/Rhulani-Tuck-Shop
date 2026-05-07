import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/till-reconciliation - Get all till sessions with reconciliation status
 */

export async function GET(request: NextRequest) {
  try {
    const sessionsResult = await query(
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
        tm.openedAt AS startDate,
        tm.closedAt AS endDate,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod = 'Cash' THEN s.total ELSE 0 END), 0) as totalCashSales,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod = 'Card' THEN s.total ELSE 0 END), 0) as totalCardSales,
        COALESCE(SUM(CASE WHEN s.transactionType = 'withdrawal' THEN s.total ELSE 0 END), 0) as totalWithdrawals,
        COALESCE(SUM(CASE WHEN s.status = 'voided' THEN s.total ELSE 0 END), 0) as totalVoids,
        COALESCE(SUM(CASE WHEN s.status = 'returned' THEN s.total ELSE 0 END), 0) as totalReturns,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod IN ('Cash','Card') THEN s.total ELSE 0 END), 0) as totalSales,
        (tm.openingBalance + COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod IN ('Cash','Card') THEN s.total ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN s.transactionType = 'withdrawal' THEN s.total ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN s.status = 'voided' THEN s.total ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN s.status = 'returned' THEN s.total ELSE 0 END), 0)
        ) as expectedBalance,
        CASE
          WHEN tm.status = 'closed' AND tm.closingBalance IS NOT NULL
          THEN tm.closingBalance - (
            tm.openingBalance + COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.paymentMethod IN ('Cash','Card') THEN s.total ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN s.transactionType = 'withdrawal' THEN s.total ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN s.status = 'voided' THEN s.total ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN s.status = 'returned' THEN s.total ELSE 0 END), 0)
          )
          ELSE NULL
        END as difference
      FROM till_management tm
      LEFT JOIN sales s ON s.userId = tm.userId AND s.date BETWEEN tm.openedAt AND COALESCE(tm.closedAt, NOW())
      GROUP BY tm.id, tm.userId, tm.userName, tm.openingBalance, tm.closingBalance, tm.openedAt, tm.closedAt, tm.status, tm.reconciliationStatus
      ORDER BY tm.openedAt DESC
      LIMIT 100`,
      []
    );

    const sessions = Array.isArray(sessionsResult) ? sessionsResult : [];
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching till reconciliation:', error);
    return NextResponse.json({ error: 'Failed to fetch till reconciliation' }, { status: 500 });
  }
}
