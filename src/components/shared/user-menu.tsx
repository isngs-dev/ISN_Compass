"use client";

import { LogOut, User } from "lucide-react";
import { signOutAction } from "@/server/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserMenu({ email }: { email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{email.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="hidden text-sm leading-tight sm:block">
          <div className="font-medium">{email}</div>
          <div className="text-xs text-muted-foreground">Admin</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            <User className="h-4 w-4" /> {email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem nativeButton render={<button type="submit" className="flex w-full items-center gap-2 text-destructive" />}>
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
