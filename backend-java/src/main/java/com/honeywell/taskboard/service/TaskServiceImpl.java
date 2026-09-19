package com.honeywell.taskboard.service;

import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import com.honeywell.taskboard.model.TaskItem;
import com.honeywell.taskboard.model.TaskStatuses;
import com.honeywell.taskboard.repository.TaskRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository repository;

    public TaskServiceImpl(TaskRepository repository) {
        this.repository = repository;
    }

    private static void validateStatus(String status) {
        if (!TaskStatuses.isValid(status)) {
            throw new InvalidStatusException(status);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> list(String status) {
        String filter = StringUtils.hasText(status) ? status : null;
        if (filter != null) {
            validateStatus(filter);
        }
        return repository.findByOptionalStatus(filter).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse get(int id) {
        return TaskResponse.from(find(id));
    }

    @Override
    public TaskResponse create(CreateTaskRequest request) {
        String status = request.statusOrDefault();
        validateStatus(status);

        TaskItem task = new TaskItem();
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(status);
        task.setAssignee(request.assignee());

        // flush now so Hibernate runs the follow-up SELECT for the
        // database-generated created_at / updated_at before we map the response.
        return TaskResponse.from(repository.saveAndFlush(task));
    }

    @Override
    public TaskResponse update(int id, UpdateTaskRequest request) {
        validateStatus(request.status());

        TaskItem task = find(id);
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(request.status());
        task.setAssignee(request.assignee());

        // flush now so Hibernate runs the follow-up SELECT for the
        // database-generated created_at / updated_at before we map the response.
        return TaskResponse.from(repository.saveAndFlush(task));
    }

    @Override
    public void delete(int id) {
        repository.delete(find(id));
    }

    private TaskItem find(int id) {
        return repository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
    }
}
