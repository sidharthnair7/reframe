package fileidea.reframe.usage;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UsageRecordRepository extends MongoRepository<UsageRecord, String> {
    Optional<UsageRecord> findByUserIdAndPeriodKey(String userId, String periodKey);
}
