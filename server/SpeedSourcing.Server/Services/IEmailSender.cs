// File: server/SpeedSourcing.Server/Services/IEmailSender.cs
using System.Threading.Tasks;   

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}