import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

let auctionConnection: HubConnection | null = null;

export function getAuctionHubConnection(): HubConnection {
  if (auctionConnection) return auctionConnection;

  auctionConnection = new HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/auction`)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();

  return auctionConnection;
}

export async function ensureStarted(conn: HubConnection): Promise<void> {
  if (conn.state === HubConnectionState.Connected) return;
  if (conn.state === HubConnectionState.Connecting) return;

  await conn.start();
}