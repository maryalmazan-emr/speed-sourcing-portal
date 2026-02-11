using Microsoft.AspNetCore.SignalR;

public class AuctionHub : Hub
{
    public Task JoinAuction(string auctionId)
        => Groups.AddToGroupAsync(Context.ConnectionId, $"auction:{auctionId}");

    public Task LeaveAuction(string auctionId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"auction:{auctionId}");
}