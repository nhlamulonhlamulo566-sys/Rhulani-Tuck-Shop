import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

// GET all card machines
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const connection = await pool.getConnection();

    try {
      if (action === 'health') {
        // Get health status for all machines - get latest health record per machine
        const [healthRows] = await connection.execute(`
          SELECT
            cm.id,
            cm.deviceName,
            cm.serialNumber,
            cm.deviceType,
            cm.isActive,
            COALESCE(ch.connectionStatus, 'Disconnected') as connectionStatus,
            COALESCE(ch.signalStrength, 0) as signalStrength,
            ch.lastHeartbeat,
            ch.errorMessage,
            ch.createdAt as lastCheck
          FROM card_machine_config cm
          LEFT JOIN (
            SELECT * FROM card_machine_health
            WHERE id IN (
              SELECT MAX(id) FROM card_machine_health
              GROUP BY machineId
            )
          ) ch ON cm.id = ch.machineId
          ORDER BY cm.deviceName
        `) as any[];

        return NextResponse.json(healthRows);
      } else if (action === 'gateways') {
        // Get all merchant gateways
        const [gatewayRows] = await connection.execute(`
          SELECT 
            id,
            merchantName,
            merchantId,
            CONCAT('••••••') as apiKey,
            CONCAT('••••••') as apiSecret,
            gatewayType,
            testMode,
            isActive,
            contactEmail,
            contactPhone,
            supportContact,
            createdAt,
            updatedAt
          FROM merchant_gateway_config
          ORDER BY merchantName
        `) as any[];

        return NextResponse.json(gatewayRows);
      } else if (action === 'transactions') {
        // Get recent transactions
        const limitStr = searchParams.get('limit') || '20';
        const limit = Math.min(Math.max(parseInt(limitStr), 1), 100); // Min 1, Max 100
        
        const [transactionRows] = await connection.execute(`
          SELECT
            ctl.*,
            cmc.deviceName,
            mgc.merchantName
          FROM card_transactions_log ctl
          LEFT JOIN card_machine_config cmc ON ctl.machineId = cmc.id
          LEFT JOIN merchant_gateway_config mgc ON ctl.merchantId = mgc.id
          ORDER BY ctl.createdAt DESC
          LIMIT ${limit}
        `) as any[];

        return NextResponse.json(transactionRows);
      } else {
        // Get all card machines
        const [machineRows] = await connection.execute(`
          SELECT * FROM card_machine_config
          ORDER BY deviceName
        `) as any[];

        return NextResponse.json(machineRows);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Card machine GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card machine data' },
      { status: 500 }
    );
  }
}

// POST - Create new card machine or gateway
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    const connection = await pool.getConnection();

    try {
      if (type === 'machine') {
        // Create new card machine
        const id = uuidv4();
        const query = `
          INSERT INTO card_machine_config (
            id, deviceName, serialNumber, deviceType, port, baudRate,
            ipAddress, port_number, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(query, [
          id,
          data.deviceName,
          data.serialNumber,
          data.deviceType,
          data.port,
          data.baudRate || 9600,
          data.ipAddress || null,
          data.port_number || null,
          data.isActive !== false
        ]);

        return NextResponse.json({
          success: true,
          id,
          message: 'Card machine created successfully'
        });
      } else if (type === 'gateway') {
        // Create new merchant gateway
        const id = uuidv4();
        const query = `
          INSERT INTO merchant_gateway_config (
            id, merchantName, merchantId, apiKey, apiSecret, gatewayType,
            testMode, isActive, contactEmail, contactPhone, supportContact
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(query, [
          id,
          data.merchantName,
          data.merchantId,
          data.apiKey,
          data.apiSecret,
          data.gatewayType,
          data.testMode !== false,
          data.isActive !== false,
          data.contactEmail || null,
          data.contactPhone || null,
          data.supportContact || null
        ]);

        return NextResponse.json({
          success: true,
          id,
          message: 'Merchant gateway created successfully'
        });
      } else if (type === 'test-connection') {
        // Test connection to card machine
        const { machineId } = data;

        // Simulate connection test (in real implementation, this would connect to actual device)
        const isConnected = Math.random() > 0.3; // 70% success rate for demo

        const healthId = uuidv4();
        const query = `
          INSERT INTO card_machine_health (
            id, machineId, connectionStatus, signalStrength, lastHeartbeat, errorMessage
          ) VALUES (?, ?, ?, ?, NOW(), ?)
        `;

        await connection.execute(query, [
          healthId,
          machineId,
          isConnected ? 'Connected' : 'Disconnected',
          isConnected ? Math.floor(Math.random() * 100) : 0,
          isConnected ? null : 'Connection timeout or device not responding'
        ]);

        return NextResponse.json({
          success: true,
          connected: isConnected,
          message: isConnected ? 'Connection successful' : 'Connection failed'
        });
      }

      return NextResponse.json(
        { error: 'Invalid type specified' },
        { status: 400 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Card machine POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create card machine configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update card machine or gateway
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, ...data } = body;

    const connection = await pool.getConnection();

    try {
      if (type === 'machine') {
        // Update card machine
        const query = `
          UPDATE card_machine_config SET
            deviceName = ?, serialNumber = ?, deviceType = ?, port = ?,
            baudRate = ?, ipAddress = ?, port_number = ?, isActive = ?
          WHERE id = ?
        `;

        await connection.execute(query, [
          data.deviceName,
          data.serialNumber,
          data.deviceType,
          data.port,
          data.baudRate || 9600,
          data.ipAddress || null,
          data.port_number || null,
          data.isActive !== false,
          id
        ]);

        return NextResponse.json({
          success: true,
          message: 'Card machine updated successfully'
        });
      } else if (type === 'gateway') {
        // Update merchant gateway
        const query = `
          UPDATE merchant_gateway_config SET
            merchantName = ?, merchantId = ?, apiKey = ?, apiSecret = ?,
            gatewayType = ?, testMode = ?, isActive = ?, contactEmail = ?,
            contactPhone = ?, supportContact = ?
          WHERE id = ?
        `;

        await connection.execute(query, [
          data.merchantName,
          data.merchantId,
          data.apiKey,
          data.apiSecret,
          data.gatewayType,
          data.testMode !== false,
          data.isActive !== false,
          data.contactEmail || null,
          data.contactPhone || null,
          data.supportContact || null,
          id
        ]);

        return NextResponse.json({
          success: true,
          message: 'Merchant gateway updated successfully'
        });
      }

      return NextResponse.json(
        { error: 'Invalid type specified' },
        { status: 400 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Card machine PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// DELETE - Remove card machine or gateway
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      if (type === 'machine') {
        // Delete card machine (cascade will handle related records)
        await connection.execute('DELETE FROM card_machine_config WHERE id = ?', [id]);
        return NextResponse.json({
          success: true,
          message: 'Card machine deleted successfully'
        });
      } else if (type === 'gateway') {
        // Delete merchant gateway
        await connection.execute('DELETE FROM merchant_gateway_config WHERE id = ?', [id]);
        return NextResponse.json({
          success: true,
          message: 'Merchant gateway deleted successfully'
        });
      }

      return NextResponse.json(
        { error: 'Invalid type specified' },
        { status: 400 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Card machine DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
