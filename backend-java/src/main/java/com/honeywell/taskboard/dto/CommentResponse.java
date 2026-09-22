package com.honeywell.taskboard.dto;

import com.honeywell.taskboard.model.CommentItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "A comment on a task")
public record CommentResponse(

        @Schema(example = "1") Integer id,
        @Schema(example = "3") Integer taskId,
        @Schema(example = "Ana") String author,
        @Schema(example = "Looks good to merge.") String body,
        LocalDateTime createdAt) {

    public static CommentResponse from(CommentItem c) {
        return new CommentResponse(c.getId(), c.getTaskId(), c.getAuthor(), c.getBody(), c.getCreatedAt());
    }
}
