package com.honeywell.taskboard.repository;

import com.honeywell.taskboard.model.TaskItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Data-access layer. Spring Data implements the CRUD methods; the one custom
 * query below handles the optional status filter with a stable ordering.
 */
public interface TaskRepository extends JpaRepository<TaskItem, Integer> {

    @Query("select t from TaskItem t where (:status is null or t.status = :status) order by t.id")
    List<TaskItem> findByOptionalStatus(@Param("status") String status);
}
