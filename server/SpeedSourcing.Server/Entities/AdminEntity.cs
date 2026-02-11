using System.ComponentModel.DataAnnotations;

public class AdminEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(256)] public string Email { get; set; } = "";
    [Required, MaxLength(512)] public string PasswordHash { get; set; } = "";
    [Required, MaxLength(256)] public string CompanyName { get; set; } = "";
    [Required, MaxLength(50)] public string Role { get; set; } = "internal_user";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
