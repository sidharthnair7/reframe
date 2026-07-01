package fileidea.reframe.braindump;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BrainDumpRequest {

    @NotBlank(message = "Brain dump cannot be empty.")
    @Size(min = 5, max = 50000, message = "Brain dump must be between 5 and 50,000 characters.")
    String rawText;

    @Pattern(regexp = "^[a-zA-Z0-9-]{0,100}$", message = "Invalid session ID format.")
    String sessionId;

}
