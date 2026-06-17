package fileidea.reframe.graph;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}
