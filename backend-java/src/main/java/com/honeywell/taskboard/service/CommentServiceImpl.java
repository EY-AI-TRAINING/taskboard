package com.honeywell.taskboard.service;

import com.honeywell.taskboard.dto.CommentResponse;
import com.honeywell.taskboard.dto.CreateCommentRequest;
import com.honeywell.taskboard.model.CommentItem;
import com.honeywell.taskboard.repository.CommentRepository;
import com.honeywell.taskboard.repository.TaskRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class CommentServiceImpl implements CommentService {

    private final CommentRepository comments;
    private final TaskRepository tasks;

    public CommentServiceImpl(CommentRepository comments, TaskRepository tasks) {
        this.comments = comments;
        this.tasks = tasks;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponse> list(int taskId) {
        requireTask(taskId);
        return comments.findByTaskIdOrderByCreatedAtAscIdAsc(taskId).stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Override
    public CommentResponse create(int taskId, CreateCommentRequest request) {
        requireTask(taskId);
        String author = trimRequired(request.author(), "author");
        String body = trimRequired(request.body(), "body");
        if (author.length() > 100 || body.length() > 500) {
            throw new InvalidCommentException("author must be 1-100 characters and body 1-500");
        }

        CommentItem comment = new CommentItem();
        comment.setTaskId(taskId);
        comment.setAuthor(author);
        comment.setBody(body);
        return CommentResponse.from(comments.saveAndFlush(comment));
    }

    @Override
    public void delete(int taskId, int commentId) {
        requireTask(taskId);
        CommentItem comment = comments.findById(commentId)
                .orElseThrow(() -> new CommentNotFoundException(commentId));
        if (!comment.getTaskId().equals(taskId)) {
            throw new CommentNotFoundException(commentId);
        }
        comments.delete(comment);
    }

    private void requireTask(int taskId) {
        if (!tasks.existsById(taskId)) {
            throw new TaskNotFoundException(taskId);
        }
    }

    private static String trimRequired(String value, String field) {
        String trimmed = value == null ? "" : value.trim();
        if (!StringUtils.hasText(trimmed)) {
            throw new InvalidCommentException(field + " is required");
        }
        return trimmed;
    }
}
