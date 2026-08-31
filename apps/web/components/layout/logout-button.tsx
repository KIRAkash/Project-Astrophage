'use client';

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

export function LogoutButton() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.push("/login");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleLogout}
      className="text-gray-400 hover:text-white"
      title="Log out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
