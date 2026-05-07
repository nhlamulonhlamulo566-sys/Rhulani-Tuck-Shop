import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await query('SELECT * FROM products WHERE id = ?', [id]) as any[];
    
    if (product.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, price, stock, lowStockThreshold, description, imageUrl, imageHint, barcode, barcodePack, packSize, barcodeCase, caseSize } = body;

    await query(
      'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, lowStockThreshold = ?, description = ?, imageUrl = ?, imageHint = ?, barcode = ?, barcodePack = ?, packSize = ?, barcodeCase = ?, caseSize = ? WHERE id = ?',
      [
        name,
        category,
        price,
        stock,
        lowStockThreshold,
        description || null,
        imageUrl || null,
        imageHint || null,
        barcode || null,
        barcodePack || null,
        packSize || null,
        barcodeCase || null,
        caseSize || null,
        id,
      ]
    );

    return NextResponse.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query('DELETE FROM products WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
