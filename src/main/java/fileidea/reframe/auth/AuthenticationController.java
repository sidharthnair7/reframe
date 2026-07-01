package fileidea.reframe.auth;


import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {


    private final AuthenticationService service;
    private final GoogleAuthService googleAuthService;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> registerUser( @RequestBody RegisterRequest request) throws Exception{
      return ResponseEntity.ok( service.register(request));

    }

    @PostMapping("/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) throws Exception{
        return ResponseEntity.ok( service.authenticate(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> google(@RequestBody Map<String, String> body) throws Exception {
        return ResponseEntity.ok(googleAuthService.loginWithGoogle(body.get("credential")));
    }

    /**
     * Clicked from the verification email. Redirects back to the frontend with a status flag so
     * the SPA can show a friendly message. FRONTEND_URL may be a comma-separated CORS list; the
     * first entry is the canonical site to redirect a human to.
     */
    @GetMapping("/verify")
    public RedirectView verify(@RequestParam String token) {
        boolean ok = service.verifyEmail(token);
        String base = frontendUrl.split(",")[0].trim();
        return new RedirectView(base + "/?verified=" + (ok ? "1" : "0"));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email != null && !email.isBlank()) {
            service.resendVerification(email);
        }
        // Always the same response -- never reveal whether the account exists or is already verified.
        return ResponseEntity.status(HttpStatus.OK).body(Map.of(
                "message", "If that email needs verifying, a new link is on its way."
        ));
    }
}
