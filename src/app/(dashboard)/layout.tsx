'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LineChart,
  Package,
  Package2,
  ShoppingCart,
  Settings,
  Boxes,
  Undo2,
  Loader2,
  LogOut,
  AreaChart,
  Wallet,
  ClipboardList,
  Landmark,
  GanttChartSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const allNavItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', role: 'Administration' },
  { href: '/sales', icon: LineChart, label: 'Sales', role: 'Administration' },
  { href: '/till-management', icon: Landmark, label: 'Till Management', role: 'Administration' },
  { href: '/till-audits', icon: GanttChartSquare, label: 'Till Audits', role: 'Administration' },
  { href: '/reports', icon: AreaChart, label: 'Reports', role: 'Administration' },
  { href: '/products', icon: Package, label: 'Products', role: 'Administration' },
  { href: '/pos', icon: ShoppingCart, label: 'POS', role: 'All' },
  { href: '/stock-count', icon: Boxes, label: 'Stock Count', role: 'Administration' },
  { href: '/reorder-hub', icon: ClipboardList, label: 'Reorder Hub', role: 'Administration' },
  { href: '/returns', icon: Undo2, label: 'Returns & Voids', role: 'All' },
  { href: '/settings', icon: Settings, label: 'Settings', role: 'Administration' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: userProfile, isUserLoading, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const hasShownLoginToast = useRef(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = useMemo(() => {
    if (!userProfile) return []; // Don't show nav items if not logged in
    if (userProfile.role === 'Administration' || userProfile.role === 'Super Administration') {
        return allNavItems.filter(item => item.role === 'Administration' || item.role === 'All');
    }
    if (userProfile.role === 'Sales') {
        return allNavItems.filter(item => item.role === 'Sales' || item.role === 'All');
    }
    return [];
  }, [userProfile]);

  useEffect(() => {
    // Redirect to login if auth check is complete and there's no user
    if (!isUserLoading && !userProfile) {
      router.push('/login');
    }
    
    if (userProfile && !isUserLoading) {
      if (!hasShownLoginToast.current) {
        toast({
            title: "Login Successful",
            description: `Welcome back, ${userProfile.firstName}!`,
        });
        hasShownLoginToast.current = true;
      }
      
      const salesAllowedPaths = ['/pos', '/returns'];
      // Redirect if role and path don't match
      if (userProfile.role === 'Sales' && !salesAllowedPaths.includes(pathname)) {
        router.replace('/pos');
      }
    }
  }, [userProfile, isUserLoading, router, toast, pathname]);

  const handleLogout = async () => {
    logout();
    hasShownLoginToast.current = false;
    router.push('/login');
  };

  const isLoading = isUserLoading || !userProfile;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6 text-primary" />
              <span className="font-bold">RHULANI TUCK SHOP</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Package2 className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
               <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  A list of pages you can navigate to.
                </SheetDescription>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Package2 className="h-6 w-6 text-primary" />
                  <span className="font-bold">RHULANI TUCK SHOP</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsSheetOpen(false)}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add a search bar here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full" disabled={!userProfile}>
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {userProfile ? getInitials(userProfile.firstName, userProfile.lastName) : ''}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userProfile?.firstName} {userProfile?.lastName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
