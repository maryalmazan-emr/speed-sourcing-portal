using System.ComponentModel.DataAnnotations;

public class AuctionEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AdminId { get; set; }

    [Required, MaxLength(200)] public string Title { get; set; } = "";
    [Required] public string Description { get; set; } = "";
    [Required] public string ProductDetails { get; set; } = "";

    public int Quantity { get; set; }
    [Required, MaxLength(50)] public string Unit { get; set; } = "";

    [Required, MaxLength(200)] public string DeliveryLocation { get; set; } = "";
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    [Required, MaxLength(50)] public string Status { get; set; } = "upcoming";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Required, MaxLength(256)] public string CreatedByEmail { get; set; } = "";
    [Required, MaxLength(256)] public string CreatedByCompany { get; set; } = "";

    public string? Notes { get; set; }

    public string? WinnerVendorEmail { get; set; }
    public string? WinnerVendorCompany { get; set; }
    public DateTimeOffset? AwardedAt { get; set; }
}
