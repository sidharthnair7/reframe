package fileidea.reframe.pipeline;



import fileidea.reframe.graph.EdgeType;
import fileidea.reframe.graph.GraphEdge;
import fileidea.reframe.graph.IssueNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class Stage3GraphService {
    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;
    private static final String SYSTEM_PROMPT = """
        You are an expert at identifying how problems relate to and block each other.
        
        Given a numbered list of issues a person is dealing with, identify dependency relationships between them.
        
        Relationship types:
        - BLOCKS: Issue A must be resolved before Issue B can be addressed
        - CAUSES: Issue A is the root cause or trigger of Issue B  
        - RELATED: Issues are connected but neither strictly blocks the other
        
        Return ONLY a valid JSON array. No explanation. No markdown. No backticks.
        Each object must have:
        {
          "fromIndex": <number, 0-based index of the source issue>,
          "toIndex": <number, 0-based index of the target issue>,
          "type": <"BLOCKS" | "CAUSES" | "RELATED">,
          "reason": <one short sentence explaining why this relationship exists>
        }
        
        Rules:
        - Only include relationships that are genuinely meaningful
        - Do not force connections — return empty array [] if issues are independent
        - Maximum 8 edges total to keep the graph readable
        """;

    public List<GraphEdge> buildGraph(List<IssueNode> savedNodes, String sessionId) {
        if (savedNodes.size() < 2) {
            return List.of();
        }
        StringBuilder issueList = new StringBuilder();
        for (int i = 0; i < savedNodes.size(); i++) {
            issueList.append(i).append(". ").append(savedNodes.get(i).getText()).append("\n");
        }
        String userMessage = "Here are the issues (0-indexed):\n\n" + issueList;
        String response = claudeClient.call(SYSTEM_PROMPT, userMessage);


        try {
            List<EdgeDto> edgeDtos = objectMapper.readValue(
                    response,
                    new TypeReference<List<EdgeDto>>() {
                    }
            );

            return edgeDtos.stream()
                    .filter(dto -> dto.fromIndex() < savedNodes.size()
                            && dto.toIndex() < savedNodes.size()
                            && dto.fromIndex() != dto.toIndex())
                    .map(dto -> GraphEdge.builder()
                            .sessionId(sessionId)
                            .fromNodeId(savedNodes.get(dto.fromIndex()).getId())
                            .toNodeId(savedNodes.get(dto.toIndex()).getId())
                            .type(EdgeType.valueOf(dto.type()))
                            .reason(dto.reason())
                            .build())
                    .toList();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private record EdgeDto(int fromIndex, int toIndex, String type, String reason) {}

}
