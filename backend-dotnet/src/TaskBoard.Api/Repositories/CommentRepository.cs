using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public class CommentRepository : ICommentRepository
{
    private readonly TaskBoardContext _db;

    public CommentRepository(TaskBoardContext db) => _db = db;

    public async Task<IReadOnlyList<CommentItem>> ListByTaskAsync(int taskId, CancellationToken ct = default) =>
        await _db.Comments.AsNoTracking()
            .Where(c => c.TaskId == taskId)
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .ToListAsync(ct);

    public async Task<CommentItem?> GetAsync(int id, CancellationToken ct = default) =>
        await _db.Comments.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<CommentItem> AddAsync(CommentItem comment, CancellationToken ct = default)
    {
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(ct);
        await _db.Entry(comment).ReloadAsync(ct);
        return comment;
    }

    public async Task DeleteAsync(CommentItem comment, CancellationToken ct = default)
    {
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyDictionary<int, int>> CountByTaskIdsAsync(
        IReadOnlyCollection<int> taskIds, CancellationToken ct = default)
    {
        if (taskIds.Count == 0)
            return new Dictionary<int, int>();

        var grouped = await _db.Comments.AsNoTracking()
            .Where(c => taskIds.Contains(c.TaskId))
            .GroupBy(c => c.TaskId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return taskIds.ToDictionary(id => id, id => grouped.FirstOrDefault(g => g.Key == id)?.Count ?? 0);
    }
}
