using System.ComponentModel.DataAnnotations;

public class BidEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuctionId { get; set; }

    [Required, MaxLength(256)] public string VendorEmail { get; set; } = "";
    [Required, MaxLength(256)] public string VendorCompany { get; set; } = "";

    [Required, MaxLength(256)] public string CompanyName { get; set; } = "";
    [Required, MaxLength(256)] public string ContactName { get; set; } = "";
    [Required, MaxLength(50)] public string ContactPhone { get; set; } = "";

    public decimal DeliveryTimeDays { get; set; }
    public decimal CostPerUnit { get; set; }
    public decimal TotalCost { get; set; }

    public string Notes { get; set; } = "";
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
}
