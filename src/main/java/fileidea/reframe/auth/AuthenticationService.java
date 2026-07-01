package fileidea.reframe.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import fileidea.reframe.config.JwtService;
import fileidea.reframe.email.EmailService;
import fileidea.reframe.user.Role;
import fileidea.reframe.user.User;
import fileidea.reframe.user.UserRepository;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthenticationService {


    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    public AuthenticationService(PasswordEncoder passwordEncoder, UserRepository userRepository, JwtService jwtService, AuthenticationManager authenticationManager, EmailService emailService) {
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
    }

    public AuthenticationResponse register(RegisterRequest request) throws Exception{
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new Exception("Email already registered. Please log in instead.");
        }

        String displayName = (request.getFirstName() != null ? request.getFirstName() : "")
                + (request.getLastName() != null ? " " + request.getLastName() : "");

        String token = UUID.randomUUID().toString();
        var user= User.builder()
                .displayName(displayName.trim())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .country(request.getCountry())
                .role(Role.USER)
                .emailVerified(false)
                .verificationToken(token)
                .verificationTokenExpiry(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();
        userRepository.save(user);

        sendVerification(user);

        // No JWT here on purpose -- the account can't sign in until the email is verified.
        return AuthenticationResponse.builder()
                .message("Almost there. We sent a verification link to " + user.getEmail()
                        + ". Click it to activate your account, then sign in.")
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) throws Exception{
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getEmail()
                , request.getPassword()));
        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();

        // null = legacy account created before verification existed -> allowed. Explicit false = must verify.
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new Exception("Please verify your email first. Check your inbox for the link — or request a new one.");
        }

        var jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .build();

    }

    /**
     * Confirms a verification token. Returns true on success. Idempotent-ish: an already-verified
     * user whose token was cleared simply won't be found, which the controller treats as "invalid."
     */
    public boolean verifyEmail(String token) {
        if (token == null || token.isBlank()) return false;
        var maybeUser = userRepository.findByVerificationToken(token);
        if (maybeUser.isEmpty()) return false;

        var user = maybeUser.get();
        if (user.getVerificationTokenExpiry() != null
                && user.getVerificationTokenExpiry().isBefore(Instant.now())) {
            return false;
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);
        return true;
    }

    /**
     * Reissues a verification link. Always behaves the same regardless of whether the email exists
     * or is already verified, so it can't be used to enumerate accounts.
     */
    public void resendVerification(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (Boolean.FALSE.equals(user.getEmailVerified())) {
                user.setVerificationToken(UUID.randomUUID().toString());
                user.setVerificationTokenExpiry(Instant.now().plus(24, ChronoUnit.HOURS));
                userRepository.save(user);
                sendVerification(user);
            }
        });
    }

    private void sendVerification(User user) {
        String link = backendUrl + "/api/v1/auth/verify?token="
                + URLEncoder.encode(user.getVerificationToken(), StandardCharsets.UTF_8);
        emailService.sendVerificationEmail(user.getEmail(), user.getDisplayName(), link);
    }
}
