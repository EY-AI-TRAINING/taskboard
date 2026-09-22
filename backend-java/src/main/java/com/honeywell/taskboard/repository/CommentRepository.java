package com.honeywell.taskboard.repository;

import com.honeywell.taskboard.model.CommentItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<CommentItem, Integer> {

    List<CommentItem> findByTaskIdOrderByCreatedAtAscIdAsc(Integer taskId);

    long countByTaskId(Integer taskId);

    @Query("select c.taskId, count(c) from CommentItem c where c.taskId in :ids group by c.taskId")
    List<Object[]> countGroupedByTaskIds(@Param("ids") Collection<Integer> ids);
}
