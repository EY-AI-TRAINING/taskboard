using Microsoft.AspNetCore.Mvc;
using Moq;
using TaskBoard.Api.Controllers;
using TaskBoard.Api.Models;
using TaskBoard.Api.Services;
using Xunit;

namespace TaskBoard.Api.Tests;

public class CommentsControllerTests
{
    private readonly Mock<ITaskService> _tasks = new();
    private readonly Mock<ICommentService> _comments = new();
    private readonly TasksController _sut;

    public CommentsControllerTests() => _sut = new TasksController(_tasks.Object, _comments.Object);

    private static CommentResponse Comment(int id = 1, int taskId = 1) =>
        new(id, taskId, "Ana", "Hello", DateTime.UtcNow);

    [Fact]
    public async Task ListComments_ReturnsOkOldestFirst()
    {
        _comments.Setup(s => s.ListAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CommentResponse> { Comment(1, 3), Comment(2, 3) });

        var action = await _sut.ListComments(3, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<CommentResponse>>(ok.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public async Task ListComments_ReturnsEmptyWhenTaskHasNone()
    {
        _comments.Setup(s => s.ListAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CommentResponse>());

        var action = await _sut.ListComments(1, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        Assert.Empty(Assert.IsAssignableFrom<IReadOnlyList<CommentResponse>>(ok.Value));
    }

    [Fact]
    public async Task ListComments_ReturnsNotFoundWhenTaskMissing()
    {
        _comments.Setup(s => s.ListAsync(9, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskNotFoundException(9));

        var action = await _sut.ListComments(9, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(action.Result);
    }

    [Fact]
    public async Task CreateComment_ReturnsCreated()
    {
        _comments.Setup(s => s.CreateAsync(3, It.IsAny<CreateCommentRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Comment(7, 3));

        var action = await _sut.CreateComment(3, new CreateCommentRequest { Author = "Ana", Body = "Hi" },
            CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(action.Result);
        Assert.Equal(7, ((CommentResponse)created.Value!).Id);
    }

    [Fact]
    public async Task CreateComment_ReturnsNotFoundWhenTaskMissing()
    {
        _comments.Setup(s => s.CreateAsync(9, It.IsAny<CreateCommentRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskNotFoundException(9));

        var action = await _sut.CreateComment(9, new CreateCommentRequest { Author = "Ana", Body = "Hi" },
            CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(action.Result);
    }

    [Fact]
    public async Task CreateComment_ReturnsUnprocessableForInvalidBody()
    {
        _comments.Setup(s => s.CreateAsync(1, It.IsAny<CreateCommentRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidCommentException("author and body are required"));

        var action = await _sut.CreateComment(1, new CreateCommentRequest { Author = "  ", Body = "Hi" },
            CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(action.Result);
    }

    [Fact]
    public async Task DeleteComment_ReturnsNoContent()
    {
        _comments.Setup(s => s.DeleteAsync(1, 2, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.DeleteComment(1, 2, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteComment_ReturnsNotFoundWhenCommentMissing()
    {
        _comments.Setup(s => s.DeleteAsync(1, 99, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new CommentNotFoundException(99));

        var result = await _sut.DeleteComment(1, 99, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task DeleteComment_ReturnsNotFoundWhenTaskMissing()
    {
        _comments.Setup(s => s.DeleteAsync(9, 1, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskNotFoundException(9));

        var result = await _sut.DeleteComment(9, 1, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
