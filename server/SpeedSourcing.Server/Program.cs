using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// === Database mode switch ===
// Use InMemory by default for local dev unless connection string provided.
var useInMemory = builder.Configuration.GetValue("UseInMemoryDatabase", true);

if (useInMemory)
{
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseInMemoryDatabase("SpeedSourcingDb"));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseSqlServer(builder.Configuration.GetConnectionString("Sql")));
}

// SignalR (local)
builder.Services.AddSignalR();

// Dev CORS so Vite can call API + use SignalR
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
        .SetIsOriginAllowed(_ => true)); // Later we will tighten
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();

app.MapControllers();
app.MapHub<AuctionHub>("/hubs/auction");

app.Run();
``