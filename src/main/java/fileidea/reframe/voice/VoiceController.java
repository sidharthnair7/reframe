package fileidea.reframe.voice;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceAgentService voiceAgentService;
    private final ElevenLabsClient elevenLabsClient;

    @PostMapping("/exchange")
    public ResponseEntity<VoiceExchangeResponse> exchange(@RequestBody VoiceExchangeRequest voiceExchangeRequest) {
        return ResponseEntity.ok(voiceAgentService.exchange(voiceExchangeRequest));
    }

    @PostMapping("/speak")
    public ResponseEntity<byte[]> speak(@RequestBody SpeakRequest request) {
        byte[] audio = elevenLabsClient.synthesize(request.text());


        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE)
                .body(audio);
    }



    private record SpeakRequest(String text) {}
}