import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await query('SELECT * FROM users WHERE id = ?', [id]) as any[];
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, workNumber, email, password, role, pin } = body;

    if (!workNumber || !/^[0-9]{8}$/.test(workNumber)) {
      return NextResponse.json({ error: 'Work number must be exactly 8 digits.' }, { status: 400 });
    }

    if (password) {
      await query(
        'UPDATE users SET firstName = ?, lastName = ?, workNumber = ?, email = ?, password = ?, role = ?, pin = ? WHERE id = ?',
        [firstName, lastName, workNumber, email || null, password, role, pin || null, id]
      );
    } else {
      await query(
        'UPDATE users SET firstName = ?, lastName = ?, workNumber = ?, email = ?, role = ?, pin = ? WHERE id = ?',
        [firstName, lastName, workNumber, email || null, role, pin || null, id]
      );
    }

    return NextResponse.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { requesterId } = body;

    // Fetch the user to be deleted
    const userToDelete = await query('SELECT * FROM users WHERE id = ?', [id]) as any[];
    if (userToDelete.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userToDelete[0];

    // Count total super admins
    const superAdmins = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['Super Administration']
    ) as any[];

    // Protect the last super admin from deletion
    if (user.role === 'Super Administration' && superAdmins[0].count <= 1) {
      return NextResponse.json(
        { 
          error: 'Cannot delete the last Super Administrator. At least one Super Administrator must exist at all times.',
          code: 'LAST_SUPER_ADMIN'
        },
        { status: 403 }
      );
    }

    // Fetch requester's role to check permission
    let requesterRole = 'Sales'; // default
    if (requesterId) {
      const requester = await query('SELECT role FROM users WHERE id = ?', [requesterId]) as any[];
      if (requester.length > 0) {
        requesterRole = requester[0].role;
      }
    }

    // Only Super Admins can delete other users
    if (requesterRole !== 'Super Administration') {
      return NextResponse.json(
        { error: 'Only Super Administrators can delete users' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (id === requesterId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 403 }
      );
    }

    await query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
