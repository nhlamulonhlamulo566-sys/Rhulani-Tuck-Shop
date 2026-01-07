'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { createUserAction } from './actions';

const baseUserSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'First name is required'),
    surname: z.string().min(1, 'Surname is required'),
    email: z.string().email('Please enter a valid email.'),
    role: z.enum(['administration', 'sales']),
});

const userFormSchema = baseUserSchema.extend({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const editUserFormSchema = baseUserSchema;

type UserFormValues = z.infer<typeof userFormSchema>;
type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const usersQuery = useMemoFirebase(
    firestore ? collection(firestore, 'users') : null,
    'users',
    [firestore]
  );
  const { data: users, isLoading: usersLoading, error: usersError } = useCollection<UserProfile>(usersQuery);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver((editingUser ? editUserFormSchema : userFormSchema) as any),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      role: 'sales',
      password: '',
      confirmPassword: '',
    },
  });

  const adminCount = users?.filter(u => u.role === 'administration').length ?? 0;

  const onSubmit = async (data: UserFormValues | EditUserFormValues) => {
    if (!firestore) return;
    setFormIsSubmitting(true);
    
    try {
      if (editingUser) {
        const userRef = doc(firestore, 'users', editingUser.id);
        const updatedUserData: Partial<UserProfile> = {
          name: `${data.name} ${'surname' in data ? data.surname : ''}`.trim(),
          role: data.role,
        };
        
        setDoc(userRef, updatedUserData, { merge: true }).catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: updatedUserData });
             errorEmitter.emit('permission-error', permissionError);
             throw new Error('Failed to update user due to permissions.');
        });

        toast({
          title: 'User Updated',
          description: `User ${data.name} has been updated.`,
        });
        setEditingUser(null);
      } else {
        const createData = data as UserFormValues;
        const result = await createUserAction({
            email: createData.email,
            password: createData.password,
            displayName: `${createData.name} ${createData.surname}`.trim(),
            role: createData.role,
        });

        if (result.error) {
            throw new Error(result.error);
        }

        toast({
            title: 'User Created',
            description: `User ${createData.name} has been created with the role ${createData.role}.`,
        });
      }
      form.reset({
          name: '',
          surname: '',
          email: '',
          role: 'sales',
          password: '',
          confirmPassword: '',
      });
    } catch (error: any) {
        console.error("Error processing user:", error);
        toast({
            variant: "destructive",
            title: "An Error Occurred",
            description: error.message || 'There was a problem creating or updating the user.',
        });
    } finally {
        setFormIsSubmitting(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    const [name, ...surnameParts] = user.name.split(' ');
    const surname = surnameParts.join(' ');
    form.reset({
        id: user.id,
        name,
        surname,
        email: user.email,
        role: user.role,
        password: '********',
        confirmPassword: '********',
    });
  };

  const handleDelete = async (userId: string) => {
    if (!firestore || !userId || !users) return;

    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'administration' && adminCount <= 1) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Last Administrator",
            description: "You must have at least one administrator account.",
        });
        return;
    }

    try {
        await deleteDoc(doc(firestore, "users", userId));
        toast({
          title: 'User Deleted',
          description: 'The user has been successfully deleted.',
        });
    } catch(e) {
       console.error("Error deleting user:", e);
       const permissionError = new FirestorePermissionError({ path: `users/${userId}`, operation: 'delete' });
       errorEmitter.emit('permission-error', permissionError);
       toast({
         variant: "destructive",
         title: "Deletion Failed",
         description: 'Could not delete user. Check permissions.',
       });
    }
  };
  
  const handleCancelEdit = () => {
    setEditingUser(null);
    form.reset({
        name: '',
        surname: '',
        email: '',
        role: 'sales',
        password: '',
        confirmPassword: '',
    });
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
            <CardDescription>
              {editingUser ? 'Update the details for this user.' : 'Create a new user and assign them a role.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surname</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Username)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} disabled={!!editingUser} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="administration">
                            Administration
                          </SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!editingUser && (
                    <>
                        <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </>
                )}


                <div className="flex space-x-2">
                    <Button type="submit" disabled={formIsSubmitting}>
                        {formIsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingUser ? 'Update User' : 'Add User'}
                    </Button>
                    {editingUser && (
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                    )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Edit and remove existing users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border shadow-sm rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usersLoading ? (
                           <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : !users || users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No users have been added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const isLastAdmin = user.role === 'administration' && adminCount <= 1;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'administration' ? 'secondary' : 'default'}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleEdit(user)}>Edit</DropdownMenuItem>
                                                        <AlertDialogTrigger asChild disabled={isLastAdmin}>
                                                            <DropdownMenuItem 
                                                                onSelect={(e) => e.preventDefault()} 
                                                                className="text-red-600"
                                                                disabled={isLastAdmin}
                                                            >
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the user <span className="font-semibold">{user.name}</span>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(user.id)}>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                         {usersError && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-destructive">
                                    Error loading users: {usersError.message}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
