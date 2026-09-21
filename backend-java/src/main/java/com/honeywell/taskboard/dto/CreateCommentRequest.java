package com.honeywell.taskboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for creating a comment")
public record CreateCommentRequest(

        @Schema(example = "Ana", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Size(max = 100) String author,

        @Schema(example = "Looks good to merge.", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank @Size(max = 500) String body) {
}
