using Microsoft.AspNetCore.Mvc;
using Moq;
using TaskBoard.Api.Controllers;
using TaskBoard.Api.Models;
using TaskBoard.Api.Services;
using Xunit;

namespace TaskBoard.Api.Tests;

public class TasksControllerTests
{
    private readonly Mock<ITaskService> _service = new();
    private readonly TasksController _sut;

    public TasksControllerTests() => _sut = new TasksController(_service.Object);

    private static TaskResponse Response(int id = 1) =>
        new(id, "Sample", null, TaskStatuses.Todo, null, DateTime.UtcNow, DateTime.UtcNow);

    [Fact]
    public async Task List_ReturnsOkWithTasks()
    {
        _service.Setup(s => s.ListAsync(null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<TaskResponse> { Response() });

        var action = await _sut.List(null, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(action.Result);
        var tasks = Assert.IsAssignableFrom<IReadOnlyList<TaskResponse>>(ok.Value);
        Assert.Single(tasks);
    }

    [Fact]
    public async Task List_ReturnsUnprocessableEntityForBadStatus()
    {
        _service.Setup(s => s.ListAsync("bad", It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidStatusException("bad"));

        var action = await _sut.List("bad", CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(action.Result);
    }

    [Fact]
    public async Task Get_ReturnsNotFoundWhenMissing()
    {
        _service.Setup(s => s.GetAsync(9, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new TaskNotFoundException(9));

        var action = await _sut.Get(9, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(action.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtAction()
    {
        _service.Setup(s => s.CreateAsync(It.IsAny<CreateTaskRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(Response(42));

        var action = await _sut.Create(new CreateTaskRequest { Title = "New" }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(action.Result);
        Assert.Equal(nameof(TasksController.Get), created.ActionName);
        Assert.Equal(42, ((TaskResponse)created.Value!).Id);
    }

    [Fact]
    public async Task Update_ReturnsNotFoundWhenMissing()
    {
        _service.Setup(s => s.UpdateAsync(3, It.IsAny<UpdateTaskRequest>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new TaskNotFoundException(3));

        var action = await _sut.Update(3, new UpdateTaskRequest { Title = "x", Status = TaskStatuses.Todo },
            CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(action.Result);
    }

    [Fact]
    public async Task Delete_ReturnsNoContentOnSuccess()
    {
        _service.Setup(s => s.DeleteAsync(1, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.Delete(1, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }
}
