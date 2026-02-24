// file: server/SpeedSourcing.Server/Controllers/BidsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

[ApiController]
public class BidsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<AuctionHub> _hub;

    public BidsController(AppDbContext db, IHubContext<AuctionHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public record SubmitBidDto(
        string auction_id,
        string vendor_email,
        string vendor_company,
        string company_name,
        string contact_name,
        string contact_phone,
        int delivery_time_days,
        decimal cost_per_unit,
        string notes
    );

    [HttpPost("api/auctions/{auctionId}/bids")]
    public async Task<IActionResult> Submit(string auctionId, [FromBody] SubmitBidDto dto)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var auction = await _db.Auctions.FindAsync(aid);
        if (auction == null)
            return NotFound("Auction not found");

        var now = DateTimeOffset.UtcNow;
        if (now < auction.StartsAt || now > auction.EndsAt)
            return BadRequest("Auction is not currently active");

        var email = (dto.vendor_email ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("vendor_email is required");

        var totalCost = dto.cost_per_unit * (decimal)auction.Quantity;

        var existing = await _db.Bids
            .FirstOrDefaultAsync(b => b.AuctionId == aid && b.VendorEmail == email);

        if (existing == null)
        {
            existing = new BidEntity
            {
                Id = Guid.NewGuid(),
                AuctionId = aid,
                VendorEmail = email,
                VendorCompany = dto.vendor_company ?? "",
                CompanyName = dto.company_name ?? "",
                ContactName = dto.contact_name ?? "",
                ContactPhone = dto.contact_phone ?? "",
                DeliveryTimeDays = dto.delivery_time_days,
                CostPerUnit = dto.cost_per_unit,
                TotalCost = totalCost,
                Notes = dto.notes ?? "",
                SubmittedAt = now
            };
            _db.Bids.Add(existing);
        }
        else
        {
            existing.VendorCompany = dto.vendor_company ?? "";
            existing.CompanyName = dto.company_name ?? "";
            existing.ContactName = dto.contact_name ?? "";
            existing.ContactPhone = dto.contact_phone ?? "";
            existing.DeliveryTimeDays = dto.delivery_time_days;
            existing.CostPerUnit = dto.cost_per_unit;
            existing.TotalCost = totalCost;
            existing.Notes = dto.notes ?? "";
            existing.SubmittedAt = now;
        }

        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"auction:{auctionId}")
            .SendAsync("bidChanged", new { auctionId });

        await _hub.Clients.Group($"auction:{auctionId}")
            .SendAsync("rankChanged", new { auctionId });

        return Ok(new
        {
            id = existing.Id.ToString(),
            auction_id = existing.AuctionId.ToString(),
            vendor_email = existing.VendorEmail,
            vendor_company = existing.VendorCompany,
            company_name = existing.CompanyName,
            contact_name = existing.ContactName,
            contact_phone = existing.ContactPhone,
            delivery_time_days = existing.DeliveryTimeDays,
            cost_per_unit = existing.CostPerUnit,
            total_cost = existing.TotalCost,
            notes = existing.Notes,
            submitted_at = existing.SubmittedAt
        });
    }

    // ✅ THIS is the endpoint your AdminDashboard is calling
    [HttpGet("api/auctions/{auctionId}/bids")]
    public async Task<IActionResult> GetAllBids(string auctionId)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var bids = await _db.Bids
            .Where(b => b.AuctionId == aid)
            .AsNoTracking()
            .Select(b => new
            {
                id = b.Id.ToString(),
                auction_id = b.AuctionId.ToString(),
                vendor_email = b.VendorEmail,
                vendor_company = b.VendorCompany,
                company_name = b.CompanyName,
                contact_name = b.ContactName,
                contact_phone = b.ContactPhone,
                delivery_time_days = b.DeliveryTimeDays,
                cost_per_unit = b.CostPerUnit,
                total_cost = b.TotalCost,
                notes = b.Notes,
                submitted_at = b.SubmittedAt
            })
            .ToListAsync();

        return Ok(bids);
    }

    [HttpGet("api/auctions/{auctionId}/bids/vendor")]
    public async Task<IActionResult> GetVendorBid(string auctionId, [FromQuery] string vendorEmail)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var email = (vendorEmail ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return Ok(null);

        var bid = await _db.Bids.AsNoTracking()
            .FirstOrDefaultAsync(b => b.AuctionId == aid && b.VendorEmail == email);

        if (bid == null)
            return Ok(null);

        return Ok(new
        {
            id = bid.Id.ToString(),
            auction_id = bid.AuctionId.ToString(),
            vendor_email = bid.VendorEmail,
            vendor_company = bid.VendorCompany,
            company_name = bid.CompanyName,
            contact_name = bid.ContactName,
            contact_phone = bid.ContactPhone,
            delivery_time_days = bid.DeliveryTimeDays,
            cost_per_unit = bid.CostPerUnit,
            total_cost = bid.TotalCost,
            notes = bid.Notes,
            submitted_at = bid.SubmittedAt
        });
    }

    [HttpGet("api/auctions/{auctionId}/rank")]
    public async Task<IActionResult> GetRank(string auctionId, [FromQuery] string vendorEmail)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var bids = await _db.Bids.Where(b => b.AuctionId == aid)
            .AsNoTracking()
            .ToListAsync();

        var ranked = bids
            .OrderBy(b => b.DeliveryTimeDays)
            .ThenBy(b => b.TotalCost)
            .Select((b, idx) => new { bid = b, rank = idx + 1 })
            .ToList();

        var email = (vendorEmail ?? "").Trim().ToLowerInvariant();
        var your = ranked.FirstOrDefault(x => x.bid.VendorEmail == email);
        var leader = ranked.FirstOrDefault();

        return Ok(new
        {
            your_rank = your?.rank ?? 0,
            total_participants = bids.Count,
            leading_delivery_time = leader?.bid.DeliveryTimeDays ?? 0,
            leading_cost = leader?.bid.TotalCost ?? 0,
            your_bid = your == null ? null : new
            {
                id = your.bid.Id.ToString(),
                auction_id = your.bid.AuctionId.ToString(),
                vendor_email = your.bid.VendorEmail,
                vendor_company = your.bid.VendorCompany,
                company_name = your.bid.CompanyName,
                contact_name = your.bid.ContactName,
                contact_phone = your.bid.ContactPhone,
                delivery_time_days = your.bid.DeliveryTimeDays,
                cost_per_unit = your.bid.CostPerUnit,
                total_cost = your.bid.TotalCost,
                notes = your.bid.Notes,
                submitted_at = your.bid.SubmittedAt
            }
        });
    }
}
