"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Building2,
  Rocket,
  CalendarClock,
  Gavel,
  AlertTriangle,
  Siren,
  Map,
  BarChart3,
  Settings,
  ListChecks,
  Users,
  ClipboardList,
  Share2,
  CheckSquare,
  Calendar,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Defined here (client component) rather than passed as a prop from the server layout,
// since React component references (like lucide icons) can't be serialized across the
// Server -> Client Component boundary.
const NAV_ITEMS: Record<"leadership" | "team", NavItem[]> = {
  leadership: [
    { href: "/leadership/command-center", label: "Command Center", icon: LayoutDashboard },
    { href: "/leadership/goals", label: "Goals", icon: Target },
    { href: "/leadership/verticals", label: "Business Verticals", icon: Building2 },
    { href: "/leadership/initiatives", label: "Initiatives", icon: Rocket },
    { href: "/leadership/strategy-review", label: "Strategy Review", icon: CalendarClock },
    { href: "/leadership/decisions", label: "Decisions", icon: Gavel },
    { href: "/leadership/issues-risks", label: "Issues & Risks", icon: AlertTriangle },
    { href: "/leadership/escalations", label: "Escalations", icon: Siren },
    { href: "/leadership/roadmap", label: "Roadmap", icon: Map },
    { href: "/leadership/reports", label: "Reports", icon: BarChart3 },
    { href: "/leadership/admin", label: "Administration", icon: Settings },
  ],
  team: [
    { href: "/team/my-work", label: "My Work", icon: ListChecks },
    { href: "/team/my-team", label: "My Team", icon: Users },
    { href: "/team/tasks", label: "Tasks", icon: ClipboardList },
    { href: "/team/delegated", label: "Delegated", icon: Share2 },
    { href: "/team/approvals", label: "Approvals", icon: CheckSquare },
    { href: "/team/blockers", label: "Blockers", icon: Siren },
    { href: "/team/calendar", label: "Calendar", icon: Calendar },
    { href: "/team/notifications", label: "Notifications", icon: Bell },
  ],
};

export function NavLinks({ portal }: { portal: "leadership" | "team" }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[portal];
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
