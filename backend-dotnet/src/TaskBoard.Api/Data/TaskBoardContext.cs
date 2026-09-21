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
    public DbSet<CommentItem> Comments => Set<CommentItem>();

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

        var comment = modelBuilder.Entity<CommentItem>();
        comment.ToTable("comments");
        comment.HasKey(c => c.Id);
        comment.Property(c => c.Id).HasColumnName("id");
        comment.Property(c => c.TaskId).HasColumnName("task_id");
        comment.Property(c => c.Author).HasColumnName("author");
        comment.Property(c => c.Body).HasColumnName("body");
        comment.Property(c => c.CreatedAt).HasColumnName("created_at")
            .ValueGeneratedOnAdd();
        comment.HasOne<TaskItem>()
            .WithMany()
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
