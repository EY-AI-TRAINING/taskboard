package com.honeywell.taskboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for replacing a task")
public record UpdateTaskRequest(

        @Schema(description = "Short task title", example = "Wire up the /api/tasks endpoint", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Size(max = 255) String title,

        @Schema(description = "Optional longer description")
        String description,

        @Schema(description = "Task status", allowableValues = {"todo", "in-progress", "done"}, example = "in-progress", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Size(max = 50) String status,

        @Schema(description = "Who the task is assigned to", example = "Priya")
        @Size(max = 100) String assignee) {
}
