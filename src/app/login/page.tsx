'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser, useFirestore } from "@/firebase" 
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs } from "firebase/firestore"
import type { UserProfile } from "@/lib/types"

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const firestore = useFirestore();
  const { user, isUserLoading, login } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter your email and password.",
      });
      return;
    }
    setIsLoggingIn(true);
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Invalid credentials");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      if (userData.password !== password) {
        throw new Error("Invalid credentials");
      }
      
      login({ ...userData, id: userDoc.id });
      // The useEffect will handle the redirect on the next render.

    } catch (error: any) {
       toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
        });
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                Don't have an account? Please ask your manager or supervisor to create one for you.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
