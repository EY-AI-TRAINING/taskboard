using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public interface ITaskRepository
{
    Task<IReadOnlyList<TaskItem>> ListAsync(string? status, CancellationToken ct = default);
    Task<TaskItem?> GetAsync(int id, CancellationToken ct = default);
    Task<TaskItem> AddAsync(TaskItem task, CancellationToken ct = default);
    Task<TaskItem> UpdateAsync(TaskItem task, CancellationToken ct = default);
    Task DeleteAsync(TaskItem task, CancellationToken ct = default);
}
