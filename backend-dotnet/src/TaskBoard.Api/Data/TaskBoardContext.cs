using Microsoft.EntityFrameworkCore;
using TaskBoard.Api.Models;

namespace TaskBoard.Api.Data;

/// <summary>
/// EF Core context mapped onto the existing PostgreSQL schema. Migrations are
/// intentionally NOT used — database/schema.sql is the single source of truth.
/// </summary>
public class TaskBoardContext : DbContext
{
    public TaskBoardContext(DbContextOptions<TaskBoardContext> options) : base(options)
    {
    }

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TaskItem>();
        task.ToTable("tasks");
        task.HasKey(t => t.Id);
        task.Property(t => t.Id).HasColumnName("id");
        task.Property(t => t.Title).HasColumnName("title");
        task.Property(t => t.Description).HasColumnName("description");
        task.Property(t => t.Status).HasColumnName("status");
        task.Property(t => t.Assignee).HasColumnName("assignee");
        // The database fills these in (DEFAULT now() on insert, trigger on
        // update). Tell EF so it reads the values back instead of sending zeros.
        task.Property(t => t.CreatedAt).HasColumnName("created_at")
            .ValueGeneratedOnAdd();
        task.Property(t => t.UpdatedAt).HasColumnName("updated_at")
            .ValueGeneratedOnAddOrUpdate();
    }
}
