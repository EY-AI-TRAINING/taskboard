package com.honeywell.taskboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.honeywell.taskboard.dto.CommentResponse;
import com.honeywell.taskboard.dto.CreateCommentRequest;
import com.honeywell.taskboard.model.CommentItem;
import com.honeywell.taskboard.repository.CommentRepository;
import com.honeywell.taskboard.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {

    @Mock
    private CommentRepository comments;

    @Mock
    private TaskRepository tasks;

    private CommentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CommentServiceImpl(comments, tasks);
    }

    private static CommentItem sample(int id, int taskId, String body) {
        CommentItem c = new CommentItem();
        c.setId(id);
        c.setTaskId(taskId);
        c.setAuthor("Ana");
        c.setBody(body);
        return c;
    }

    @Test
    void listThrowsWhenTaskMissing() {
        when(tasks.existsById(9)).thenReturn(false);
        assertThatThrownBy(() -> service.list(9)).isInstanceOf(TaskNotFoundException.class);
    }

    @Test
    void listReturnsCommentsWhenTaskExists() {
        when(tasks.existsById(1)).thenReturn(true);
        when(comments.findByTaskIdOrderByCreatedAtAscIdAsc(1))
                .thenReturn(List.of(sample(1, 1, "Hi")));

        List<CommentResponse> result = service.list(1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).body()).isEqualTo("Hi");
    }

    @Test
    void createTrimsFields() {
        when(tasks.existsById(1)).thenReturn(true);
        when(comments.saveAndFlush(any(CommentItem.class))).thenAnswer(inv -> {
            CommentItem c = inv.getArgument(0);
            c.setId(4);
            return c;
        });

        CommentResponse result = service.create(1, new CreateCommentRequest("  Ana  ", "  Hello  "));

        assertThat(result.author()).isEqualTo("Ana");
        assertThat(result.body()).isEqualTo("Hello");
    }

    @Test
    void createRejectsBlankBody() {
        when(tasks.existsById(1)).thenReturn(true);
        assertThatThrownBy(() -> service.create(1, new CreateCommentRequest("Ana", "   ")))
                .isInstanceOf(InvalidCommentException.class);
    }

    @Test
    void deleteThrowsWhenCommentOnOtherTask() {
        when(tasks.existsById(2)).thenReturn(true);
        when(comments.findById(1)).thenReturn(Optional.of(sample(1, 1, "Hi")));

        assertThatThrownBy(() -> service.delete(2, 1)).isInstanceOf(CommentNotFoundException.class);
    }

    @Test
    void deleteRemovesWhenOwnedByTask() {
        CommentItem comment = sample(5, 1, "Hi");
        when(tasks.existsById(1)).thenReturn(true);
        when(comments.findById(5)).thenReturn(Optional.of(comment));

        service.delete(1, 5);

        ArgumentCaptor<CommentItem> captor = ArgumentCaptor.forClass(CommentItem.class);
        verify(comments).delete(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(5);
    }
}
