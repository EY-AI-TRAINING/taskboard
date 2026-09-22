package com.honeywell.taskboard.service;

import com.honeywell.taskboard.dto.CommentResponse;
import com.honeywell.taskboard.dto.CreateCommentRequest;
import java.util.List;

public interface CommentService {

    List<CommentResponse> list(int taskId);

    CommentResponse create(int taskId, CreateCommentRequest request);

    void delete(int taskId, int commentId);
}
