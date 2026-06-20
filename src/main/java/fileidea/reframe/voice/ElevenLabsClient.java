package fileidea.reframe.voice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;

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
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                        .build())
                .build();
    }

    public byte[] synthesize(String text) {
        return webClient.post()
                .uri("/text-to-speech/{voiceId}", voiceId)
                .header("xi-api-key", apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(java.util.Map.of(
                        "text", text,
                        "model_id", "eleven_multilingual_v2",
                        "voice_settings", java.util.Map.of(
                                "stability",        0.35,   // lower = more expressive/emotional
                                "similarity_boost", 0.80,   // how closely it matches the original voice
                                "style",            0.45,   // style exaggeration — adds emotional colour
                                "use_speaker_boost", true   // enhanced clarity and presence
                        )
                ))
                .retrieve()
                .bodyToMono(byte[].class)
                .retryWhen(Retry.backoff(4, Duration.ofMillis(400)))
                .block();
    }
}
