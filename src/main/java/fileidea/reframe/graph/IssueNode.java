package fileidea.reframe.graph;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "issue_nodes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueNode {

    @Id
    private String id;

    @Indexed
    private String sessionId;
    private String userId;


    //For Stage 1
    private String text;
    private int urgency;
    private int cognitiveWeight;
    private String actionability;
    private String category;
    private List<String> hiddenAssumptions;

    private double priorityScore;
    private double confidenceInterval;
    private String priorityReasoning;
    private List<Integer> rejectedAssumptionIndices;


    private ActionPlan actionPlan;


}
