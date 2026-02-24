// File: src/app/components/FAQ.tsx

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export function FAQ() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-gray-600 dark:text-gray-300">
            This page is intentionally blank for now.
            Include information here that would be helpful for vendors, such as:
            when an auction will start, how to use the platform, who to contact for support, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}