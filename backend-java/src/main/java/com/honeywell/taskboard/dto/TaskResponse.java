package com.honeywell.taskboard.dto;

import com.honeywell.taskboard.model.TaskItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "A task on the board")
public record TaskResponse(

        @Schema(example = "7") Integer id,
        @Schema(example = "Wire up the /api/tasks endpoint") String title,
        @Schema(example = "Return all tasks, filterable by status") String description,
        @Schema(example = "todo", allowableValues = {"todo", "in-progress", "done"}) String status,
        @Schema(example = "Priya") String assignee,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        @Schema(example = "2") Integer commentCount) {

    public static TaskResponse from(TaskItem t) {
        return from(t, 0);
    }

    public static TaskResponse from(TaskItem t, long commentCount) {
        return new TaskResponse(
                t.getId(), t.getTitle(), t.getDescription(), t.getStatus(),
                t.getAssignee(), t.getCreatedAt(), t.getUpdatedAt(), (int) commentCount);
    }
}
