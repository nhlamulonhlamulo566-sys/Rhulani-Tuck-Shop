import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/daily-reports - Get daily sales summaries
 * Query params:
 *   - date: Specific date (YYYY-MM-DD) - if not provided, returns last 30 days
 *   - startDate: Start date range (YYYY-MM-DD)
 *   - endDate: End date range (YYYY-MM-DD)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let params: any[] = [];

    const formatMySqlDateTime = (value: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    };

    const parseDateInput = (value: string) => {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    if (date) {
      const dateStart = parseDateInput(date);
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);
      params = [formatMySqlDateTime(dateStart), formatMySqlDateTime(dateEnd)];
    } else if (startDate && endDate) {
      const start = parseDateInput(startDate);
      const end = new Date(parseDateInput(endDate));
      end.setDate(end.getDate() + 1);
      params = [formatMySqlDateTime(start), formatMySqlDateTime(end)];
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      params = [formatMySqlDateTime(thirtyDaysAgo)];
    }

    const dailyReportsResult = await query(
      `SELECT 
        DATE(sal.date) as reportDate,
        COUNT(CASE WHEN sal.transactionType = 'sale' THEN 1 END) as saleCount,
        COUNT(CASE WHEN sal.transactionType = 'withdrawal' THEN 1 END) as withdrawalCount,
        COUNT(CASE WHEN sal.transactionType = 'void' THEN 1 END) as voidCount,
        COUNT(CASE WHEN sal.transactionType = 'return' THEN 1 END) as returnCount,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' THEN sal.total ELSE 0 END), 0) as totalSales,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'withdrawal' THEN sal.total ELSE 0 END), 0) as totalWithdrawals,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'void' THEN sal.total ELSE 0 END), 0) as totalVoids,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'return' THEN sal.total ELSE 0 END), 0) as totalReturns,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' AND sal.paymentMethod = 'Cash' THEN sal.total ELSE 0 END), 0) as cashSales,
        COALESCE(SUM(CASE WHEN sal.transactionType = 'sale' AND sal.paymentMethod = 'Card' THEN sal.total ELSE 0 END), 0) as cardSales,
        COUNT(DISTINCT sal.userId) as uniqueSalespersons
      FROM sales sal
      WHERE sal.date >= ?
        AND sal.status IN ('Completed', 'Voided', 'Returned')
      GROUP BY DATE(sal.date)
      ORDER BY reportDate DESC`,
      params
    );

    const dailyReports = Array.isArray(dailyReportsResult) ? dailyReportsResult : [];
    return NextResponse.json(dailyReports);
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily reports' },
      { status: 500 }
    );
  }
}
