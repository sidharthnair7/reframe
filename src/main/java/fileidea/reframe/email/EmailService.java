package fileidea.reframe.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Sends transactional email via Resend's REST API (https://resend.com/docs/api-reference).
 *
 * Deliberately dependency-free (java.net.http, no SDK) to match the lightweight HTTP style
 * already used elsewhere. If RESEND_API_KEY is blank -- e.g. local dev before an account is
 * set up -- it logs the message body instead of failing, so the verification flow is fully
 * testable locally by copying the link out of the logs.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${resend.api.key:}")
    private String resendApiKey;

    @Value("${resend.from.email:onboarding@resend.dev}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String displayName, String verificationLink) {
        String subject = "Verify your Reframe account";
        String greeting = (displayName != null && !displayName.isBlank())
                ? "Hi " + displayName + ","
                : "Hi,";
        String html = """
                <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
                  <h2 style="font-weight: 600;">Welcome to Reframe</h2>
                  <p>%s</p>
                  <p>Confirm your email to activate your account and start turning the noise in your head into a clear next move.</p>
                  <p style="margin: 28px 0;">
                    <a href="%s" style="background: #111; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; display: inline-block;">Verify my email</a>
                  </p>
                  <p style="color: #666; font-size: 13px;">Or paste this link into your browser:<br>%s</p>
                  <p style="color: #999; font-size: 12px; margin-top: 28px;">This link expires in 24 hours. If you didn't create a Reframe account, you can ignore this email.</p>
                </div>
                """.formatted(greeting, verificationLink, verificationLink);

        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("RESEND_API_KEY not set -- skipping real email send. "
                    + "Verification link for {}: {}", toEmail, verificationLink);
            return;
        }

        String payload = "{"
                + "\"from\":\"Reframe <" + fromEmail + ">\","
                + "\"to\":[\"" + escapeJson(toEmail) + "\"],"
                + "\"subject\":\"" + escapeJson(subject) + "\","
                + "\"html\":\"" + escapeJson(html) + "\""
                + "}";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                log.error("Resend returned {} sending verification email to {}: {}",
                        res.statusCode(), toEmail, res.body());
            } else {
                log.info("Verification email sent to {}", toEmail);
            }
        } catch (Exception e) {
            // Don't fail registration if the email provider hiccups -- the user can request a resend.
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
