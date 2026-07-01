package fileidea.reframe.auth;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private String token;
    // Set (with a null token) when registration succeeds but the account still needs
    // email verification before it can sign in.
    private String message;
}
