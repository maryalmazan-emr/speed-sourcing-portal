using System.ComponentModel.DataAnnotations;

public class AuctionEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AdminId { get; set; }

    [Required, MaxLength(200)]
    public required string Title { get; set; }

    [Required]
    public required string Description { get; set; }

    [Required]
    public required string ProductDetails { get; set; }

    public int Quantity { get; set; }

    [Required, MaxLength(50)]
    public required string Unit { get; set; }

    [Required, MaxLength(200)]
    public required string DeliveryLocation { get; set; }

    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    [Required, MaxLength(50)]
    public required string Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Required, MaxLength(256)]
    public required string CreatedByEmail { get; set; }

    [Required, MaxLength(256)]
    public required string CreatedByCompany { get; set; }

    public string? Notes { get; set; }

    public string? WinnerVendorEmail { get; set; }
    public string? WinnerVendorCompany { get; set; }
    public DateTimeOffset? AwardedAt { get; set; }
}
