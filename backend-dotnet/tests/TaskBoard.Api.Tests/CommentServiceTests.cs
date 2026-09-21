using Moq;
using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;
using Xunit;

namespace TaskBoard.Api.Tests;

public class CommentServiceTests
{
    private readonly Mock<ICommentRepository> _comments = new();
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly CommentService _sut;

    public CommentServiceTests() => _sut = new CommentService(_comments.Object, _tasks.Object);

    private static TaskItem TaskRow(int id = 1) => new()
    {
        Id = id,
        Title = "Sample",
        Status = TaskStatuses.Todo,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    private static CommentItem CommentRow(int id = 1, int taskId = 1, string body = "Hi") => new()
    {
        Id = id,
        TaskId = taskId,
        Author = "Ana",
        Body = body,
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task ListAsync_ThrowsWhenTaskMissing()
    {
        _tasks.Setup(t => t.GetAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((TaskItem?)null);
        await Assert.ThrowsAsync<TaskNotFoundException>(() => _sut.ListAsync(9));
    }

    [Fact]
    public async Task ListAsync_ReturnsCommentsWhenTaskExists()
    {
        _tasks.Setup(t => t.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow());
        _comments.Setup(c => c.ListByTaskAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CommentItem> { CommentRow() });

        var result = await _sut.ListAsync(1);

        Assert.Single(result);
        Assert.Equal("Hi", result[0].Body);
    }

    [Fact]
    public async Task CreateAsync_TrimsAndPersists()
    {
        _tasks.Setup(t => t.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow());
        _comments.Setup(c => c.AddAsync(It.IsAny<CommentItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CommentItem c, CancellationToken _) => { c.Id = 4; return c; });

        var result = await _sut.CreateAsync(1, new CreateCommentRequest { Author = "  Ana  ", Body = "  Hello  " });

        Assert.Equal(4, result.Id);
        Assert.Equal("Ana", result.Author);
        Assert.Equal("Hello", result.Body);
    }

    [Fact]
    public async Task CreateAsync_RejectsBlankAfterTrim()
    {
        _tasks.Setup(t => t.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow());
        await Assert.ThrowsAsync<InvalidCommentException>(
            () => _sut.CreateAsync(1, new CreateCommentRequest { Author = "Ana", Body = "   " }));
    }

    [Fact]
    public async Task CreateAsync_RejectsAuthorTooLong()
    {
        _tasks.Setup(t => t.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow());
        await Assert.ThrowsAsync<InvalidCommentException>(
            () => _sut.CreateAsync(1, new CreateCommentRequest { Author = new string('A', 101), Body = "ok" }));
    }

    [Fact]
    public async Task DeleteAsync_ThrowsWhenCommentOnOtherTask()
    {
        _tasks.Setup(t => t.GetAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow(2));
        _comments.Setup(c => c.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(CommentRow(1, 1));

        await Assert.ThrowsAsync<CommentNotFoundException>(() => _sut.DeleteAsync(2, 1));
    }

    [Fact]
    public async Task DeleteAsync_RemovesWhenOwnedByTask()
    {
        var comment = CommentRow(5, 1);
        _tasks.Setup(t => t.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(TaskRow());
        _comments.Setup(c => c.GetAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(comment);

        await _sut.DeleteAsync(1, 5);

        _comments.Verify(c => c.DeleteAsync(comment, It.IsAny<CancellationToken>()), Times.Once);
    }
}
