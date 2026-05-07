import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sales = await query('SELECT * FROM sales WHERE id = ?', [id]) as any[];

    if (sales.length === 0) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = sales[0];
    // Parse items JSON if it exists
    if (sale.items) {
      try {
        sale.items = JSON.parse(sale.items);
      } catch (e) {
        sale.items = [];
      }
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, authorizations } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Update the sale status and authorizations
    const updateFields = ['status = ?'];
    const updateValues = [status];

    if (authorizations) {
      updateFields.push('authorizations = ?');
      updateValues.push(JSON.stringify(authorizations));
    }

    updateValues.push(id); // Add id at the end for WHERE clause

    await query(`UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    // Fetch and return the updated sale
    const updatedSales = await query('SELECT * FROM sales WHERE id = ?', [id]) as any[];

    if (updatedSales.length === 0) {
      return NextResponse.json({ error: 'Sale not found after update' }, { status: 404 });
    }

    const updatedSale = updatedSales[0];
    // Parse items JSON if it exists
    if (updatedSale.items) {
      try {
        updatedSale.items = JSON.parse(updatedSale.items);
      } catch (e) {
        updatedSale.items = [];
      }
    }

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM sales WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}