// client/src/lib/notifications.ts

export interface Notification {
  id: string;
  vendor_email: string;
  auction_id: string;
  type: "rank_change" | "admin_message" | "auction_start" | "auction_end";
  title: string;
  message: string;
  sender?: string;
  old_rank?: number;
  new_rank?: number;
  read: boolean;
  created_at: string;
}

const NOTIFICATIONS_KEY = "speed_sourcing_notifications";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getNotifications(vendorEmail?: string): Notification[] {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  const all = safeParse<Notification[]>(stored, []);

  if (!vendorEmail) return all;
  const email = vendorEmail.trim().toLowerCase();
  return all.filter((n) => n.vendor_email?.toLowerCase() === email);
}

export function addNotification(
  notification: Omit<Notification, "id" | "created_at" | "read">
): Notification {
  const newNotification: Notification = {
    ...notification,
    vendor_email: notification.vendor_email.trim().toLowerCase(),
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    created_at: new Date().toISOString(),
    read: false,
  };

  const notifications = getNotifications();
  notifications.unshift(newNotification);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  return newNotification;
}

export function markAsRead(notificationId: string): void {
  const notifications = getNotifications();
  const n = notifications.find((x) => x.id === notificationId);
  if (!n) return;
  n.read = true;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function markAllAsRead(vendorEmail: string): void {
  const email = vendorEmail.trim().toLowerCase();
  const notifications = getNotifications();
  notifications.forEach((n) => {
    if (n.vendor_email?.toLowerCase() === email) n.read = true;
  });
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function getUnreadCount(vendorEmail: string): number {
  return getNotifications(vendorEmail).filter((n) => !n.read).length;
}

export function deleteNotification(notificationId: string): void {
  const notifications = getNotifications();
  const filtered = notifications.filter((n) => n.id !== notificationId);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
}

export function clearOldNotifications(daysOld: number = 30): void {
  const notifications = getNotifications();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const filtered = notifications.filter((n) => new Date(n.created_at) > cutoff);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
}
