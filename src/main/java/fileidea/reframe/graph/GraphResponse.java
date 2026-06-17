package fileidea.reframe.graph;


import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraphResponse {
    private String sessionId;
    private List<IssueNode> nodes;
    private List<GraphEdge> edges;
}
