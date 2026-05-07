import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

export async function GET(request: NextRequest) {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM store_hours ORDER BY FIELD(dayOfWeek, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")'
      );
      return NextResponse.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching store hours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store hours' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dayOfWeek, openingTime, closingTime, isOpen, userId } = body;

    if (!dayOfWeek || !openingTime || !closingTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE store_hours SET openingTime = ?, closingTime = ?, isOpen = ?, updatedBy = ? WHERE dayOfWeek = ?',
        [openingTime, closingTime, isOpen !== undefined ? isOpen : true, userId, dayOfWeek]
      );

      return NextResponse.json({
        success: true,
        message: `${dayOfWeek} hours updated successfully`,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating store hours:', error);
    return NextResponse.json(
      { error: 'Failed to update store hours' },
      { status: 500 }
    );
  }
}
