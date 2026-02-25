// File: server/SpeedSourcing.Server/Entities/SupplierEntity.cs
using System.ComponentModel.DataAnnotations;

public class SupplierEntity
{
    [Key, MaxLength(256)]
    public required string ContactEmail { get; set; }

    [MaxLength(256)]
    public string? ContactName { get; set; }

    [Required, MaxLength(256)]
    public required string CompanyName { get; set; }

    public DateTimeOffset LastUsed { get; set; } = DateTimeOffset.UtcNow;
}