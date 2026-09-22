package com.honeywell.taskboard.service;

import com.honeywell.taskboard.dto.CreateTaskRequest;
import com.honeywell.taskboard.dto.TaskResponse;
import com.honeywell.taskboard.dto.UpdateTaskRequest;
import com.honeywell.taskboard.model.TaskItem;
import com.honeywell.taskboard.model.TaskStatuses;
import com.honeywell.taskboard.repository.CommentRepository;
import com.honeywell.taskboard.repository.TaskRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository repository;
    private final CommentRepository comments;

    public TaskServiceImpl(TaskRepository repository, CommentRepository comments) {
        this.repository = repository;
        this.comments = comments;
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
        List<TaskItem> rows = repository.findByOptionalStatus(filter);
        Map<Integer, Long> counts = countsFor(rows.stream().map(TaskItem::getId).toList());
        return rows.stream()
                .map(t -> TaskResponse.from(t, counts.getOrDefault(t.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse get(int id) {
        TaskItem task = find(id);
        return TaskResponse.from(task, comments.countByTaskId(id));
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
        TaskItem saved = repository.saveAndFlush(task);
        return TaskResponse.from(saved, comments.countByTaskId(id));
    }

    @Override
    public void delete(int id) {
        repository.delete(find(id));
    }

    private TaskItem find(int id) {
        return repository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
    }

    private Map<Integer, Long> countsFor(List<Integer> ids) {
        Map<Integer, Long> counts = new HashMap<>();
        if (ids.isEmpty()) {
            return counts;
        }
        for (Object[] row : comments.countGroupedByTaskIds(ids)) {
            Integer taskId = (Integer) row[0];
            long count = ((Number) row[1]).longValue();
            counts.put(taskId, count);
        }
        return counts;
    }
}
