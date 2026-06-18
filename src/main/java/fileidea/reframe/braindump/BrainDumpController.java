package fileidea.reframe.braindump;


import lombok.RequiredArgsConstructor;
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

    @PostMapping("/analyze")
    public ResponseEntity<BrainDumpResponse> analyze(@RequestBody BrainDumpRequest request,
                                                     @AuthenticationPrincipal UserDetails userDetails){
        String userId= userDetails.getUsername();
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
