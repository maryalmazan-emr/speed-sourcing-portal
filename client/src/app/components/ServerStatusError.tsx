// File: src/app/components/ServerStatusError.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { RefreshCw, Server, Clock, Copy, Check } from "lucide-react";

interface ServerStatusErrorProps {
  onRetry: () => void;
}

export function ServerStatusError({ onRetry }: ServerStatusErrorProps) {
  const [copied, setCopied] = useState(false);
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(30);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  const healthUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/make-server-923810f5/health`
      : "/make-server-923810f5/health";

  useEffect(() => {
    if (!autoRetryEnabled) return;

    const interval = setInterval(() => {
      setSecondsUntilRetry((prev) => {
        if (prev <= 1) {
          // schedule retry on next tick to avoid setState during render
          setTimeout(() => onRetry(), 0);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRetryEnabled, onRetry]);

  const copyDiagnostics = async (): Promise<void> => {
    const diagnostics = `
Speed Sourcing Portal - Backend Status
==========================================
Health Endpoint: ${healthUrl}
Status: Failed to fetch / backend not responding
Timestamp: ${new Date().toISOString()}

Notes:
- If this is first-time deployment, the backend may still be initializing.
- Retry connection, or open the health endpoint in a browser to verify.
    `.trim();

    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle>Backend Starting…</CardTitle>
              <CardDescription className="mt-1">
                Please wait while the server initializes
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Backend not responding</p>
                <p className="text-blue-700 mb-2">
                  The health endpoint{" "}
                  <code className="bg-blue-100 px-1 rounded break-all">
                    {healthUrl}
                  </code>{" "}
                  is not responding.
                </p>
                <p className="text-blue-700 text-xs">
                  Action: Click “Test in Browser” below to verify the endpoint.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    autoRetryEnabled ? "bg-purple-600 animate-pulse" : "bg-gray-400"
                  }`}
                />
                <p className="text-sm text-purple-800 font-medium">
                  {autoRetryEnabled
                    ? `Auto-retry in ${secondsUntilRetry}s`
                    : "Auto-retry disabled"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoRetryEnabled((v) => !v)}
                className="text-xs"
                type="button"
              >
                {autoRetryEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={onRetry} className="w-full" size="lg" type="button">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>

              <Button
                onClick={copyDiagnostics}
                variant="outline"
                className="w-full"
                size="lg"
                type="button"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Info
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={() => window.open("/diagnostic.html", "_blank")}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
              type="button"
            >
              🔍 Open Diagnostic Tool
            </Button>

            <Button
              onClick={() => window.open(healthUrl, "_blank")}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              type="button"
            >
              🌐 Test in Browser (Health Endpoint)
            </Button>

            <p className="text-xs text-gray-500 text-center">
              💡 If the health endpoint returns JSON, refresh the app.
            </p>
          </div>

          <details className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <summary className="font-medium cursor-pointer hover:text-gray-900">
              🔧 Technical Details (click to expand)
            </summary>
            <ul className="space-y-1 mt-2 ml-4">
              <li>
                • <strong>Health URL:</strong> {healthUrl}
              </li>
              <li>
                • <strong>Expected:</strong> JSON (status ok)
              </li>
              <li>
                • <strong>Current:</strong> failed to fetch / not responding
              </li>
            </ul>

            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
              <p className="font-medium">🔗 Test directly:</p>
              <a
                href={healthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all mt-1 block"
              >
                {healthUrl}
              </a>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}