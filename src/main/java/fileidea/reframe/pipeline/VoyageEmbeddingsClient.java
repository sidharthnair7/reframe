package fileidea.reframe.pipeline;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class VoyageEmbeddingsClient {
    private static final Logger log = LoggerFactory.getLogger(VoyageEmbeddingsClient.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${voyage.api.key}")
    private String apiKey;

    public VoyageEmbeddingsClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl("https://api.voyageai.com/v1")
                .build();
    }

    public List<float[]> embed(List<String> texts) {
        try {
            String responseBody = webClient.post()
                    .uri("/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of("input", texts, "model", "voyage-3-lite"))
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(4, Duration.ofMillis(400))
                            .doBeforeRetry(sig -> {
                                Throwable f = sig.failure();
                                if (f instanceof WebClientResponseException wcre) {
                                    log.warn("Voyage attempt {} failed: HTTP {} body={}",
                                            sig.totalRetries() + 1, wcre.getStatusCode(), wcre.getResponseBodyAsString());
                                } else {
                                    log.warn("Voyage attempt {} failed: {}: {}",
                                            sig.totalRetries() + 1, f.getClass().getSimpleName(), f.getMessage());
                                }
                            }))
                    .block();

            JsonNode dataArray = objectMapper.readTree(responseBody).path("data");
            List<float[]> result = new ArrayList<>();
            dataArray.forEach(item -> {
                JsonNode vec = item.path("embedding");
                float[] arr = new float[vec.size()];
                for (int i = 0; i < vec.size(); i++) arr[i] = (float) vec.get(i).asDouble();
                result.add(arr);
            });
            return result;
        } catch (WebClientResponseException e) {
            log.error("Voyage API rejected request: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Voyage embeddings call failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof WebClientResponseException wcre) {
                log.error("Voyage API rejected request after retries: status={} body={}", wcre.getStatusCode(), wcre.getResponseBodyAsString());
                throw new RuntimeException("Voyage embeddings call failed: " + wcre.getStatusCode() + " " + wcre.getResponseBodyAsString(), e);
            }
            throw new RuntimeException("Voyage embeddings call failed: " + e.getMessage(), e);
        }
    }
}
