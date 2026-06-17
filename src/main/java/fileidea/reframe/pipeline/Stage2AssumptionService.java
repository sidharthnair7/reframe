package fileidea.reframe.pipeline;

import fileidea.reframe.graph.IssueNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Service
@RequiredArgsConstructor
public class Stage2AssumptionService {

    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;
    private static final String SYSTEM_PROMPT = """
        You are a cognitive behavioral therapist and expert at surfacing hidden assumptions.
        
        Given a single issue or worry a person is carrying, identify 2-3 hidden assumptions
        they are making — things they IMPLIED but did not explicitly say.
        
        Focus on:
        - What are they afraid will happen if this isn't resolved?
        - What belief about themselves is embedded in this worry?
        - What relationship or external pressure are they not naming?
        - What deadline or constraint are they assuming without stating?
        
        Return ONLY a valid JSON array of strings. No explanation. No markdown. No backticks.
        Example: ["You're assuming you need to do this alone", "You believe missing this deadline defines your worth"]
        
        Keep each assumption to one clear, direct sentence.
        Write as if speaking gently directly to the person.
        """;

    public List<IssueNode> extractAssumptions(List<IssueNode> nodes) {
        return  nodes.stream().map(node->{
            try{
                String userMessage = "The person said: \"" + node.getText() + "\"\n" +
                        "Category: " + node.getCategory() + "\n" +
                        "This feels " + (node.getActionability().equals("ANXIETY") ? "like anxiety" : "like a task they're stuck on");
                String response= claudeClient.call(SYSTEM_PROMPT, userMessage);
                List<String>assumptions = objectMapper.readValue(response, new TypeReference<List<String>>() {});
                node.setHiddenAssumptions(assumptions);
                return node;
            }catch (Exception e) {

                node.setHiddenAssumptions(List.of("Could not extract assumptions for this item."));
                return node;
            }
        }).toList();
    }
}
