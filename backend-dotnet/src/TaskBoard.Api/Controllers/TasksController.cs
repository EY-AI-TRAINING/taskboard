using Microsoft.AspNetCore.Mvc;
using TaskBoard.Api.Models;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;

    public TasksController(ITaskService service) => _service = service;

    /// <summary>List tasks, optionally filtered by <paramref name="status"/>.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponse>>> List(
        [FromQuery] string? status, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.ListAsync(status, ct));
        }
        catch (InvalidStatusException ex)
        {
            return UnprocessableEntity(new { error = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Get(int id, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetAsync(id, ct));
        }
        catch (TaskNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(CreateTaskRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _service.CreateAsync(request, ct);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidStatusException ex)
        {
            return UnprocessableEntity(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Update(int id, UpdateTaskRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.UpdateAsync(id, request, ct));
        }
        catch (TaskNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidStatusException ex)
        {
            return UnprocessableEntity(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (TaskNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
