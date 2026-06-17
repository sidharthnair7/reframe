package fileidea.reframe.graph;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GraphEdgeRepository extends MongoRepository<GraphEdge,String> {
    List<GraphEdge> findBySessionId(String sessionId);
}
