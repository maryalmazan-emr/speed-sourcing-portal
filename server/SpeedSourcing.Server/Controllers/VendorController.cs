using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/vendor")]
public class VendorController : ControllerBase
{
    private readonly AppDbContext _db;

    public VendorController(AppDbContext db)
    {
        _db = db;
    }

    public record ValidateDto(string token);

    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateDto dto)
    {
        var token = (dto.token ?? "").Trim();
        if (string.IsNullOrWhiteSpace(token))
            return Ok(null);

        var invite = await _db.VendorInvites
            .FirstOrDefaultAsync(i => i.InviteToken == token);

        if (invite == null)
            return Ok(null);

        var auction = await _db.Auctions.FindAsync(invite.AuctionId);
        if (auction == null)
            return Ok(null);

        if (invite.Status == "pending")
        {
            invite.Status = "accessed";
            invite.AccessedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            invite = new
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
            },
            auction = new
            {
                id = auction.Id.ToString(),
                title = auction.Title,
                description = auction.Description,
                product_details = auction.ProductDetails,
                quantity = auction.Quantity,
                unit = auction.Unit,
                delivery_location = auction.DeliveryLocation,
                starts_at = auction.StartsAt,
                ends_at = auction.EndsAt,
                status = auction.Status
            }
        });
    }

    public record AccessDto(string token);

    [HttpPost("access")]
    public async Task<IActionResult> Access([FromBody] AccessDto dto)
    {
        var token = (dto.token ?? "").Trim();
        if (string.IsNullOrWhiteSpace(token))
            return NoContent();

        var invite = await _db.VendorInvites
            .FirstOrDefaultAsync(i => i.InviteToken == token);

        if (invite == null)
            return NoContent();

        invite.Status = "accessed";
        invite.AccessedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
