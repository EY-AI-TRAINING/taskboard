namespace TaskBoard.Api.Models;

/// <summary>
/// Entity mapped onto the existing <c>comments</c> table. The database owns the schema.
/// </summary>
public class CommentItem
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public string Author { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
