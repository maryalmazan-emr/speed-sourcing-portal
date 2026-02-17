using System.ComponentModel.DataAnnotations;

public class AdminEntity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(256)]
    public required string Email { get; set; }

    [Required, MaxLength(512)]
    public required string PasswordHash { get; set; }

    [Required, MaxLength(256)]
    public required string CompanyName { get; set; }

    [Required, MaxLength(50)]
    public required string Role { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}