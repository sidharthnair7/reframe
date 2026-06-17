package fileidea.reframe.pipeline;

import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class Stage1TriageService {

    private final ClaudeClient claudeClient;
    private final ObjectMapper objectMapper;





}
