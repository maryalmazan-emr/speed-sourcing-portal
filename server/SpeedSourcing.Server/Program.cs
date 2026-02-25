// file: server/SpeedSourcing.Server/Program.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides; // ✅ ADD

var builder = WebApplication.CreateBuilder(args);

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// =======================
// ✅ Email sender (SMTP)
// =======================
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

// =======================
// Database mode switch
// =======================
var useInMemory = builder.Configuration.GetValue("UseInMemoryDatabase", true);
var sqlConn = builder.Configuration.GetConnectionString("Sql");

if (!useInMemory && string.IsNullOrWhiteSpace(sqlConn))
{
    useInMemory = true;
    builder.Logging.AddFilter("Microsoft", LogLevel.Warning);
    Console.WriteLine("[Program] UseInMemoryDatabase=false but ConnectionStrings:Sql is missing. Falling back to InMemory.");
}

// ✅ DbContext pooling for better performance under concurrent load
if (useInMemory)
{
    builder.Services.AddDbContextPool<AppDbContext>(opt =>
        opt.UseInMemoryDatabase("SpeedSourcingDb"));
}
else
{
    builder.Services.AddDbContextPool<AppDbContext>(opt =>
        opt.UseSqlServer(sqlConn));
}

// =======================
// SignalR (Local now, Azure later)
// =======================
var azureSignalRConn =
    builder.Configuration["Azure:SignalR:ConnectionString"] ??
    builder.Configuration["Azure__SignalR__ConnectionString"];

var signalR = builder.Services.AddSignalR();

if (!string.IsNullOrWhiteSpace(azureSignalRConn))
{
    signalR.AddAzureSignalR(options => options.ConnectionString = azureSignalRConn);
    Console.WriteLine("[Program] Azure SignalR enabled (connection string found).");
}
else
{
    Console.WriteLine("[Program] Azure SignalR not configured. Using local SignalR.");
}

// =======================
// CORS (Local dev only)
// =======================
const string DevCorsPolicy = "DevCorsPolicy";

builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, p =>
        p.AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
         .SetIsOriginAllowed(_ => true));
});

var app = builder.Build();

// =======================
// ✅ Forwarded headers (IMPORTANT for invite links)
// =======================
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost
});

// Swagger: enable for local/dev convenience
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseRouting();

// Apply CORS only in Development
if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

// =======================
// ✅ DEV-ONLY SEED DATA
// =======================
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (!db.Auctions.Any())
    {
        var adminId = Guid.NewGuid();
        var auctionId = Guid.NewGuid();

        var auction = new AuctionEntity
        {
            Id = auctionId,
            AdminId = adminId,
            Title = "DEV Seed Auction",
            Description = "Seeded auction for Swagger Try-it-out testing",
            ProductDetails = "DEV-ITEM-001",
            Quantity = 10,
            Unit = "EA",
            DeliveryLocation = "Marshalltown, IA",
            StartsAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            EndsAt = DateTimeOffset.UtcNow.AddHours(2),
            Status = "live",
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByEmail = "dev@emerson.com",
            CreatedByCompany = "Emerson",
            Notes = "This record is created automatically in Development only."
        };

        var inviteToken = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();

        var invite = new VendorInviteEntity
        {
            Id = Guid.NewGuid(),
            AuctionId = auctionId,
            VendorEmail = "supplier@example.com",
            VendorCompany = "Supplier Co",
            InviteToken = inviteToken,
            InviteSentAt = DateTimeOffset.UtcNow,
            InviteMethod = "seed",
            Status = "pending",
            AccessedAt = null
        };

        db.Auctions.Add(auction);
        db.VendorInvites.Add(invite);
        db.SaveChanges();

        Console.WriteLine($"[DEV SEED] AuctionId: {auctionId}");
        Console.WriteLine($"[DEV SEED] InviteToken: {inviteToken}");
        Console.WriteLine($"[DEV SEED] VendorEmail: supplier@example.com");
    }
}

app.MapControllers();
app.MapHub<AuctionHub>("/hubs/auction");

app.Run();
