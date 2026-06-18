package fileidea.reframe.voice;


import fileidea.reframe.pipeline.ClaudeClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;


import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoiceAgentService {

    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;
    private static final String SYSTEM_PROMPT = """
        You are a warm AI companion helping someone vent. Your ONLY job is to capture topics fast.

        STRICT FLOW — follow exactly:
        Turn 1 on a topic: acknowledge in ONE sentence + ask ONE practical clarifying question.
        Turn 2 on a topic: ALWAYS set topicComplete=true. Do NOT ask another question. You have enough.

        When topicComplete=true:
        - spokenResponse: one warm closing sentence ONLY, e.g. "Got it, I've noted that." Do NOT ask what else is on their mind.
        - topicText: 1-3 sentences summarizing what the user said, written in first person.

        NEVER:
        - Ask more than ONE follow-up question on any topic
        - Ask deep emotional questions ("how does that feel?", "what does that feel like in your body?")
        - Wait for perfect information — a rough summary is always fine

        Return ONLY valid JSON, no markdown, no backticks:
        {
          "spokenResponse": "...",
          "topicComplete": <true or false>,
          "topicText": "<only when topicComplete=true>"
        }
        """;

    public VoiceExchangeResponse exchange(VoiceExchangeRequest request) {
        String conversationContext = request.getHistory() != null
                ? request.getHistory().stream()
                        .map(turn -> turn.getRole() + ": " + turn.getContent())
                        .collect(Collectors.joining("\n"))
                : "";

        String userMessage = conversationContext.isEmpty()
                ? "The user just said: \"" + request.getTranscript() + "\""
                : "Conversation so far:\n" + conversationContext +
                  "\n\nThe user just said: \"" + request.getTranscript() + "\"";

        String response = claudeClient.call(SYSTEM_PROMPT, userMessage);

        try {
            ExchangeDto dto = objectMapper.readValue(response, ExchangeDto.class);
            return VoiceExchangeResponse.builder()
                    .spokenResponse(dto.spokenResponse())
                    .topicComplete(dto.topicComplete())
                    .topicText(dto.topicText())
                    .build();
        } catch (Exception e) {
            return VoiceExchangeResponse.builder()
                    .spokenResponse("Sorry, could you say that again?")
                    .topicComplete(false)
                    .build();
        }
    }

    private record ExchangeDto(String spokenResponse, boolean topicComplete, String topicText) {}

}