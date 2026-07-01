package fileidea.reframe.user;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Document(collection = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class User implements UserDetails {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String displayName;
    private String country;

    // Email verification. Boolean (not primitive) on purpose: users created before this
    // feature existed have no such field in Mongo, so they deserialize to null -- which we
    // treat as "grandfathered / verified" so we never lock out existing accounts. New
    // registrations explicitly set this to false until they click the link.
    private Boolean emailVerified;
    private String verificationToken;
    private java.time.Instant verificationTokenExpiry;

    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private boolean premium = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getUsername() {
        return email;
    }
}
