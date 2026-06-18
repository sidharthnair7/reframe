package fileidea.reframe.voice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceExchangeRequest {
    private String transcript;
    private List<ConversationTurn> history;
}
