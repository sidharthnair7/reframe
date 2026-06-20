package fileidea.reframe.graph;


import fileidea.reframe.pipeline.Stage4ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/graph")
@RequiredArgsConstructor
public class GraphController {
    private final IssueNodeRepository issueNodeRepository;
    private final GraphEdgeRepository graphEdgeRepository;

    @GetMapping("/{sessionId}")
    public ResponseEntity<GraphResponse> getGraph(@PathVariable String sessionId) {
        List<IssueNode> issueNodes = issueNodeRepository.findBySessionId(sessionId);
        List<GraphEdge> graphEdges = graphEdgeRepository.findBySessionId(sessionId);

        return ResponseEntity.ok(GraphResponse.builder()
                .sessionId(sessionId)
                .nodes(issueNodes)
                .edges(graphEdges)
                .build()
        );
    }

    @PatchMapping("/issues/{issueId}/assumptions")
    public ResponseEntity<IssueNode> updateAssumptions(
            @PathVariable String issueId,
            @RequestBody AssumptionUpdateRequest request
    ) {
        return issueNodeRepository.findById(issueId)
                .map(node -> {
                    List<Integer> rejected = request.rejectedIndices() != null
                            ? request.rejectedIndices()
                            : List.of();
                    int total = node.getHiddenAssumptions() != null ? node.getHiddenAssumptions().size() : 0;
                    int effectiveCount = Math.max(total - rejected.size(), 0);

                    node.setRejectedAssumptionIndices(rejected);
                    node.setConfidenceInterval(Stage4ScoringService.computeConfidenceInterval(effectiveCount));

                    return ResponseEntity.ok(issueNodeRepository.save(node));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record AssumptionUpdateRequest(List<Integer> rejectedIndices) {}
}
