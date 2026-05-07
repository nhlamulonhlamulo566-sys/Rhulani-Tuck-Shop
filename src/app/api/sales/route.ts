import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Sales API endpoint - handles sale creation and retrieval
export async function GET(request: NextRequest) {
  try {
    const sales = await query('SELECT * FROM sales ORDER BY date DESC');
    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Sales POST API called');
    const body = await request.json();
    console.log('Request body:', body);
    const {
      date,
      total,
      customerName,
      userId,
      paymentMethod,
      subtotal,
      tax,
      amountPaid,
      change,
      salesperson,
      status,
      transactionType,
      withdrawalReason,
      cardTransactionId,
      items
    } = body;

    const parseDateInput = (input: any) => {
      const parsed = input ? new Date(input) : new Date();
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const formatMySqlDateTime = (dateValue: Date) => {
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}:${pad(dateValue.getSeconds())}`;
    };

    const saleDate = parseDateInput(date);
    const mysqlDate = formatMySqlDateTime(saleDate);
    console.log('Converted date:', mysqlDate);

    // Generate a UUID for the sale
    const saleId = crypto.randomUUID();
    console.log('Generated saleId:', saleId);

    // Get user name from users table
    console.log('Looking up user:', userId);
    const users = await query('SELECT CONCAT(firstName, " ", lastName) as userName FROM users WHERE id = ?', [userId]) as any[];
    console.log('User lookup result:', { userId, users: users.length, userName: users.length > 0 ? users[0].userName : 'not found' });
    const userName = users.length > 0 ? users[0].userName : 'Unknown';

    console.log('Inserting sale with values:', [
      saleId,
      mysqlDate,
      total,
      customerName || null,
      userId,
      paymentMethod || 'Cash',
      salesperson,
      status
    ]);

    // Basic INSERT with columns that exist in the database
    const result = await query(
      `INSERT INTO sales (
        id, date, total, customerName, userId, paymentMethod, salesperson, status, userName, items
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        saleId,
        mysqlDate,
        total,
        customerName || null,
        userId,
        paymentMethod || 'Cash',
        salesperson,
        status,
        userName,
        items ? JSON.stringify(items) : '[]'
      ]
    );
    console.log('Insert result:', result);

    // Try to update additional columns if they exist and have values
    try {
      const updateFields = [];
      const updateValues = [];

      if (transactionType) {
        updateFields.push('transactionType = ?');
        updateValues.push(transactionType);
      }
      if (withdrawalReason !== undefined) {
        updateFields.push('withdrawalReason = ?');
        updateValues.push(withdrawalReason);
      }
      if (cardTransactionId !== undefined) {
        updateFields.push('cardTransactionId = ?');
        updateValues.push(cardTransactionId);
      }
      if (subtotal !== undefined) {
        updateFields.push('subtotal = ?');
        updateValues.push(subtotal);
      }
      if (tax !== undefined) {
        updateFields.push('tax = ?');
        updateValues.push(tax);
      }
      if (amountPaid !== undefined) {
        updateFields.push('amountPaid = ?');
        updateValues.push(amountPaid);
      }
      if (change !== undefined) {
        updateFields.push('change = ?');
        updateValues.push(change);
      }

      if (updateFields.length > 0) {
        updateValues.push(saleId);
        await query(`UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
      }
    } catch (updateError) {
      // Ignore errors if additional columns don't exist
      console.warn('Warning: Could not update additional sale columns:', updateError instanceof Error ? updateError.message : String(updateError));
    }

    // If items are provided, insert them into sale_items table
    if (items && items.length > 0) {
      console.log('Inserting', items.length, 'sale items');
      for (const item of items) {
        console.log('Inserting item:', item);
        await query(
          `INSERT INTO sale_items (
            id, saleId, productId, name, quantity, price, returnedQuantity
          ) VALUES (
            UUID(), ?, ?, ?, ?, ?, ?
          )`,
          [saleId, item.productId, item.name, item.quantity, item.price, item.returnedQuantity || 0]
        );
      }
    }

    // Fetch the created sale to return it
    const createdSales = await query('SELECT * FROM sales WHERE id = ?', [saleId]) as any[];
    const createdSale = createdSales[0];

    return NextResponse.json(createdSale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error stack:', errorStack);
    return NextResponse.json({ error: 'Failed to create sale', details: errorMessage }, { status: 500 });
  }
}
