using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AdminEntity> Admins => Set<AdminEntity>();
    public DbSet<AuctionEntity> Auctions => Set<AuctionEntity>();
    public DbSet<VendorInviteEntity> VendorInvites => Set<VendorInviteEntity>();
    public DbSet<BidEntity> Bids => Set<BidEntity>();
    public DbSet<SupplierEntity> Suppliers => Set<SupplierEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminEntity>().HasIndex(x => x.Email).IsUnique();

        modelBuilder.Entity<VendorInviteEntity>().HasIndex(x => x.InviteToken).IsUnique();
        modelBuilder.Entity<VendorInviteEntity>()
            .HasIndex(x => new { x.AuctionId, x.VendorEmail }).IsUnique();

        modelBuilder.Entity<BidEntity>()
            .HasIndex(x => new { x.AuctionId, x.VendorEmail }).IsUnique();

        modelBuilder.Entity<SupplierEntity>().HasKey(x => x.ContactEmail);
    }
}
