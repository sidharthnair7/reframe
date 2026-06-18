package fileidea.reframe.pipeline;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

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
        int newline = s.indexOf('\n');
        if (newline != -1) s = s.substring(newline + 1);
        if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        return s.strip();
    }
}
