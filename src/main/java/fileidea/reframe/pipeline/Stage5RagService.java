package fileidea.reframe.pipeline;

import fileidea.reframe.graph.ActionPlan;
import fileidea.reframe.graph.IssueNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class Stage5RagService {
    private static final Logger log = LoggerFactory.getLogger(Stage5RagService.class);

    private final ClaudeClient claudeClient;
    private final VoyageEmbeddingsClient embeddingsClient;
    private final ObjectMapper objectMapper;

    private List<float[]> corpusEmbeddings;

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

    private synchronized List<float[]> getCorpusEmbeddings() {
        if (corpusEmbeddings == null) {
            List<String> texts = FrameworkCorpus.DOCUMENTS.stream()
                    .map(FrameworkCorpus.Framework::text)
                    .toList();
            corpusEmbeddings = embeddingsClient.embed(texts);
        }
        return corpusEmbeddings;
    }

    private static double cosineSimilarity(float[] a, float[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private static String queryTextFor(IssueNode node) {
        String assumptions = node.getHiddenAssumptions() != null
                ? String.join(". ", node.getHiddenAssumptions())
                : "";
        return node.getText() + ". " + assumptions;
    }

    /** One batched embeddings call for all queries, to stay well under provider rate limits. */
    private List<FrameworkCorpus.Framework> retrieveFrameworksBatch(List<IssueNode> nodes) {
        List<float[]> corpus = getCorpusEmbeddings();
        List<String> queries = nodes.stream().map(Stage5RagService::queryTextFor).toList();
        List<float[]> queryVecs = embeddingsClient.embed(queries);

        List<FrameworkCorpus.Framework> results = new ArrayList<>();
        for (float[] queryVec : queryVecs) {
            int bestIdx = 0;
            double bestScore = -Double.MAX_VALUE;
            for (int i = 0; i < corpus.size(); i++) {
                double score = cosineSimilarity(queryVec, corpus.get(i));
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            }
            results.add(FrameworkCorpus.DOCUMENTS.get(bestIdx));
        }
        return results;
    }

    public List<IssueNode> generateActionPlans(List<IssueNode> scoredNodes) {
        List<IssueNode> topThree = scoredNodes.stream()
                .sorted(Comparator.comparingDouble(IssueNode::getPriorityScore).reversed())
                .limit(3)
                .toList();

        List<FrameworkCorpus.Framework> retrievedFrameworks = null;
        try {
            retrievedFrameworks = retrieveFrameworksBatch(topThree);
        } catch (Exception e) {
            log.error("Batch framework retrieval failed for top issues: {}", e.toString(), e);
        }

        for (int i = 0; i < topThree.size(); i++) {
            IssueNode node = topThree.get(i);
            try {
                if (retrievedFrameworks == null) {
                    throw new RuntimeException("Framework retrieval unavailable");
                }
                FrameworkCorpus.Framework retrieved = retrievedFrameworks.get(i);
                String systemPromptWithContext = SYSTEM_PROMPT
                        + "\n\nFRAMEWORK CONTEXT:\n" + retrieved.text();

                String userMessage = String.format("""
                    Issue: "%s"
                    Category: %s
                    Urgency: %d/10
                    Hidden assumptions: %s

                    Create a 3-step action plan for this specific issue.
                    """,
                        node.getText(), node.getCategory(), node.getUrgency(),
                        node.getHiddenAssumptions() != null ? node.getHiddenAssumptions() : "none identified");

                String response = claudeClient.call(systemPromptWithContext, userMessage);
                ActionPlan plan = objectMapper.readValue(response, ActionPlan.class);
                node.setActionPlan(plan);
            } catch (Exception e) {
                log.error("generateActionPlans failed for issue '{}': {}", node.getText(), e.toString(), e);
                node.setActionPlan(ActionPlan.builder()
                        .framework("Unavailable")
                        .steps(List.of("Could not generate action plan — try again."))
                        .timeEstimate("Unknown")
                        .urgencyNote("")
                        .build());
            }
        }

        return scoredNodes;
    }
}
