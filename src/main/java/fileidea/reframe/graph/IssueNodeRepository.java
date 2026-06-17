package fileidea.reframe.graph;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface IssueNodeRepository extends MongoRepository<IssueNode,String> {
    List<IssueNode> findBySessionId(String sessionId);
    List<IssueNode> findByUserId(String userId);

}
