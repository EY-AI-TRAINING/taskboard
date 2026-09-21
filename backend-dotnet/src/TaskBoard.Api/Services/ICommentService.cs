using TaskBoard.Api.Models;

namespace TaskBoard.Api.Services;

public interface ICommentService
{
    Task<IReadOnlyList<CommentResponse>> ListAsync(int taskId, CancellationToken ct = default);
    Task<CommentResponse> CreateAsync(int taskId, CreateCommentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int taskId, int commentId, CancellationToken ct = default);
}
