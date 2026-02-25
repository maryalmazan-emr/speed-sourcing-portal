// File: src/app/components/AccessDenied.tsx

"use client";

import { Card, CardContent } from "@/app/components/ui/card";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to access this page.",
}: AccessDeniedProps) {
  return (
    <div className="container mx-auto px-4 py-8" style={{ maxWidth: "1180px" }}>
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}