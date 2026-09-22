package com.honeywell.taskboard.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.honeywell.taskboard.dto.CommentResponse;
import com.honeywell.taskboard.dto.CreateCommentRequest;
import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import com.honeywell.taskboard.model.TaskStatuses;
import com.honeywell.taskboard.service.CommentNotFoundException;
import com.honeywell.taskboard.service.CommentService;
import com.honeywell.taskboard.service.InvalidCommentException;
import com.honeywell.taskboard.service.InvalidStatusException;
import com.honeywell.taskboard.service.TaskNotFoundException;
import com.honeywell.taskboard.service.TaskService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@ExtendWith(MockitoExtension.class)
class TaskControllerTest {

    @Mock
    private TaskService service;

    @Mock
    private CommentService comments;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new TaskController(service, comments))
                .setControllerAdvice(new ApiExceptionHandler())
                .setValidator(validator)
                .build();
    }

    private static TaskResponse response(int id) {
        return new TaskResponse(id, "Sample", null, TaskStatuses.TODO, null,
                LocalDateTime.now(), LocalDateTime.now(), 0);
    }

    @Test
    void listReturnsTasks() throws Exception {
        when(service.list(null)).thenReturn(List.of(response(1)));

        mvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void listReturns422ForBadStatus() throws Exception {
        when(service.list("bad")).thenThrow(new InvalidStatusException("bad"));

        mvc.perform(get("/api/tasks").param("status", "bad"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void getReturns404WhenMissing() throws Exception {
        when(service.get(9)).thenThrow(new TaskNotFoundException(9));

        mvc.perform(get("/api/tasks/9")).andExpect(status().isNotFound());
    }

    @Test
    void createReturns201WithLocation() throws Exception {
        when(service.create(any(CreateTaskRequest.class))).thenReturn(response(42));

        mvc.perform(post("/api/tasks")
                        .contentType("application/json")
                        .content("{\"title\":\"New\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42));
    }

    @Test
    void createReturns422WhenTitleMissing() throws Exception {
        mvc.perform(post("/api/tasks")
                        .contentType("application/json")
                        .content("{\"description\":\"no title\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void updateReturns404WhenMissing() throws Exception {
        when(service.update(eq(3), any(UpdateTaskRequest.class)))
                .thenThrow(new TaskNotFoundException(3));

        mvc.perform(put("/api/tasks/3")
                        .contentType("application/json")
                        .content("{\"title\":\"x\",\"status\":\"todo\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns204() throws Exception {
        mvc.perform(delete("/api/tasks/1")).andExpect(status().isNoContent());
        verify(service).delete(1);
    }

    @Test
    void listIncludesCommentCount() throws Exception {
        when(service.list(null)).thenReturn(List.of(
                new TaskResponse(1, "Sample", null, TaskStatuses.TODO, null,
                        LocalDateTime.now(), LocalDateTime.now(), 3)));

        mvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].commentCount").value(3));
    }

    @Test
    void listCommentsReturnsOldestFirst() throws Exception {
        when(comments.list(3)).thenReturn(List.of(
                new CommentResponse(1, 3, "Ana", "First", LocalDateTime.now()),
                new CommentResponse(2, 3, "Priya", "Second", LocalDateTime.now())));

        mvc.perform(get("/api/tasks/3/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].body").value("First"))
                .andExpect(jsonPath("$[1].author").value("Priya"));
    }

    @Test
    void listCommentsEmptyWhenTaskHasNone() throws Exception {
        when(comments.list(1)).thenReturn(List.of());

        mvc.perform(get("/api/tasks/1/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void listCommentsReturns404WhenTaskMissing() throws Exception {
        when(comments.list(9)).thenThrow(new TaskNotFoundException(9));

        mvc.perform(get("/api/tasks/9/comments")).andExpect(status().isNotFound());
    }

    @Test
    void createCommentReturns201() throws Exception {
        when(comments.create(eq(3), any(CreateCommentRequest.class)))
                .thenReturn(new CommentResponse(7, 3, "Ana", "Hi", LocalDateTime.now()));

        mvc.perform(post("/api/tasks/3/comments")
                        .contentType("application/json")
                        .content("{\"author\":\"Ana\",\"body\":\"Hi\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void createCommentReturns404WhenTaskMissing() throws Exception {
        when(comments.create(eq(9), any(CreateCommentRequest.class)))
                .thenThrow(new TaskNotFoundException(9));

        mvc.perform(post("/api/tasks/9/comments")
                        .contentType("application/json")
                        .content("{\"author\":\"Ana\",\"body\":\"Hi\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createCommentReturns422WhenAuthorMissing() throws Exception {
        mvc.perform(post("/api/tasks/1/comments")
                        .contentType("application/json")
                        .content("{\"body\":\"Hi\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void createCommentReturns422WhenBodyBlank() throws Exception {
        mvc.perform(post("/api/tasks/1/comments")
                        .contentType("application/json")
                        .content("{\"author\":\"Ana\",\"body\":\"   \"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deleteCommentReturns204() throws Exception {
        mvc.perform(delete("/api/tasks/1/comments/2")).andExpect(status().isNoContent());
        verify(comments).delete(1, 2);
    }

    @Test
    void deleteCommentReturns404WhenMissing() throws Exception {
        doThrow(new CommentNotFoundException(99)).when(comments).delete(1, 99);

        mvc.perform(delete("/api/tasks/1/comments/99")).andExpect(status().isNotFound());
    }
}
