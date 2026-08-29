"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/org";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="flex flex-col gap-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(async () => {
              try { await markAllNotificationsReadAction(); toast.success("All marked read"); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            })}
          >
            Mark all read
          </Button>
        </div>
      )}

      {notifications.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No notifications.</p>}

      {notifications.map((n) => (
        <Card
          key={n.id}
          className={n.is_read ? "" : "border-primary/40 bg-primary/5"}
          onClick={() => !n.is_read && startTransition(() => markNotificationReadAction(n.id))}
        >
          <CardContent className="flex flex-col gap-1 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
            </div>
            {n.body && <p className="text-muted-foreground">{n.body}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
