package fileidea.reframe.pipeline;

import fileidea.reframe.graph.IssueNode;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
@RequiredArgsConstructor
public class Stage1TriageService {

    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;


    private static final String SYSTEM_PROMPT = """
        You are an expert at emotional and cognitive triage.
        Your job is to extract every distinct issue, worry, task, or anxiety
        from a raw brain dump and classify each one.
        
        Return ONLY a valid JSON array. No explanation. No markdown. No backticks.
        Each object must have exactly these fields:
        {
          "text": "the issue in the user's own words, condensed",
          "urgency": <number 1-10, how time-sensitive>,
          "cognitiveWeight": <number 1-10, how much mental space it takes>,
          "actionability": <"ACTIONABLE" | "ANXIETY" | "UNCLEAR">,
          "category": <"ACADEMIC" | "FINANCIAL" | "SOCIAL" | "CAREER" | "HEALTH" | "PERSONAL">
        }
        
        Rules:
        - Split compound issues into separate objects
        - "ACTIONABLE" = something concrete can be done right now
        - "ANXIETY" = a fear or worry with no clear action yet
        - "UNCLEAR" = needs more information before acting
        - Be generous — extract everything, even small things
        """;

    public List<IssueNode> triage(String rawBrainDump, String sessionId, String userId) {
        String userMessage = "Here is the brain dump to triage:\n\n" + rawBrainDump;

        String response = claudeClient.call(SYSTEM_PROMPT, userMessage);

        try {
            List<IssueNodeDto> dtos = objectMapper.readValue(
                    response,
                    new TypeReference<List<IssueNodeDto>>() {}
            );


            return dtos.stream()
                    .map(dto -> IssueNode.builder()
                            .sessionId(sessionId)
                            .userId(userId)
                            .text(dto.text())
                            .urgency(dto.urgency())
                            .cognitiveWeight(dto.cognitiveWeight())
                            .actionability(dto.actionability())
                            .category(dto.category())
                            .build())
                    .toList();

        } catch (Exception e) {
            throw new RuntimeException("Stage 1 parsing failed: " + e.getMessage(), e);
        }
    }

    private record IssueNodeDto(
            String text,
            int urgency,
            int cognitiveWeight,
            String actionability,
            String category
    ) {}
}



