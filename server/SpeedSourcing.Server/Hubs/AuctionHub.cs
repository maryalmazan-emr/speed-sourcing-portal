// file: server/SpeedSourcing.Server/Hubs/AuctionHub.cs
using Microsoft.AspNetCore.SignalR;

public class AuctionHub : Hub
{
    public Task JoinAuction(string auctionId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"auction:{auctionId}");

    public Task LeaveAuction(string auctionId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"auction:{auctionId}");

    public Task JoinVendor(string auctionId, string vendorEmail) =>
        Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"auction:{auctionId}:vendor:{(vendorEmail ?? "").Trim().ToLowerInvariant()}"
        );

    public Task LeaveVendor(string auctionId, string vendorEmail) =>
        Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            $"auction:{auctionId}:vendor:{(vendorEmail ?? "").Trim().ToLowerInvariant()}"
        );
}