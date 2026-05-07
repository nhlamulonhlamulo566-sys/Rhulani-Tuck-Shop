'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { useUser, useFirestore } from "@/firebase" // Removed Firebase
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
// import { collection, query, where, getDocs } from "firebase/firestore" // Removed Firebase
import type { UserProfile } from "@/lib/types"

export default function LoginPage() {
  const [workNumber, setWorkNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already logged in
    const userDataStr = sessionStorage.getItem('currentUser');
    if (userDataStr) {
      try {
        setUser(JSON.parse(userDataStr));
        setIsUserLoading(false);
        router.push('/dashboard');
      } catch (e) {
        setIsUserLoading(false);
      }
    } else {
      setIsUserLoading(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{8}$/.test(workNumber) || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter an 8-digit work number and password.",
      });
      return;
    }
    setIsLoggingIn(true);
    try {
      // Call MySQL API endpoint for login using work number
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workNumber, password })
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      const userData: UserProfile = data.user;
      
      // Store user in sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      setUser(userData);
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${userData.firstName}!`,
      });
      
      router.push('/dashboard');

    } catch (error: any) {
       toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid work number or password. Please try again.",
        });
       setWorkNumber('');
       setPassword('');
    } finally {
        setIsLoggingIn(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold uppercase">RHULANI TUCK SHOP</CardTitle>
          <CardDescription>Authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="workNumber">Work Number</Label>
                <Input
                  id="workNumber"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 8-digit work number"
                  required
                  maxLength={8}
                  value={workNumber}
                  onChange={(e) => setWorkNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoggingIn}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
              </Button>
              <div className="mt-4 text-center text-sm">
                Do not have an account? Please ask your manager or supervisor to create one for you.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
