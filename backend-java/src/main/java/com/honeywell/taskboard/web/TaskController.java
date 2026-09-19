package com.honeywell.taskboard.web;

import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import com.honeywell.taskboard.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@Tag(name = "Tasks", description = "Create, read, update and delete tasks on the board")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List tasks", description = "Returns all tasks, or only those matching an optional status filter.")
    @ApiResponse(responseCode = "200", description = "Tasks returned")
    @ApiResponse(responseCode = "422", description = "Unknown status value", content = @Content)
    public List<TaskResponse> list(
            @Parameter(description = "Filter by status", example = "todo",
                    schema = @Schema(allowableValues = {"todo", "in-progress", "done"}))
            @RequestParam(required = false) String status) {
        return service.list(status);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a task by id")
    @ApiResponse(responseCode = "200", description = "Task found")
    @ApiResponse(responseCode = "404", description = "No task with that id", content = @Content)
    public TaskResponse get(@PathVariable int id) {
        return service.get(id);
    }

    @PostMapping
    @Operation(summary = "Create a task")
    @ApiResponse(responseCode = "201", description = "Task created")
    @ApiResponse(responseCode = "422", description = "Missing title or invalid status", content = @Content)
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
        TaskResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace a task")
    @ApiResponse(responseCode = "200", description = "Task updated")
    @ApiResponse(responseCode = "404", description = "No task with that id", content = @Content)
    @ApiResponse(responseCode = "422", description = "Missing title or invalid status", content = @Content)
    public TaskResponse update(@PathVariable int id, @Valid @RequestBody UpdateTaskRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a task")
    @ApiResponse(responseCode = "204", description = "Task deleted")
    @ApiResponse(responseCode = "404", description = "No task with that id", content = @Content)
    public ResponseEntity<Void> delete(@PathVariable int id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
