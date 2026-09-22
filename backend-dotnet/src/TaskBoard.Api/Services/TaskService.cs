using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;

namespace TaskBoard.Api.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repo;
    private readonly ICommentRepository _comments;

    public TaskService(ITaskRepository repo, ICommentRepository comments)
    {
        _repo = repo;
        _comments = comments;
    }

    private async Task<int> CountFor(int taskId, CancellationToken ct) =>
        (await _comments.CountByTaskIdsAsync(new[] { taskId }, ct)).GetValueOrDefault(taskId, 0);

    private async Task<IReadOnlyDictionary<int, int>> CountsFor(
        IReadOnlyList<TaskItem> tasks, CancellationToken ct)
    {
        var ids = tasks.Select(t => t.Id).ToList();
        return await _comments.CountByTaskIdsAsync(ids, ct);
    }

    public async Task<IReadOnlyList<TaskResponse>> ListAsync(string? status, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(status) && !TaskStatuses.IsValid(status))
            throw new InvalidStatusException(status);

        var tasks = await _repo.ListAsync(status, ct);
        var counts = await CountsFor(tasks, ct);
        return tasks.Select(t => TaskResponse.From(t, counts.GetValueOrDefault(t.Id, 0))).ToList();
    }

    public async Task<TaskResponse> GetAsync(int id, CancellationToken ct = default)
    {
        var task = await _repo.GetAsync(id, ct) ?? throw new TaskNotFoundException(id);
        return TaskResponse.From(task, await CountFor(id, ct));
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
        return TaskResponse.From(created, 0);
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
        return TaskResponse.From(updated, await CountFor(id, ct));
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await _repo.GetAsync(id, ct) ?? throw new TaskNotFoundException(id);
        await _repo.DeleteAsync(task, ct);
    }
}
