package fileidea.reframe.pipeline;

import fileidea.reframe.graph.EdgeType;
import fileidea.reframe.graph.GraphEdge;
import fileidea.reframe.graph.IssueNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class Stage4ScoringService {

    private final ClaudeClient claudeClient;
    private static final String SYSTEM_PROMPT = """
        You are a calm, honest decision coach.
        You will be given an issue along with a calculated priority score and confidence level.
        Explain in exactly 2 sentences why this issue deserves this priority.
        Be honest about uncertainty — do not oversell confidence.
        Return ONLY plain text. No markdown, no JSON, no preamble.
        """;


    public List<IssueNode> scoreNodes(List<IssueNode> nodes, List<GraphEdge> edges) {
        Map<String,Long> blockCounts= edges.stream()
                .filter(e->e.getType()== EdgeType.BLOCKS)
                .collect(Collectors.groupingBy(GraphEdge::getFromNodeId, Collectors.counting()));


        return nodes.stream().map(node->{
            double impactScore= (node.getUrgency()*0.4)+(node.getCognitiveWeight()*0.6);

            double feasibilityScore = switch (node.getActionability()) {
                case "ACTIONABLE" -> 0.8;
                case "ANXIETY" -> 0.3;
                default -> 0.5;
            };
            long blocksCount = blockCounts.getOrDefault(node.getId(), 0L);
            double graphBonus = blocksCount >= 2 ? 1.5 : 1.0;

            double rawScore = impactScore * feasibilityScore *graphBonus*10;
            int assumptionCount = node.getHiddenAssumptions()!=null?node.getHiddenAssumptions().size():0;

            double confidenceInterval = assumptionCount > 2 ? 0.15 : 0.08;

            node.setPriorityScore(Math.round(rawScore * 10.0) / 10.0);
            node.setConfidenceInterval(confidenceInterval);
            //for the dashboard full stats
            String userMessage = String.format("""    
                Issue: "%s"
                Priority score: %.1f out of 100
                Confidence: ±%.0f%%
                Blocks %d other issue(s).
                Category: %s
                """,
                    node.getText(), node.getPriorityScore(),
                    confidenceInterval * 100, blocksCount, node.getCategory());

            String reasoning = claudeClient.call(SYSTEM_PROMPT, userMessage);
            node.setPriorityReasoning(reasoning.trim());

            return node;
        }).toList();

    }
}
