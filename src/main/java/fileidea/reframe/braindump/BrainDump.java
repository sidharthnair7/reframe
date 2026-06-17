package fileidea.reframe.braindump;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrainDump {
    @Id
    private String id;

    private String userId;
    private String sessionId;
    private String rawText;
    private String status;
    private String summary;
    private LocalDateTime createdAt;
}
