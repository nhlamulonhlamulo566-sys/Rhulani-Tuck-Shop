'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-db-collection';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

export default function SettingsPage() {
  const { toast } = useToast();
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [workNumber, setWorkNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'Administration' | 'Sales' | 'Super Administration' | ''>('');
  const [pin, setPin] = useState('');
  
  const { data: users, isLoading: usersLoading, error: usersError, refetch } = useCollection<UserProfile>('/api/users');

  // Initialize admin user from session
  useEffect(() => {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
      setAdminUser(JSON.parse(user));
    }
  }, []);

  const canManageSuperAdmins = adminUser?.role === 'Super Administration';
  const isAdminRole = role === 'Administration' || role === 'Super Administration';

  useEffect(() => {
    if (editingUser) {
        setFirstName(editingUser.firstName);
        setSurname(editingUser.lastName);
        setWorkNumber(editingUser.workNumber);
        setRole(editingUser.role);
        setPin(editingUser.pin || '');
        setPassword('');
        setConfirmPassword('');
    } else {
        clearForm();
    }
  }, [editingUser]);

  const clearForm = () => {
    setEditingUser(null);
    setFirstName('');
    setSurname('');
    setWorkNumber('');
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setPin('');
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) {
      toast({ variant: "destructive", title: "Role not selected" });
      return;
    }

    if (!editingUser) { // Creating a new user
      if (!password || password !== confirmPassword || password.length < 6) {
        toast({ variant: "destructive", title: "Invalid Password", description: "Passwords must match and be at least 6 characters." });
        return;
      }
    }
    
    if (isAdminRole) {
      if (!/^\d{6}$/.test(pin)) {
        toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Administrator PIN must be exactly 6 digits.' });
        return;
      }
      
      const pinExists = users?.some(u => u.pin === pin && u.id !== editingUser?.id);
      if (pinExists) {
        toast({ variant: 'destructive', title: 'PIN already in use', description: 'Please choose a unique 6-digit PIN.' });
        return;
      }
    }

    // PERMISSION CHECKS
    // Only Super Administrators can create or edit Administrators or Super Administrators
    if (!editingUser && (role === 'Administration' || role === 'Super Administration')) {
      if (!canManageSuperAdmins) {
        toast({ 
          variant: "destructive", 
          title: "Permission Denied", 
          description: "Only Super Administrators can create Administrator accounts." 
        });
        return;
      }
    }

    // When editing: prevent non-super-admins from changing role OR editing admin accounts
    if (editingUser && editingUser.role !== 'Sales') {
      if (!canManageSuperAdmins) {
        toast({ 
          variant: "destructive", 
          title: "Permission Denied", 
          description: "Only Super Administrators can edit Administrator accounts." 
        });
        return;
      }
    }

    if (role === 'Super Administration' && !canManageSuperAdmins) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You cannot create a Super Administrator." });
      return;
    }
    if (editingUser?.role === 'Super Administration' && !canManageSuperAdmins) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You cannot edit a Super Administrator." });
      return;
    }

    setIsLoading(true);

    try {
        if (editingUser) {
            const updateData: any = {
              firstName,
              lastName: surname,
              workNumber,
              email: editingUser.email || null,
              role,
              pin: isAdminRole ? pin : null,
            };
            if (password) {
              updateData.password = password;
            }
            const response = await fetch(`/api/users/${editingUser.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });

            if (!response.ok) throw new Error('Failed to update user');

            toast({ title: 'Success', description: 'User updated successfully' });
            refetch();
            clearForm();
        } else { // Create new user
            if (!/^[0-9]{8}$/.test(workNumber)) {
              throw new Error('Work number must be exactly 8 digits.');
            }

            const workNumberExists = users?.some(u => u.workNumber === workNumber);
            if (workNumberExists) {
                throw new Error('A user with this work number already exists.');
            }

            const response = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName,
                lastName: surname,
                workNumber,
                password,
                role,
                pin: isAdminRole ? pin : null,
              }),
            });

            if (!response.ok) throw new Error('Failed to create user');

            toast({
                title: "User Created Successfully",
                description: `${firstName} ${surname} has been added.`
            });
            refetch();
            clearForm();
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: editingUser ? "Error Updating User" : "Error Creating User",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleEdit = (userToEdit: UserProfile) => {
    if (userToEdit.role === 'Super Administration' && !canManageSuperAdmins) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Administrators cannot edit Super Administrators.'
      });
      return;
    }
    setEditingUser(userToEdit);
  }

  const handleDelete = async (userId: string) => {
    try {
      if (userId === adminUser?.id) {
        toast({ variant: "destructive", title: "Cannot delete self" });
        return;
      }

      const userToDelete = users?.find((u) => u.id === userId);
      if (userToDelete?.role === 'Super Administration' && !canManageSuperAdmins) {
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Administrators cannot delete Super Administrators.",
        });
        return;
      }
      
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: adminUser?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast({ title: "User Deleted", description: "The user's account has been permanently deleted." });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting User",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <form onSubmit={handleFormSubmit}>
              <CardHeader>
                <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
                <CardDescription>
                  {editingUser ? "Update the user's details and role." : 'Create a new user account and assign a role.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Enter first name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname</Label>
                    <Input id="surname" placeholder="Enter surname" value={surname} onChange={e => setSurname(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workNumber">Work Number (Username)</Label>
                  <Input id="workNumber" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="12345678" value={workNumber} onChange={e => setWorkNumber(e.target.value.replace(/\D/g, ''))} required disabled={!!editingUser} maxLength={8} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">{editingUser ? 'New Password (Optional)' : 'Password'}</Label>
                        <Input id="password" type="password" placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} value={password} onChange={e => setPassword(e.target.value)} required={!editingUser} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{editingUser ? 'Confirm New Password' : 'Confirm Password'}</Label>
                        <Input id="confirmPassword" type="password" placeholder={editingUser ? 'Leave blank if not changing' : 'Confirm password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!editingUser} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select onValueChange={(value) => setRole(value as 'Administration' | 'Sales' | 'Super Administration')} value={role} required>
                            <SelectTrigger id="role">
                            <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Sales">Sales</SelectItem>
                            {canManageSuperAdmins && <SelectItem value="Administration">Administration</SelectItem>}
                            {canManageSuperAdmins && <SelectItem value="Super Administration">Super Administration</SelectItem>}
                            </SelectContent>
                        </Select>
                        {!canManageSuperAdmins && (
                          <p className="text-xs text-muted-foreground">Only Sales users can be created. Contact a Super Administrator to create Admin accounts.</p>
                        )}
                    </div>
                    {isAdminRole && (
                        <div className="space-y-2">
                            <Label htmlFor="pin">6-Digit Authorization PIN</Label>
                            <Input id="pin" type="password" placeholder="Enter PIN" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} required />
                        </div>
                    )}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUser ? 'Save Changes' : 'Add User'}
                </Button>
                {editingUser && <Button variant="ghost" type="button" onClick={clearForm}>Cancel</Button>}
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Edit and manage user roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Work Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                  ) : usersError ? (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-destructive">
                          Error: Could not load users.
                        </TableCell>
                      </TableRow>
                  ) : (users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                      <TableCell>{u.workNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEdit(u)} disabled={u.role === 'Super Administration' && !canManageSuperAdmins}>Edit</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button 
                                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600 w-full" 
                                      disabled={u.id === adminUser?.id || (u.role === 'Super Administration' && !canManageSuperAdmins)}>
                                        Delete
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. It will permanently delete the account data of the user.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(u.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Role Descriptions</CardTitle>
              <CardDescription>An overview of permissions for each user role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h4 className="font-semibold">Super Administrator</h4>
                <p className="text-sm text-muted-foreground">
                  Unrestricted access to all system features. This role can manage all users (including other Administrators), configure global settings, and view all financial data. Intended for the business owner or top-level manager.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Administrator</h4>
                <p className="text-sm text-muted-foreground">
                  Manages daily operations. Can add and edit products, manage stock levels, oversee till sessions, and manage Sales and other Administrator users. Requires a unique PIN to authorize sensitive actions like transaction voids and returns.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Sales</h4>
                <p className="text-sm text-muted-foreground">
                  Focused on customer-facing transactions. This role has access to the Point of Sale (POS) system for processing sales and can initiate returns or voids, which must be authorized by an Administrator PIN.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
