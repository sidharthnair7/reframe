package fileidea.reframe.graph;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "graph_edges")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GraphEdge {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    private String fromNodeId;
    private String toNodeId;

    private EdgeType type;
    private String reason;
}
