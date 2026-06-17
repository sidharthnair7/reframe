package fileidea.reframe.braindump;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

}
