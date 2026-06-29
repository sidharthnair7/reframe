package fileidea.reframe.usage;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "usage_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsageRecord {
    @Id
    private String id;

    @Indexed
    private String userId;
    private String periodKey;

    @Builder.Default
    private int brainDumpCount = 0;
    @Builder.Default
    private int voiceExchangeCount = 0;
    @Builder.Default
    private int voiceSpeakCount = 0;
}
