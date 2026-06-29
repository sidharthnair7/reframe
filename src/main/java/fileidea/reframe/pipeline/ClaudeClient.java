package fileidea.reframe.pipeline;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ClaudeClient {

    private final WebClient claudeWebClient;
    private final ObjectMapper objectMapper;

    @Value("${claude.api.model}")
    private String model;

    public String call(String systemPrompt, String userMessage) {
        try {
            Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", 2000,
                "system", systemPrompt,
                "messages", List.of(Map.of("role", "user", "content", userMessage))
            );

            String responseBody = claudeWebClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(4, Duration.ofMillis(400)))
                    .block();

            JsonNode responseJson = objectMapper.readTree(responseBody);
            String raw = responseJson.path("content").get(0).path("text").asText();
            return stripMarkdown(raw);

        } catch (Exception e) {
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }
    }

    public String call(String userMessage) {
        return call("You are a helpful AI assistant.", userMessage);
    }

    private static String stripMarkdown(String text) {
        String s = text.strip();
        if (!s.startsWith("```")) return s;
        int firstNewline = s.indexOf('\n');
        if (firstNewline == -1) return s;
        String body = s.substring(firstNewline + 1);
        // Take only what's between the fences — models sometimes add trailing prose
        // after the closing ``` (e.g. a follow-up question), which isn't part of the JSON.
        int closingFence = body.indexOf("```");
        if (closingFence != -1) body = body.substring(0, closingFence);
        return body.strip();
    }
}
