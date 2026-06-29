package fileidea.reframe.braindump;


import fileidea.reframe.usage.UsageLimitExceededException;
import fileidea.reframe.usage.UsageLimitService;
import fileidea.reframe.usage.UsageType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/braindump")
@RequiredArgsConstructor
public class BrainDumpController {

    private final BrainDumpService brainDumpService;
    private final UsageLimitService usageLimitService;

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody BrainDumpRequest request,
                                                     @AuthenticationPrincipal UserDetails userDetails){
        String userId= userDetails.getUsername();
        try {
            usageLimitService.checkAndIncrement(userId, UsageType.BRAIN_DUMP);
        } catch (UsageLimitExceededException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(e.getMessage());
        }
        BrainDumpResponse brainDumpResponse = brainDumpService
                .analyzeBrainDump(request,userId);
        return ResponseEntity.ok(brainDumpResponse);
    }

    @GetMapping("/history")
    public ResponseEntity<List<BrainDumpHistoryResponse>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(brainDumpService.getHistory(userDetails.getUsername()));
    }
}
