using System.ComponentModel.DataAnnotations;

public class SupplierEntity
{
    [Key, MaxLength(256)] public string ContactEmail { get; set; } = "";
    [MaxLength(256)] public string? ContactName { get; set; }
    [Required, MaxLength(256)] public string CompanyName { get; set; } = "";
    public DateTimeOffset LastUsed { get; set; } = DateTimeOffset.UtcNow;
}
