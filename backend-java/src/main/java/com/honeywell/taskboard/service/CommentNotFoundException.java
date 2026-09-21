package com.honeywell.taskboard.service;

/** Thrown when a comment id does not exist (or is not on the given task). Mapped to HTTP 404. */
public class CommentNotFoundException extends RuntimeException {

    public CommentNotFoundException(int id) {
        super("Comment " + id + " not found");
    }
}
