package fileidea.reframe.braindump;

import fileidea.reframe.graph.GraphEdge;
import fileidea.reframe.graph.GraphEdgeRepository;
import fileidea.reframe.graph.IssueNode;
import fileidea.reframe.graph.IssueNodeRepository;
import fileidea.reframe.pipeline.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrainDumpService {


    private final BrainDumpRepository brainDumpRepository;
    private final IssueNodeRepository issueNodeRepository;
    private final GraphEdgeRepository graphEdgeRepository;

    private final Stage1TriageService stage1;
    private final Stage2AssumptionService stage2;
    private final Stage3GraphService stage3;
    private final Stage4ScoringService stage4;
    private final Stage5RagService stage5;

    public BrainDump findBySessionId(String sessionId) {
        return brainDumpRepository.findBySessionId(sessionId).orElse(null);
    }

    public void create(String sessionId, String rawText) {
        BrainDump brainDump = BrainDump.builder()
                .sessionId(sessionId)
                .rawText(rawText)
                .build();
        brainDumpRepository.save(brainDump);
    }

    public BrainDumpResponse analyzeBrainDump(BrainDumpRequest brainDumpRequest,String userId) {
        String rawText = brainDumpRequest.getRawText();
        String sessionId = brainDumpRequest.getSessionId() != null
                ? brainDumpRequest.getSessionId()
                : UUID.randomUUID().toString();


        BrainDump dump = BrainDump.builder()
                .userId(userId)
                .sessionId(sessionId)
                .rawText(rawText)
                .status("PROCESSING")
                .createdAt(LocalDateTime.now())
                .build();
        brainDumpRepository.save(dump);
        try{
            List<IssueNode> triagedNodes = stage1.triage(rawText, sessionId, userId);
            List<IssueNode> savedNodes = issueNodeRepository.saveAll(triagedNodes);
            List<IssueNode> withAssumptions= stage2.extractAssumptions(savedNodes);

            List<GraphEdge> edges = stage3.buildGraph(withAssumptions,sessionId);
            List<GraphEdge> savedEdges = graphEdgeRepository.saveAll(edges);

            List<IssueNode> scoredNodes= stage4.scoreNodes(withAssumptions, savedEdges);

            List<IssueNode> finalNodes= stage5.generateActionPlans(scoredNodes);
            List<IssueNode> persistedNodes = issueNodeRepository.saveAll(finalNodes);
            dump.setStatus("COMPLETE");
            brainDumpRepository.save(dump);

            return BrainDumpResponse.builder()
                    .sessionId(sessionId)
                    .status("COMPLETE")
                    .summary(buildSummary(persistedNodes))
                    .issues(persistedNodes)
                    .edges(savedEdges)
                    .stageReached("STAGE_5")
                    .build();

        }catch (Exception e) {
            dump.setStatus("FAILED");
            brainDumpRepository.save(dump);

            return BrainDumpResponse.builder()
                    .sessionId(sessionId)
                    .status("FAILED")
                    .summary("Something went wrong while processing: " + e.getMessage())
                    .issues(List.of())
                    .edges(List.of())
                    .stageReached("UNKNOWN")
                    .build();
        }
    }

    private String buildSummary(List<IssueNode> nodes) {
        return "Identified " + nodes.size() + " issue(s) and built a prioritized action plan.";
    }
}
