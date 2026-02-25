// File: client/src/app/components/NotificationBell.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Badge } from "@/app/components/ui/badge";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  type Notification,
} from "@/lib/notifications";

interface NotificationBellProps {
  vendorEmail?: string;
  adminEmail?: string;
  role: "admin" | "vendor";
  adminRole?: "product_owner" | "global_admin" | "internal_user" | "external_guest";
}

export function NotificationBell(props: NotificationBellProps) {
  const { vendorEmail, adminEmail, role } = props;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = (): void => {
    const email = role === "vendor" ? vendorEmail : adminEmail;
    if (!email) return;

    const notifs = getNotifications(email);
    setNotifications(notifs);
    setUnreadCount(getUnreadCount(email));
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorEmail, adminEmail, role]);

  const handleMarkAsRead = (notificationId: string): void => {
    markAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = (): void => {
    const email = role === "vendor" ? vendorEmail : adminEmail;
    if (!email) return;

    markAllAsRead(email);
    loadNotifications();
  };

  const handleDelete = (notificationId: string): void => {
    deleteNotification(notificationId);
    loadNotifications();
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "rank_change":
        return <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "admin_message":
        return <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "auction_start":
        return <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "auction_end":
        return <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRankIcon = (oldRank?: number, newRank?: number) => {
    if (oldRank == null || newRank == null) return null;

    if (newRank < oldRank) {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (newRank > oldRank) {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
    return null;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const email = role === "vendor" ? vendorEmail : adminEmail;
  if (!email) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          type="button"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs border-2 border-white dark:border-gray-800">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0 max-h-125 overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                type="button"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !notif.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      {notif.type === "rank_change" &&
                      notif.old_rank != null &&
                      notif.new_rank != null
                        ? getRankIcon(notif.old_rank, notif.new_rank)
                        : getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {notif.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notif.id)}
                          className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                          type="button"
                        >
                          <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </Button>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {notif.message}
                      </p>

                      {notif.sender && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
                          From: {notif.sender}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(notif.created_at)}
                        </span>

                        {!notif.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-xs h-6 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            type="button"
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
