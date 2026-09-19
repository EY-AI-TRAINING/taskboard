package com.honeywell.taskboard.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Meta", description = "Service metadata")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Liveness check", description = "Returns {\"status\":\"ok\"} when the service is up.")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
