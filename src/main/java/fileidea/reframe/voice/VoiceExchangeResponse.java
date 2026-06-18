package fileidea.reframe.voice;


import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceExchangeResponse {
    private String spokenResponse;
    private boolean readyToAnalyze;
    private String compiledText;
}