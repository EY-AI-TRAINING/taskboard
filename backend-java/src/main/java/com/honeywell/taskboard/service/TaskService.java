package com.honeywell.taskboard.service;

import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import java.util.List;

public interface TaskService {

    List<TaskResponse> list(String status);

    TaskResponse get(int id);

    TaskResponse create(CreateTaskRequest request);

    TaskResponse update(int id, UpdateTaskRequest request);

    void delete(int id);
}
