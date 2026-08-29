import { requireUser } from "@/server/auth/session";
import { listNotifications } from "@/server/services/org";
import { NotificationsList } from "@/components/team/notifications-list";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotifications(user.id);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">{notifications.filter((n) => !n.is_read).length} unread</p>
      </div>
      <NotificationsList notifications={notifications} />
    </div>
  );
}
