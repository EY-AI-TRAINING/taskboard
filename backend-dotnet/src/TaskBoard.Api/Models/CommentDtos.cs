using System.ComponentModel.DataAnnotations;

namespace TaskBoard.Api.Models;

public record CommentResponse(int Id, int TaskId, string Author, string Body, DateTime CreatedAt)
{
    public static CommentResponse From(CommentItem c) =>
        new(c.Id, c.TaskId, c.Author, c.Body, c.CreatedAt);
}

public class CreateCommentRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Author { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Body { get; set; } = string.Empty;
}
