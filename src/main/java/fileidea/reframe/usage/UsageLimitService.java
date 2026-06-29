package fileidea.reframe.usage;

import fileidea.reframe.user.User;
import fileidea.reframe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// This is a monthly usage quota (cumulative spend protection), not a rate limiter —
// see the comment in application.properties for why that distinction matters here.
@Service
@RequiredArgsConstructor
public class UsageLimitService {

    private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final UsageRecordRepository usageRecordRepository;
    private final UserRepository userRepository;

    @Value("${app.usage.freeTier.brainDumpCapPerMonth}")
    private int brainDumpCapPerMonth;

    @Value("${app.usage.freeTier.voiceExchangeCapPerMonth}")
    private int voiceExchangeCapPerMonth;

    @Value("${app.usage.freeTier.voiceSpeakCapPerMonth}")
    private int voiceSpeakCapPerMonth;

    public void checkAndIncrement(String userId, UsageType type) {
        User user = userRepository.findByEmail(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        String periodKey = LocalDate.now().format(PERIOD_FORMAT);
        UsageRecord record = usageRecordRepository.findByUserIdAndPeriodKey(userId, periodKey)
                .orElseGet(() -> UsageRecord.builder()
                        .userId(userId)
                        .periodKey(periodKey)
                        .build());

        if (!user.isPremium() && countFor(record, type) >= capFor(type)) {
            throw new UsageLimitExceededException(
                    "You've reached your free monthly limit for this feature. Upgrade for unlimited access.");
        }

        increment(record, type);
        usageRecordRepository.save(record);
    }

    private int countFor(UsageRecord record, UsageType type) {
        return switch (type) {
            case BRAIN_DUMP -> record.getBrainDumpCount();
            case VOICE_EXCHANGE -> record.getVoiceExchangeCount();
            case VOICE_SPEAK -> record.getVoiceSpeakCount();
        };
    }

    private int capFor(UsageType type) {
        return switch (type) {
            case BRAIN_DUMP -> brainDumpCapPerMonth;
            case VOICE_EXCHANGE -> voiceExchangeCapPerMonth;
            case VOICE_SPEAK -> voiceSpeakCapPerMonth;
        };
    }

    private void increment(UsageRecord record, UsageType type) {
        switch (type) {
            case BRAIN_DUMP -> record.setBrainDumpCount(record.getBrainDumpCount() + 1);
            case VOICE_EXCHANGE -> record.setVoiceExchangeCount(record.getVoiceExchangeCount() + 1);
            case VOICE_SPEAK -> record.setVoiceSpeakCount(record.getVoiceSpeakCount() + 1);
        }
    }
}
