package fileidea.reframe.voice;

import fileidea.reframe.usage.UsageLimitExceededException;
import fileidea.reframe.usage.UsageLimitService;
import fileidea.reframe.usage.UsageType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceAgentService voiceAgentService;
    private final ElevenLabsClient elevenLabsClient;
    private final UsageLimitService usageLimitService;

    @PostMapping("/exchange")
    public ResponseEntity<?> exchange(@RequestBody VoiceExchangeRequest voiceExchangeRequest,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        try {
            usageLimitService.checkAndIncrement(userDetails.getUsername(), UsageType.VOICE_EXCHANGE);
        } catch (UsageLimitExceededException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(e.getMessage());
        }
        return ResponseEntity.ok(voiceAgentService.exchange(voiceExchangeRequest));
    }

    @PostMapping("/speak")
    public ResponseEntity<?> speak(@RequestBody SpeakRequest request,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        try {
            usageLimitService.checkAndIncrement(userDetails.getUsername(), UsageType.VOICE_SPEAK);
        } catch (UsageLimitExceededException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(e.getMessage());
        }
        byte[] audio = elevenLabsClient.synthesize(request.text());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "audio/mpeg")
                .body(audio);
    }



    private record SpeakRequest(String text) {}
}