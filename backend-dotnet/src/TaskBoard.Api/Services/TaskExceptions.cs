namespace TaskBoard.Api.Services;

public class TaskNotFoundException : Exception
{
    public TaskNotFoundException(int id) : base($"Task {id} not found") => Id = id;
    public int Id { get; }
}

public class InvalidStatusException : Exception
{
    public InvalidStatusException(string status) : base($"Invalid status: '{status}'") => Status = status;
    public string Status { get; }
}

public class CommentNotFoundException : Exception
{
    public CommentNotFoundException(int id) : base($"Comment {id} not found") => Id = id;
    public int Id { get; }
}

public class InvalidCommentException : Exception
{
    public InvalidCommentException(string message) : base(message) { }
}
