package fileidea.reframe.braindump;

import fileidea.reframe.graph.GraphEdge;
import fileidea.reframe.graph.IssueNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BrainDumpResponse {
    String sessionId;
    String status;
    String summary;
    List<IssueNode> issues;
    List<GraphEdge> edges;
    String stageReached;
}
