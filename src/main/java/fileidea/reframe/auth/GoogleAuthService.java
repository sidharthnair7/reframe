package fileidea.reframe.auth;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import fileidea.reframe.config.JwtService;
import fileidea.reframe.user.Role;
import fileidea.reframe.user.User;
import fileidea.reframe.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

/**
 * "Sign in with Google". The frontend obtains a Google ID token (JWT) via Google Identity
 * Services and posts it here. We validate it against Google's tokeninfo endpoint -- which checks
 * the signature, issuer, and expiry for us -- then confirm the audience matches our own OAuth
 * client ID before trusting any claim. On success we find-or-create the user and mint our own
 * app JWT, so the rest of the app is identical whether the user signed in with Google or a password.
 *
 * Deliberately dependency-free (java.net.http, no google-api-client SDK), matching EmailService.
 * The tokeninfo round-trip is fine at this app's scale; a local JWKS verifier is the optimization
 * for high request volume, not a correctness requirement.
 */
@Service
public class GoogleAuthService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${google.oauth.client-id:}")
    private String googleClientId;

    public GoogleAuthService(UserRepository userRepository, JwtService jwtService,
                             PasswordEncoder passwordEncoder, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    public AuthenticationResponse loginWithGoogle(String credential) throws Exception {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new Exception("Google sign-in isn't configured on this server.");
        }
        if (credential == null || credential.isBlank()) {
            throw new Exception("Missing Google credential.");
        }

        JsonNode claims = verifyToken(credential);

        // Trust nothing until the audience proves this token was minted for OUR app.
        String aud = claims.path("aud").asText("");
        if (!googleClientId.equals(aud)) {
            throw new Exception("This Google token was not issued for Reframe.");
        }
        // tokeninfo returns email_verified as the string "true"/"false".
        if (!"true".equals(claims.path("email_verified").asText(""))) {
            throw new Exception("Your Google account email is not verified.");
        }

        String email = claims.path("email").asText("");
        if (email.isBlank()) {
            throw new Exception("Google did not return an email address.");
        }
        String name = claims.path("name").asText("");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            // First time in via Google -> create a verified account with a random, unusable password.
            User created = User.builder()
                    .email(email)
                    .displayName(name != null && !name.isBlank() ? name : email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.USER)
                    .emailVerified(true)
                    .build();
            return userRepository.save(created);
        });

        // An existing password account signing in with the same Google email is now proven to own
        // that inbox -> mark verified so a mid-signup user isn't stuck behind the email gate.
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user.setVerificationToken(null);
            user.setVerificationTokenExpiry(null);
            userRepository.save(user);
        }

        return AuthenticationResponse.builder()
                .token(jwtService.generateToken(user))
                .build();
    }

    private JsonNode verifyToken(String idToken) throws Exception {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token="
                + URLEncoder.encode(idToken, StandardCharsets.UTF_8);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            // Non-200 means Google rejected the token (bad signature, expired, malformed).
            throw new Exception("Google rejected the sign-in token. Please try again.");
        }
        return objectMapper.readTree(res.body());
    }
}
