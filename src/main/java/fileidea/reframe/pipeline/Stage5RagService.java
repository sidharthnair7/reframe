package fileidea.reframe.pipeline;

import fileidea.reframe.graph.ActionPlan;
import fileidea.reframe.graph.IssueNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class Stage5RagService {
    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;
    private static final Map<String, String> FRAMEWORKS = Map.of(
            "ACTIONABLE", """
                Framework: GTD (Getting Things Done) — Capture & Clarify
                Core idea: Don't try to do the task yet. First capture every sub-step
                without judgment, then identify the single next physical action.
                Momentum comes from clarity, not motivation.
                """,
            "ANXIETY", """
                Framework: CBT Cognitive Defusion
                Core idea: Separate the fear from the fact. Ask: what is the worst
                realistic outcome, and what is one small action that reduces it by 10%?
                Anxiety shrinks when met with a concrete next step, not avoidance.
                """,
            "UNCLEAR", """
                Framework: Eisenhower Matrix — Clarify Before Acting
                Core idea: An unclear task usually hides a missing decision.
                Identify the one question that, if answered, would make this actionable.
                """
    );
    private static final String SYSTEM_PROMPT = """
        You are a calm, structured coach. Use ONLY the framework provided below
        as your grounding — do not invent advice outside of it.
 
        Return ONLY a valid JSON object. No markdown, no backticks, no explanation outside JSON.
        Format:
        {
          "framework": "<name of the framework used>",
          "steps": ["step 1", "step 2", "step 3"],
          "timeEstimate": "<rough total time, e.g. '2 hours total'>",
          "urgencyNote": "<one sentence on timing, reference the deadline/urgency given>"
        }
 
        Keep steps concrete and specific to the issue described — never generic.
        """;

    public List<IssueNode> generateActionPlans(List<IssueNode> scoredNodes) {
        List<IssueNode> topThree= scoredNodes.stream()
                .sorted(Comparator.comparingDouble(IssueNode::getPriorityScore).reversed())
                .limit(3)
                .toList();

        topThree.forEach(node -> {
            String retrievedFramework= FRAMEWORKS.getOrDefault(
                    node.getActionability(),FRAMEWORKS.get("UNCLEAR")
            );
            String systemPromptWithContext =
                    SYSTEM_PROMPT
                            + "\n\nFRAMEWORK CONTEXT:\n"
                            + retrievedFramework;

            String userMessage = String.format("""
                Issue: "%s"
                Category: %s
                Urgency: %d/10
                Hidden assumptions: %s
 
                Create a 3-step action plan for this specific issue.
                """,
                    node.getText(), node.getCategory(), node.getUrgency(),
                    node.getHiddenAssumptions() != null ? node.getHiddenAssumptions() : "none identified");

            try{
                String response = claudeClient.call(systemPromptWithContext,userMessage);
                ActionPlan plan =
                        objectMapper.readValue(
                                response,
                                ActionPlan.class
                        );
                node.setActionPlan(plan);
            }catch(Exception e){
                node.setActionPlan(ActionPlan.builder()
                        .framework("Unavailable")
                        .steps(List.of("Could not generate action plan — try again."))
                        .timeEstimate("Unknown")
                        .urgencyNote("")
                        .build());
            }
        });

        return scoredNodes;

    }
}
