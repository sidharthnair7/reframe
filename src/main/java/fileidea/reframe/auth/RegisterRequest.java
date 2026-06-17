package fileidea.reframe.auth;


import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {

    private String firstName;
    private String lastName;
    @Email(message = "Please provide a valid email address")
    @NotBlank(message = "Email is required")
    private String email;

    @Size(min=8, message= "Password must be at least 8 character")
    @Pattern(regexp = ".*[A-Z].*", message = "Must contain uppercase letter")
    @Pattern(regexp = ".*[0-9].*", message = "Must contain a number")
    @Pattern(regexp = ".*[^A-Za-z0-9].*",message = "Must contain a special character")
    private String password;
}
