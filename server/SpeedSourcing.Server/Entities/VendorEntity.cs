using System.ComponentModel.DataAnnotations;

public class VendorInviteEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuctionId { get; set; }

    [Required, MaxLength(256)]
    public required string VendorEmail { get; set; }

    [Required, MaxLength(256)]
    public required string VendorCompany { get; set; }

    [Required, MaxLength(64)]
    public required string InviteToken { get; set; }

    public DateTimeOffset InviteSentAt { get; set; } = DateTimeOffset.UtcNow;

    [Required, MaxLength(20)]
    public required string InviteMethod { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }

    public DateTimeOffset? AccessedAt { get; set; }
}