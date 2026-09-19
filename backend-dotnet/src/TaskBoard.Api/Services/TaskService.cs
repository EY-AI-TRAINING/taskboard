using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;

namespace TaskBoard.Api.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repo;

    public TaskService(ITaskRepository repo) => _repo = repo;

    public async Task<IReadOnlyList<TaskResponse>> ListAsync(string? status, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(status) && !TaskStatuses.IsValid(status))
            throw new InvalidStatusException(status);

        var tasks = await _repo.ListAsync(status, ct);
        return tasks.Select(TaskResponse.From).ToList();
    }

    public async Task<TaskResponse> GetAsync(int id, CancellationToken ct = default)
    {
        var task = await _repo.GetAsync(id, ct) ?? throw new TaskNotFoundException(id);
        return TaskResponse.From(task);
    }

    public async Task<TaskResponse> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        var status = string.IsNullOrWhiteSpace(request.Status) ? TaskStatuses.Todo : request.Status;
        if (!TaskStatuses.IsValid(status))
            throw new InvalidStatusException(status);

        var task = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            Status = status,
            Assignee = request.Assignee,
        };
        var created = await _repo.AddAsync(task, ct);
        return TaskResponse.From(created);
    }

    public async Task<TaskResponse> UpdateAsync(int id, UpdateTaskRequest request, CancellationToken ct = default)
    {
        if (!TaskStatuses.IsValid(request.Status))
            throw new InvalidStatusException(request.Status);

        var task = await _repo.GetAsync(id, ct) ?? throw new TaskNotFoundException(id);
        task.Title = request.Title;
        task.Description = request.Description;
        task.Status = request.Status;
        task.Assignee = request.Assignee;

        var updated = await _repo.UpdateAsync(task, ct);
        return TaskResponse.From(updated);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await _repo.GetAsync(id, ct) ?? throw new TaskNotFoundException(id);
        await _repo.DeleteAsync(task, ct);
    }
}
