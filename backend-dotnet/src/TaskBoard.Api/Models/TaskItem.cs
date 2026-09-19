namespace TaskBoard.Api.Models;

/// <summary>
/// Entity mapped onto the existing <c>tasks</c> table. Column names are set in
/// <see cref="Data.TaskBoardContext"/>; the database owns the schema.
/// </summary>
public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = TaskStatuses.Todo;
    public string? Assignee { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public static class TaskStatuses
{
    public const string Todo = "todo";
    public const string InProgress = "in-progress";
    public const string Done = "done";

    public static readonly IReadOnlySet<string> All =
        new HashSet<string> { Todo, InProgress, Done };

    public static bool IsValid(string status) => All.Contains(status);
}
