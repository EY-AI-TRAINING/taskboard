using TaskBoard.Api.Models;

namespace TaskBoard.Api.Services;

public interface ITaskService
{
    Task<IReadOnlyList<TaskResponse>> ListAsync(string? status, CancellationToken ct = default);
    Task<TaskResponse> GetAsync(int id, CancellationToken ct = default);
    Task<TaskResponse> CreateAsync(CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskResponse> UpdateAsync(int id, UpdateTaskRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
