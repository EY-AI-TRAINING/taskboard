package com.honeywell.taskboard.model;

import java.util.Set;

/** The three board columns. Must match the CHECK constraint in database/schema.sql. */
public final class TaskStatuses {

    public static final String TODO = "todo";
    public static final String IN_PROGRESS = "in-progress";
    public static final String DONE = "done";

    public static final Set<String> ALL = Set.of(TODO, IN_PROGRESS, DONE);

    private TaskStatuses() {
    }

    public static boolean isValid(String status) {
        return ALL.contains(status);
    }
}
