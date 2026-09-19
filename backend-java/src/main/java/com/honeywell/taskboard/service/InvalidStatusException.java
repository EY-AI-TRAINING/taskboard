package com.honeywell.taskboard.service;

/** Thrown when a status value is not one of the allowed columns. HTTP 422. */
public class InvalidStatusException extends RuntimeException {

    public InvalidStatusException(String status) {
        super("Invalid status: '" + status + "'");
    }
}
