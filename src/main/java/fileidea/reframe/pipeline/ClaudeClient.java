package fileidea.reframe.pipeline;


import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class ClaudeClient {


    private final WebClient claudeWebClient;
    private final ObjectMapper objectMapper;

    @Value("${claude.api.model}")
    private String model;

    public String call(String systemPrompt,String userMessage) {
        try {
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", model);
            requestBody.put("max_tokens", 2000);
            requestBody.put("system", systemPrompt);

            ArrayNode messages = objectMapper.createArrayNode();
            ObjectNode userMsg = objectMapper.createObjectNode();

            userMsg.put("role", "user");
            userMsg.put("content", userMessage);
            messages.add(userMsg);
            requestBody.set("messages", messages);

            String responseBody = claudeWebClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode responseJson = objectMapper.readTree(responseBody);
            return responseJson
                    .path("content")
                    .get(0)
                    .path("text")
                    .asText();


        } catch (Exception e) {
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }

    }
    public String call(String userMessage) {
        return call("You are a helpful AI assistant.", userMessage);
    }


}