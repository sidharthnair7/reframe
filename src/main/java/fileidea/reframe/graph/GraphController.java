package fileidea.reframe.graph;


import fileidea.reframe.pipeline.Stage4ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public ResponseEntity<GraphResponse> getGraph(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String userId = userDetails.getUsername();
        List<IssueNode> issueNodes = issueNodeRepository.findBySessionId(sessionId);

        // Ownership check: a session's nodes must belong to the caller. An empty
        // result is fine (nothing to leak); a non-empty result owned by someone
        // else means the caller is trying to read another user's analysis.
        boolean notOwner = issueNodes.stream()
                .anyMatch(n -> n.getUserId() == null || !n.getUserId().equals(userId));
        if (notOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
            @RequestBody AssumptionUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String userId = userDetails.getUsername();
        return issueNodeRepository.findById(issueId)
                // Only the owner may mutate their own issue's assumptions.
                .filter(node -> userId.equals(node.getUserId()))
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
                // 404 for both "not found" and "not yours" so we don't reveal
                // whether an issueId owned by someone else actually exists.
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record AssumptionUpdateRequest(List<Integer> rejectedIndices) {}
}
