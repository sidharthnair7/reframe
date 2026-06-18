package fileidea.reframe.voice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class ElevenLabsClient {

    private final WebClient webClient;

    @Value("${elevenlabs.api.key}")
    private String apiKey;

    @Value("${elevenlabs.voice.id}")
    private String voiceId;

    public ElevenLabsClient() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.elevenlabs.io/v1")
                .build();
    }

    public byte[] synthesize(String text) {
        return webClient.post()
                .uri("/text-to-speech/{voiceId}", voiceId)
                .header("xi-api-key", apiKey)
                .bodyValue(java.util.Map.of(
                        "text", text,
                        "model_id", "eleven_turbo_v2",
                        "voice_settings", java.util.Map.of(
                                "stability", 0.5,
                                "similarity_boost", 0.75
                        )
                ))
                .retrieve()
                .bodyToMono(byte[].class)
                .block();
    }
}
