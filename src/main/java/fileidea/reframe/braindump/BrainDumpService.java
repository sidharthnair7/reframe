package fileidea.reframe.braindump;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrainDumpService {


    private final BrainDumpRepository brainDumpRepository;

    public BrainDump findBySessionId(String sessionId) {
        return brainDumpRepository.findBySessionId(sessionId).orElse(null);
    }

    public void create(String sessionId, String rawText) {
        BrainDump brainDump = BrainDump.builder()
                .sessionId(sessionId)
                .rawText(rawText)
                .build();
        brainDumpRepository.save(brainDump);
    }

    public BrainDumpResponse analyzeBrainDump(BrainDumpRequest brainDumpRequest,String userId) {
        String rawText = brainDumpRequest.getRawText();
        String sessionId = UUID.randomUUID().toString();

        BrainDump dump = BrainDump.builder()
                .userId(userId)
                .sessionId(sessionId)
                .rawText(rawText)
                .status("PROCESSING")
                .createdAt(LocalDateTime.now())
                .build();
        brainDumpRepository.save(dump);

        return BrainDumpResponse.builder()
                .sessionId(sessionId)
                .status("PROCESSING")
                .build();
    }
}
