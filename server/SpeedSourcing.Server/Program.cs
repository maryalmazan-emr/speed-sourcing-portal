using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// =======================
// Database mode switch
// =======================
// Local-first: default to InMemory unless explicitly configured otherwise.
// For Azure SQL later: set UseInMemoryDatabase=false and provide ConnectionStrings:Sql.
var useInMemory = builder.Configuration.GetValue("UseInMemoryDatabase", true);
var sqlConn = builder.Configuration.GetConnectionString("Sql");

// If someone disabled InMemory but forgot to configure SQL connection string, fall back safely.
if (!useInMemory && string.IsNullOrWhiteSpace(sqlConn))
{
    useInMemory = true;
    builder.Logging.AddFilter("Microsoft", LogLevel.Warning);
    Console.WriteLine("[Program] UseInMemoryDatabase=false but ConnectionStrings:Sql is missing. Falling back to InMemory.");
}

if (useInMemory)
{
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseInMemoryDatabase("SpeedSourcingDb"));
}
else
{
    // Requires package: Microsoft.EntityFrameworkCore.SqlServer
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseSqlServer(sqlConn));
}

// =======================
// SignalR (Local now, Azure later)
// =======================
// Local dev uses normal SignalR.
// When Azure SignalR is configured, we automatically switch to Azure SignalR backplane.
//
// Microsoft Learn: You can configure connection string via environment variable
// Azure:SignalR:ConnectionString or Azure__SignalR__ConnectionString, and in App Service
// you put it in application settings. [1](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-use)
var azureSignalRConn =
    builder.Configuration["Azure:SignalR:ConnectionString"] ??
    builder.Configuration["Azure__SignalR__ConnectionString"];

var signalR = builder.Services.AddSignalR();

if (!string.IsNullOrWhiteSpace(azureSignalRConn))
{
    // Requires package: Microsoft.Azure.SignalR
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
// Vite dev server is cross-origin (localhost:5173 etc).
// In production (Azure), prefer same-origin (host client+server together) so CORS isn’t needed.
//
// SignalR browser clients need CORS configured properly when cross-origin.
// Keep this permissive for local development only; tighten later. 
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

app.MapControllers();
app.MapHub<AuctionHub>("/hubs/auction");

app.Run();
