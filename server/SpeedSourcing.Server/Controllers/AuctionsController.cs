// file: server/SpeedSourcing.Server/Controllers/AuctionsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

[ApiController]
public class AuctionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuctionsController(AppDbContext db)
    {
        _db = db;
    }

    // DTO matches your frontend payload (snake_case)
    public class CreateAuctionDto
    {
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("product_details")]
        public string? ProductDetails { get; set; }

        [JsonPropertyName("quantity")]
        public int? Quantity { get; set; }

        [JsonPropertyName("unit")]
        public string? Unit { get; set; }

        [JsonPropertyName("delivery_location")]
        public string? DeliveryLocation { get; set; }

        // AdminSetup sends ISO strings
        [JsonPropertyName("starts_at")]
        public string? StartsAt { get; set; }

        [JsonPropertyName("ends_at")]
        public string? EndsAt { get; set; }

        [JsonPropertyName("winner_vendor_email")]
        public string? WinnerVendorEmail { get; set; }

        [JsonPropertyName("created_by_email")]
        public string? CreatedByEmail { get; set; }

        [JsonPropertyName("created_by_company")]
        public string? CreatedByCompany { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        // extra fields your UI includes (safe to accept)
        [JsonPropertyName("admin_id")]
        public string? AdminId { get; set; }

        [JsonPropertyName("created_by_admin_email")]
        public string? CreatedByAdminEmail { get; set; }

        // UI sends camelCase variant too
        [JsonPropertyName("createdByAdminEmail")]
        public string? CreatedByAdminEmailCamel { get; set; }

        [JsonPropertyName("date_requested")]
        public string? DateRequested { get; set; }

        [JsonPropertyName("requestor")]
        public string? Requestor { get; set; }

        [JsonPropertyName("requestor_email")]
        public string? RequestorEmail { get; set; }

        [JsonPropertyName("group_site")]
        public string? GroupSite { get; set; }

        [JsonPropertyName("event_type")]
        public string? EventType { get; set; }

        [JsonPropertyName("target_lead_time")]
        public string? TargetLeadTime { get; set; }
    }

    // --------------------------------------------------
    // GET: /api/auctions?adminEmail=...
    // --------------------------------------------------
    [HttpGet("api/auctions")]
    public async Task<IActionResult> GetAuctions([FromQuery] string? adminEmail = null)
    {
        IQueryable<AuctionEntity> q = _db.Auctions.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            var email = adminEmail.Trim().ToLowerInvariant();
            q = q.Where(a => (a.CreatedByEmail ?? "").ToLower() == email);
        }

        var auctions = await q
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                id = a.Id.ToString(),
                title = a.Title,
                description = a.Description,
                status = a.Status,
                product_details = a.ProductDetails,
                quantity = a.Quantity,
                unit = a.Unit,
                delivery_location = a.DeliveryLocation,
                starts_at = a.StartsAt,
                ends_at = a.EndsAt,
                winner_vendor_email = a.WinnerVendorEmail,
                created_at = a.CreatedAt,
                created_by_email = a.CreatedByEmail,
                created_by_company = a.CreatedByCompany,
                notes = a.Notes
            })
            .ToListAsync();

        return Ok(auctions);
    }

    // --------------------------------------------------
    // GET: /api/auctions/{id}
    // --------------------------------------------------
    [HttpGet("api/auctions/{auctionId}")]
    public async Task<IActionResult> GetAuction(string auctionId)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var a = await _db.Auctions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == aid);
        if (a == null)
            return NotFound("Auction not found");

        return Ok(new
        {
            id = a.Id.ToString(),
            title = a.Title,
            description = a.Description,
            status = a.Status,
            product_details = a.ProductDetails,
            quantity = a.Quantity,
            unit = a.Unit,
            delivery_location = a.DeliveryLocation,
            starts_at = a.StartsAt,
            ends_at = a.EndsAt,
            winner_vendor_email = a.WinnerVendorEmail,
            created_at = a.CreatedAt,
            created_by_email = a.CreatedByEmail,
            created_by_company = a.CreatedByCompany,
            notes = a.Notes
        });
    }

    // --------------------------------------------------
    // POST: /api/auctions  (matches AdminSetup payload)
    // --------------------------------------------------
    [HttpPost("api/auctions")]
    public async Task<IActionResult> CreateAuction([FromBody] CreateAuctionDto dto)
    {
        if (dto == null)
            return BadRequest("Body is required");

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("title is required");

        if (string.IsNullOrWhiteSpace(dto.DeliveryLocation))
            return BadRequest("delivery_location is required");

        if (dto.Quantity is null || dto.Quantity <= 0)
            return BadRequest("quantity must be > 0");

        if (string.IsNullOrWhiteSpace(dto.Unit))
            return BadRequest("unit is required");

        if (string.IsNullOrWhiteSpace(dto.StartsAt) || !DateTimeOffset.TryParse(dto.StartsAt, out var startsAt))
            return BadRequest("starts_at must be a valid ISO datetime");

        if (string.IsNullOrWhiteSpace(dto.EndsAt) || !DateTimeOffset.TryParse(dto.EndsAt, out var endsAt))
            return BadRequest("ends_at must be a valid ISO datetime");

        if (endsAt <= startsAt)
            return BadRequest("ends_at must be after starts_at");

        // Choose best available admin email value (your UI sends multiple)
        var createdByEmail =
            (dto.CreatedByAdminEmail ?? dto.CreatedByAdminEmailCamel ?? dto.CreatedByEmail ?? "").Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(createdByEmail))
            return BadRequest("created_by_email (or created_by_admin_email) is required");

        var auction = new AuctionEntity
        {
            Id = Guid.NewGuid(),

            // Program.cs seed shows AdminId is a Guid; UI sends email. Use a new Guid for now.
            // (If you later add an Admins table, map it properly.)
            AdminId = Guid.NewGuid(), // aligns with seed pattern 

            Title = dto.Title.Trim(),
            Description = dto.Description ?? "",
            ProductDetails = dto.ProductDetails ?? "",
            Quantity = dto.Quantity.Value,
            Unit = dto.Unit.Trim(),
            DeliveryLocation = dto.DeliveryLocation.Trim(),
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "active" : dto.Status.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByEmail = createdByEmail,
            CreatedByCompany = (dto.CreatedByCompany ?? "").Trim(),
            Notes = dto.Notes ?? "",
            WinnerVendorEmail = string.IsNullOrWhiteSpace(dto.WinnerVendorEmail) ? null : dto.WinnerVendorEmail.Trim().ToLowerInvariant()
        };

        _db.Auctions.Add(auction);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = auction.Id.ToString(),
            title = auction.Title,
            description = auction.Description,
            status = auction.Status,
            product_details = auction.ProductDetails,
            quantity = auction.Quantity,
            unit = auction.Unit,
            delivery_location = auction.DeliveryLocation,
            starts_at = auction.StartsAt,
            ends_at = auction.EndsAt,
            winner_vendor_email = auction.WinnerVendorEmail,
            created_at = auction.CreatedAt,
            created_by_email = auction.CreatedByEmail,
            created_by_company = auction.CreatedByCompany,
            notes = auction.Notes
        });
    }

    // --------------------------------------------------
    // PATCH: /api/auctions/{id}
    // Used by "Select Winner" in AdminDashboard
    // --------------------------------------------------
    [HttpPatch("api/auctions/{auctionId}")]
    public async Task<IActionResult> UpdateAuction(string auctionId, [FromBody] Dictionary<string, object> patch)
    {
        if (!Guid.TryParse(auctionId, out var aid))
            return BadRequest("Invalid auctionId");

        var auction = await _db.Auctions.FindAsync(aid);
        if (auction == null)
            return NotFound("Auction not found");

        if (patch == null || patch.Count == 0)
            return BadRequest("Patch body is required");

        if (patch.TryGetValue("status", out var statusObj))
            auction.Status = statusObj?.ToString();

        if (patch.TryGetValue("winner_vendor_email", out var winnerObj))
        {
            var w = winnerObj?.ToString();
            auction.WinnerVendorEmail = string.IsNullOrWhiteSpace(w) ? null : w.Trim().ToLowerInvariant();
        }

        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}