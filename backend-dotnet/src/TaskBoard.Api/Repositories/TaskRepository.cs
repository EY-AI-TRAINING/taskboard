using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Data;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly TaskBoardContext _db;

    public TaskRepository(TaskBoardContext db) => _db = db;

    public async Task<IReadOnlyList<TaskItem>> ListAsync(string? status, CancellationToken ct = default)
    {
        IQueryable<TaskItem> query = _db.Tasks.AsNoTracking().OrderBy(t => t.Id);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);
        return await query.ToListAsync(ct);
    }

    public async Task<TaskItem?> GetAsync(int id, CancellationToken ct = default) =>
        await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<TaskItem> AddAsync(TaskItem task, CancellationToken ct = default)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);
        // created_at / updated_at are filled by the database (DEFAULT now()),
        // so reload to return the real values rather than CLR defaults.
        await _db.Entry(task).ReloadAsync(ct);
        return task;
    }

    public async Task<TaskItem> UpdateAsync(TaskItem task, CancellationToken ct = default)
    {
        await _db.SaveChangesAsync(ct);
        // The BEFORE UPDATE trigger bumps updated_at; reload to see it.
        await _db.Entry(task).ReloadAsync(ct);
        return task;
    }

    public async Task DeleteAsync(TaskItem task, CancellationToken ct = default)
    {
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync(ct);
    }
}
