package com.honeywell.taskboard.service;

/** Thrown when a task id does not exist. Mapped to HTTP 404 by the advice. */
public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(int id) {
        super("Task " + id + " not found");
    }
}
