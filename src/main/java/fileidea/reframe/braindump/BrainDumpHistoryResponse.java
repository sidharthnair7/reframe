package fileidea.reframe.braindump;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrainDumpHistoryResponse {
    private String sessionId;
    private String status;
    private String rawText;
    private LocalDateTime createdAt;
    private int issueCount;
}
