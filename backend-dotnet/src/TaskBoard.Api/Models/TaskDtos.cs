using System.ComponentModel.DataAnnotations;

namespace TaskBoard.Api.Models;

public record TaskResponse(
    int Id,
    string Title,
    string? Description,
    string Status,
    string? Assignee,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static TaskResponse From(TaskItem t) =>
        new(t.Id, t.Title, t.Description, t.Status, t.Assignee, t.CreatedAt, t.UpdatedAt);
}

public class CreateTaskRequest
{
    [Required]
    [StringLength(255, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [StringLength(50)]
    public string Status { get; set; } = TaskStatuses.Todo;

    [StringLength(100)]
    public string? Assignee { get; set; }
}

public class UpdateTaskRequest
{
    [Required]
    [StringLength(255, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [StringLength(50)]
    public string Status { get; set; } = TaskStatuses.Todo;

    [StringLength(100)]
    public string? Assignee { get; set; }
}
