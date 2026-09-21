"""Domain errors. The router maps these to HTTP status codes."""


class TaskNotFound(Exception):
    def __init__(self, task_id: int) -> None:
        super().__init__(f"Task {task_id} not found")
        self.task_id = task_id


class InvalidStatus(Exception):
    def __init__(self, status: str) -> None:
        super().__init__(f"Invalid status: {status!r}")
        self.status = status


class CommentNotFound(Exception):
    def __init__(self, comment_id: int) -> None:
        super().__init__(f"Comment {comment_id} not found")
        self.comment_id = comment_id


class InvalidComment(Exception):
    def __init__(self, message: str = "Invalid comment") -> None:
        super().__init__(message)
