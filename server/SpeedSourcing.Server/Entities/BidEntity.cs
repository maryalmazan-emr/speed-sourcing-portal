// file: server/SpeedSourcing.Server/Entities/BidEntity.cs
using System.ComponentModel.DataAnnotations;

public class BidEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuctionId { get; set; }

    [Required, MaxLength(256)]
    public required string VendorEmail { get; set; }

    [Required, MaxLength(256)]
    public required string VendorCompany { get; set; }

    [Required, MaxLength(256)]
    public required string CompanyName { get; set; }

    [Required, MaxLength(256)]
    public required string ContactName { get; set; }

    [Required, MaxLength(50)]
    public required string ContactPhone { get; set; }

    public int DeliveryTimeDays { get; set; }      // ✅ int (days)
    public decimal CostPerUnit { get; set; }       // ✅ money
    public decimal TotalCost { get; set; }         // ✅ money

    public string Notes { get; set; } = "";

    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
}
