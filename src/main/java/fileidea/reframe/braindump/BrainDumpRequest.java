package fileidea.reframe.braindump;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BrainDumpRequest {
    String rawText;
    String sessionId;

}
