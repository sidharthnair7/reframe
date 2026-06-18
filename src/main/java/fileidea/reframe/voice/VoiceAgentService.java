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
        You are a calm, warm AI companion helping someone who feels overwhelmed.
        The user is talking out loud about what's on their mind.

        Your job in this exchange:
        1. Briefly acknowledge what they just said with genuine warmth — one sentence max
        2. Ask ONE clarifying follow-up question to understand their situation better
        3. Do NOT give advice yet — you are only listening and gathering context

        After 2-3 exchanges, once you have enough detail about their main stressors,
        respond instead with a closing line like "I think I have a good picture now — let's break this down,"
        and set readyToAnalyze to true.

        Return ONLY valid JSON, no markdown, no backticks:
        {
          "spokenResponse": "what you say out loud to the user",
          "readyToAnalyze": <true or false>
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

        String response= claudeClient.call(SYSTEM_PROMPT, userMessage);

        try {
            ExchangeDto   exchangeDto = objectMapper.readValue(response, ExchangeDto.class);

            String compiledText = exchangeDto.readyToAnalyze()
                    ? buildCompiledText(request)
                    : null;

            return VoiceExchangeResponse.builder()
                    .spokenResponse(exchangeDto.spokenResponse())
                    .readyToAnalyze(exchangeDto.readyToAnalyze())
                    .compiledText(compiledText)
                    .build();
        } catch (Exception e) {
            return VoiceExchangeResponse.builder()
                    .spokenResponse("Sorry, can you say that again?")
                    .readyToAnalyze(false)
                    .build();
        }

    }
    private String buildCompiledText(VoiceExchangeRequest request) {
        StringBuilder sb = new StringBuilder();
        if (request.getHistory() != null) {
            request.getHistory().stream()
                    .filter(t -> t.getRole().equals("user"))
                    .forEach(t -> sb.append(t.getContent()).append(". "));
        }
        sb.append(request.getTranscript());
        return sb.toString();
    }



    private record ExchangeDto(String spokenResponse, boolean readyToAnalyze) {}

}