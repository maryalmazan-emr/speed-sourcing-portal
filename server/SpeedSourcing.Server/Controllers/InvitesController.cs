using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

[ApiController]
public class InvitesController : ControllerBase
{
    private readonly AppDbContext _db;

    public InvitesController(AppDbContext db)
    {
        _db = db;
    }

    // ----------------------------
    // DTOs
    // ----------------------------
    public record VendorDto(string email, string company);
    public record CreateInvitesDto(
        string auction_id,
        List<VendorDto> vendors,
        string invite_method
    );

    // ----------------------------
    // GET: /api/invites?auctionId=...
    // ----------------------------
    [HttpGet("api/invites")]
    public async Task<IActionResult> GetInvites([FromQuery] string? auctionId = null)
    {
        IQueryable<VendorInviteEntity> q = _db.VendorInvites.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(auctionId))
        {
            if (!Guid.TryParse(auctionId, out var aid))
                return BadRequest("Invalid auctionId");

            q = q.Where(i => i.AuctionId == aid);
        }

        var invites = await q
            .OrderByDescending(i => i.InviteSentAt)
            .Select(invite => new
            {
                id = invite.Id.ToString(),
                auction_id = invite.AuctionId.ToString(),
                vendor_email = invite.VendorEmail,
                vendor_company = invite.VendorCompany,
                invite_token = invite.InviteToken,
                invite_sent_at = invite.InviteSentAt,
                invite_method = invite.InviteMethod,
                status = invite.Status,
                accessed_at = invite.AccessedAt
            })
            .ToListAsync();

        return Ok(invites);
    }

    // ----------------------------
    // POST: /api/invites
    // ----------------------------
    [HttpPost("api/invites")]
    public async Task<IActionResult> CreateInvites([FromBody] CreateInvitesDto dto)
    {
        if (dto == null)
            return BadRequest("Body is required");

        if (!Guid.TryParse((dto.auction_id ?? "").Trim(), out var aid))
            return BadRequest("Invalid auction_id");

        var auction = await _db.Auctions.FindAsync(aid);
        if (auction == null)
            return NotFound("Auction not found");

        if (dto.vendors == null || dto.vendors.Count == 0)
            return BadRequest("vendors is required");

        var method = (dto.invite_method ?? "manual").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(method))
            method = "manual";

        var now = DateTimeOffset.UtcNow;
        var results = new List<object>();

        foreach (var v in dto.vendors)
        {
            var email = (v?.email ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains("@"))
                continue;

            var company = (v?.company ?? "External Guest").Trim();
            if (string.IsNullOrWhiteSpace(company))
                company = "External Guest";

            var existing = await _db.VendorInvites
                .FirstOrDefaultAsync(i => i.AuctionId == aid && i.VendorEmail == email);

            if (existing == null)
            {
                var token = await GenerateUniqueTokenAsync();

                existing = new VendorInviteEntity
                {
                    Id = Guid.NewGuid(),
                    AuctionId = aid,
                    VendorEmail = email,
                    VendorCompany = company,
                    InviteToken = token,
                    InviteSentAt = now,
                    InviteMethod = method,
                    Status = "pending",
                    AccessedAt = null
                };

                _db.VendorInvites.Add(existing);
            }
            else
            {
                existing.VendorCompany = company;
                existing.InviteMethod = method;
                existing.InviteSentAt = now;

                if (string.IsNullOrWhiteSpace(existing.Status))
                    existing.Status = "pending";
            }

            results.Add(new
            {
                id = existing.Id.ToString(),
                auction_id = existing.AuctionId.ToString(),
                vendor_email = existing.VendorEmail,
                vendor_company = existing.VendorCompany,
                invite_token = existing.InviteToken,
                invite_sent_at = existing.InviteSentAt,
                invite_method = existing.InviteMethod,
                status = existing.Status,
                accessed_at = existing.AccessedAt
            });
        }

        await _db.SaveChangesAsync();
        return Ok(results);
    }

    // ----------------------------
    // COMPAT: /api/auctions/{auctionId}/invites
    // ----------------------------
    [HttpPost("api/auctions/{auctionId}/invites")]
    public async Task<IActionResult> CreateInvitesForAuction(
        string auctionId,
        [FromBody] CreateInvitesDto dto
    )
    {
        dto = dto with { auction_id = auctionId };
        return await CreateInvites(dto);
    }

    [HttpGet("api/auctions/{auctionId}/invites")]
    public async Task<IActionResult> GetInvitesForAuction(string auctionId)
    {
        return await GetInvites(auctionId);
    }

    // ----------------------------
    // Token generation
    // ----------------------------
    private async Task<string> GenerateUniqueTokenAsync()
    {
        while (true)
        {
            var token = Convert.ToHexString(
                RandomNumberGenerator.GetBytes(6)
            );

            var exists = await _db.VendorInvites
                .AnyAsync(i => i.InviteToken == token);

            if (!exists)
                return token;
        }
    }
}