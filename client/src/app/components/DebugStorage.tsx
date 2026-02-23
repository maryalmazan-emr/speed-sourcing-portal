// File: src/app/components/DebugStorage.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/app/components/ui/collapsible";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import { kv } from "@/lib/kv";

export function DebugStorage() {
  const [debug, setDebug] = useState<Record<string, unknown>>({});

  const refreshDebug = async (): Promise<void> => {
    const invites = await kv.get("invites");
    const auctions = await kv.get("auctions");
    const admins = await kv.get("admins");
    const bids = await kv.get("bids");

    const allKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith("speedsourcing:")
    );

    setDebug({
      invites,
      auctions,
      admins,
      bids,
      allKeys,
      raw: {
        invites: localStorage.getItem("speedsourcing:invites"),
        auctions: localStorage.getItem("speedsourcing:auctions"),
      },
    });
  };

  useEffect(() => {
    void refreshDebug();
  }, []);

  const keyCount =
    Array.isArray((debug as any)?.allKeys)
      ? (debug as any).allKeys.length
      : 0;

  return (
    <Collapsible defaultOpen={false}>
      <Card className="m-4">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">localStorage Debug</CardTitle>

            <Badge variant="secondary">
              {keyCount} keys
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshDebug}
              type="button"
            >
              Refresh
            </Button>

            {/* ✅ Collapse / Expand */}
            <CollapsibleTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                type="button"
              >
                <ChevronDown className="h-4 w-4 data-[state=open]:hidden" />
                <ChevronUp className="h-4 w-4 hidden data-[state=open]:block" />
                <span className="ml-1">Debug</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        {/* Collapsible Content */}
        <CollapsibleContent
          className="
            overflow-hidden
            data-[state=open]:animate-collapsible-down
            data-[state=closed]:animate-collapsible-up
          "
        >
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96 bg-gray-100 dark:bg-gray-800 p-4 rounded">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}