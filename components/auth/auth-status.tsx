"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface AuthStatusProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
}

export function AuthStatus({ user }: AuthStatusProps) {
  const { status } = useSession();
  
  if (status === "loading") {
    return <div className="animate-pulse h-8 w-8 rounded-full bg-muted"></div>;
  }
  
  if (status === "unauthenticated") {
    return (
      <Button variant="outline" size="sm" asChild>
        <a href="/login">Entrar</a>
      </Button>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar || ""} alt={user?.name || "Avatar do usuário"} />
            <AvatarFallback>{user?.name?.substring(0, 2) || <User className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user?.name && <p className="font-medium">{user.name}</p>}
            {user?.email && <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>}
          </div>
        </div>
        <DropdownMenuItem asChild>
          <a href="/profile">Perfil</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">Configurações</a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 