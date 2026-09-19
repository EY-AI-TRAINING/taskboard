package com.honeywell.taskboard.dto;

import com.honeywell.taskboard.model.TaskStatuses;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for creating a task")
public record CreateTaskRequest(

        @Schema(description = "Short task title", example = "Wire up the /api/tasks endpoint", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Size(max = 255) String title,

        @Schema(description = "Optional longer description", example = "Return all tasks, filterable by status")
        String description,

        @Schema(description = "Initial status; defaults to 'todo'", allowableValues = {"todo", "in-progress", "done"}, example = "todo")
        @Size(max = 50) String status,

        @Schema(description = "Who the task is assigned to", example = "Priya")
        @Size(max = 100) String assignee) {

    public String statusOrDefault() {
        return (status == null || status.isBlank()) ? TaskStatuses.TODO : status;
    }
}
