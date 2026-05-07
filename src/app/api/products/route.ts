import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const products = await query('SELECT * FROM products');
    // Convert numeric strings to numbers and provide fallback images
    const formattedProducts = (Array.isArray(products) ? products : []).map((product: any) => ({
      ...product,
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      lowStockThreshold: Number(product.lowStockThreshold) || 5,
      imageUrl: (product.imageUrl && product.imageUrl.trim()) ? product.imageUrl : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop&q=80`,
    }));
    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, price, stock, lowStockThreshold, description, imageUrl, imageHint, barcode, barcodePack, packSize, barcodeCase, caseSize } = body;

    // Generate a default image URL if not provided (using unsplash with category as seed)
    const finalImageUrl = imageUrl && imageUrl.trim() 
      ? imageUrl 
      : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop&q=80`;

    await query(
      'INSERT INTO products (id, name, category, price, stock, lowStockThreshold, description, imageUrl, imageHint, barcode, barcodePack, packSize, barcodeCase, caseSize) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name, 
        category, 
        price, 
        stock, 
        lowStockThreshold || 5,  // Default to 5 if not provided
        description || null, 
        finalImageUrl,  // Use generated URL
        imageHint || null, 
        barcode || null, 
        barcodePack || null, 
        packSize || null, 
        barcodeCase || null, 
        caseSize || null
      ]
    );

    return NextResponse.json({ success: true, message: 'Product created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
