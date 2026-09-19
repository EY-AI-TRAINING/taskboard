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

import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import com.honeywell.taskboard.model.TaskStatuses;
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

@ExtendWith(MockitoExtension.class)
class TaskControllerTest {

    @Mock
    private TaskService service;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new TaskController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    private static TaskResponse response(int id) {
        return new TaskResponse(id, "Sample", null, TaskStatuses.TODO, null,
                LocalDateTime.now(), LocalDateTime.now());
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
}
