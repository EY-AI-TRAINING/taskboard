using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public interface ICommentRepository
{
    Task<IReadOnlyList<CommentItem>> ListByTaskAsync(int taskId, CancellationToken ct = default);
    Task<CommentItem?> GetAsync(int id, CancellationToken ct = default);
    Task<CommentItem> AddAsync(CommentItem comment, CancellationToken ct = default);
    Task DeleteAsync(CommentItem comment, CancellationToken ct = default);
    Task<IReadOnlyDictionary<int, int>> CountByTaskIdsAsync(
        IReadOnlyCollection<int> taskIds, CancellationToken ct = default);
}
