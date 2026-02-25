// File: server/SpeedSourcing.Server/Services/SmtpEmailSender.cs
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;

    public SmtpEmailSender(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _config["Smtp:Host"];
        var portStr = _config["Smtp:Port"];
        var username = _config["Smtp:Username"];
        var password = _config["Smtp:Password"];
        var fromEmail = _config["Smtp:FromEmail"];
        var fromName = _config["Smtp:FromName"] ?? "Emerson Procurement Team";
        var enableSslStr = _config["Smtp:EnableSsl"];

        if (string.IsNullOrWhiteSpace(host))
            throw new InvalidOperationException("SMTP host missing: Smtp:Host");
        if (string.IsNullOrWhiteSpace(fromEmail))
            throw new InvalidOperationException("SMTP from email missing: Smtp:FromEmail");

        int port = 587;
        if (!string.IsNullOrWhiteSpace(portStr) && int.TryParse(portStr, out var parsedPort))
            port = parsedPort;

        bool enableSsl = true;
        if (!string.IsNullOrWhiteSpace(enableSslStr) && bool.TryParse(enableSslStr, out var parsedSsl))
            enableSsl = parsedSsl;

        using var msg = new MailMessage();
        msg.From = new MailAddress(fromEmail, fromName);
        msg.To.Add(new MailAddress(toEmail));
        msg.Subject = subject;
        msg.Body = htmlBody;
        msg.IsBodyHtml = true;

        using var client = new SmtpClient(host, port);
        client.EnableSsl = enableSsl;

        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }
        else
        {
            // Allows unauthenticated relay if your SMTP is configured that way
            client.UseDefaultCredentials = true;
        }

        await client.SendMailAsync(msg);
    }
}