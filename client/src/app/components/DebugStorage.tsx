import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { kv } from "@/lib/backend";

export function DebugStorage() {
  const [debug, setDebug] = useState<any>({});

  const refreshDebug = async () => {
    const invites = await kv.get("invites");
    const auctions = await kv.get("auctions");
    const admins = await kv.get("admins");
    const bids = await kv.get("bids");

    const allKeys = Object.keys(localStorage).filter(k =>
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
    refreshDebug();
  }, []);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>localStorage Debug</CardTitle>
      </CardHeader>

      <CardContent>
        <Button onClick={refreshDebug} className="mb-4">
          Refresh
        </Button>

        <pre className="text-xs overflow-auto max-h-96 bg-gray-100 dark:bg-gray-800 p-4 rounded">
          {JSON.stringify(debug, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
