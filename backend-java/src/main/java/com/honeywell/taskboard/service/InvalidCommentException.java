package com.honeywell.taskboard.service;

/** Thrown when author/body fail validation. Mapped to HTTP 422. */
public class InvalidCommentException extends RuntimeException {

    public InvalidCommentException(String message) {
        super(message);
    }
}
