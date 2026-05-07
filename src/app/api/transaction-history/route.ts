import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/transaction-history - Get all transactions with filters
 * Query params:
 *   - tillSessionId: Filter by till session
 *   - transactionType: Filter by transaction type (sale, withdrawal, void, return)
 *   - startDate: Filter by start date
 *   - endDate: Filter by end date
 *   - salespersonId: Filter by salesperson
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tillSessionId = searchParams.get('tillSessionId');
    const transactionType = searchParams.get('transactionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const salespersonId = searchParams.get('salespersonId');

    let whereConditions: string[] = [];
    let params: any[] = [];

    const formatMySqlDateTime = (value: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    };

    const parseDateInput = (value: string) => {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    if (tillSessionId) {
      // Join with till sessions to filter by till
      whereConditions.push('tm.id = ?');
      params.push(tillSessionId);
    }

    if (transactionType) {
      whereConditions.push('sal.transactionType = ?');
      params.push(transactionType);
    }

    if (startDate) {
      whereConditions.push('sal.date >= ?');
      params.push(formatMySqlDateTime(parseDateInput(startDate)));
    }

    if (endDate) {
      whereConditions.push('sal.date <= ?');
      params.push(formatMySqlDateTime(parseDateInput(endDate)));
    }

    if (salespersonId) {
      whereConditions.push('sal.userId = ?');
      params.push(salespersonId);
    }

    const whereClause =
      whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const transactionsResult = await query(
      `SELECT 
        sal.id,
        sal.date,
        sal.total,
        sal.customerName,
        sal.salesperson,
        sal.transactionType,
        sal.status,
        sal.paymentMethod,
        sal.withdrawalReason,
        sal.userId,
        tm.id as tillSessionId,
        tm.userName,
        (SELECT COUNT(*) FROM sales_items WHERE saleId = sal.id) as itemCount
      FROM sales sal
      LEFT JOIN till_management tm ON sal.userId = tm.userId 
        AND sal.date >= tm.openedAt 
        AND sal.date <= COALESCE(tm.closedAt, NOW())
      ${whereClause}
      ORDER BY sal.date DESC
      LIMIT 500`,
      params
    );
    
    const transactions = Array.isArray(transactionsResult) ? transactionsResult : [];
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
