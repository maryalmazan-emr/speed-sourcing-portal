using System.ComponentModel.DataAnnotations;

public class VendorInviteEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuctionId { get; set; }

    [Required, MaxLength(256)] public string VendorEmail { get; set; } = "";
    [Required, MaxLength(256)] public string VendorCompany { get; set; } = "";

    [Required, MaxLength(64)] public string InviteToken { get; set; } = "";

    public DateTimeOffset InviteSentAt { get; set; } = DateTimeOffset.UtcNow;

    [Required, MaxLength(20)] public string InviteMethod { get; set; } = "manual";

    [Required, MaxLength(20)] public string Status { get; set; } = "pending";
    public DateTimeOffset? AccessedAt { get; set; }
}
