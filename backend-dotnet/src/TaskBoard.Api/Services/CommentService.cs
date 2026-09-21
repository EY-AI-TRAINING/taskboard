using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;

namespace TaskBoard.Api.Services;

public class CommentService : ICommentService
{
    private readonly ICommentRepository _comments;
    private readonly ITaskRepository _tasks;

    public CommentService(ICommentRepository comments, ITaskRepository tasks)
    {
        _comments = comments;
        _tasks = tasks;
    }

    public async Task<IReadOnlyList<CommentResponse>> ListAsync(int taskId, CancellationToken ct = default)
    {
        await RequireTask(taskId, ct);
        var comments = await _comments.ListByTaskAsync(taskId, ct);
        return comments.Select(CommentResponse.From).ToList();
    }

    public async Task<CommentResponse> CreateAsync(
        int taskId, CreateCommentRequest request, CancellationToken ct = default)
    {
        await RequireTask(taskId, ct);
        var (author, body) = Validate(request);
        var created = await _comments.AddAsync(new CommentItem
        {
            TaskId = taskId,
            Author = author,
            Body = body,
        }, ct);
        return CommentResponse.From(created);
    }

    public async Task DeleteAsync(int taskId, int commentId, CancellationToken ct = default)
    {
        await RequireTask(taskId, ct);
        var comment = await _comments.GetAsync(commentId, ct);
        if (comment is null || comment.TaskId != taskId)
            throw new CommentNotFoundException(commentId);
        await _comments.DeleteAsync(comment, ct);
    }

    private async Task RequireTask(int taskId, CancellationToken ct)
    {
        _ = await _tasks.GetAsync(taskId, ct) ?? throw new TaskNotFoundException(taskId);
    }

    private static (string Author, string Body) Validate(CreateCommentRequest request)
    {
        var author = request.Author?.Trim() ?? "";
        var body = request.Body?.Trim() ?? "";
        if (author.Length is 0 or > 100 || body.Length is 0 or > 500)
            throw new InvalidCommentException("author and body are required (author 1-100, body 1-500)");
        return (author, body);
    }
}
