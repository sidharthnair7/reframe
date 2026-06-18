package fileidea.reframe.braindump;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BrainDumpRepository extends MongoRepository<BrainDump, String> {
    Optional<BrainDump> findBySessionId(String sessionId);
    List<BrainDump> findByUserId(String userId);
    List<BrainDump> findByUserIdOrderByCreatedAtDesc(String userId);
}
