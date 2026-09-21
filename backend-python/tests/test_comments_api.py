"""End-to-end tests for nested /api/tasks/{id}/comments endpoints."""


async def test_list_comments_oldest_first(client, fake_repo, fake_comments):
    task = fake_repo.seed(title="Discuss")
    fake_comments.seed(task.id, author="Priya", body="Second", minutes=5)
    fake_comments.seed(task.id, author="Ana", body="First", minutes=0)

    resp = await client.get(f"/api/tasks/{task.id}/comments")
    assert resp.status_code == 200
    bodies = [c["body"] for c in resp.json()]
    assert bodies == ["First", "Second"]
    assert resp.json()[0]["author"] == "Ana"
    assert resp.json()[0]["task_id"] == task.id


async def test_list_comments_empty_when_task_exists(client, fake_repo):
    task = fake_repo.seed(title="Quiet")
    resp = await client.get(f"/api/tasks/{task.id}/comments")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_comments_missing_task_returns_404(client):
    resp = await client.get("/api/tasks/999/comments")
    assert resp.status_code == 404


async def test_create_comment(client, fake_repo):
    task = fake_repo.seed(title="Discuss")
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={"author": "Ana", "body": "Looks good to merge."},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == 1
    assert body["task_id"] == task.id
    assert body["author"] == "Ana"
    assert body["body"] == "Looks good to merge."
    assert "created_at" in body


async def test_create_comment_missing_task_returns_404(client):
    resp = await client.post(
        "/api/tasks/999/comments",
        json={"author": "Ana", "body": "Nope"},
    )
    assert resp.status_code == 404


async def test_create_comment_requires_author(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={"body": "Missing author"},
    )
    assert resp.status_code == 422


async def test_create_comment_rejects_blank_body(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={"author": "Ana", "body": "   "},
    )
    assert resp.status_code == 422


async def test_create_comment_rejects_author_too_long(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={"author": "A" * 101, "body": "ok"},
    )
    assert resp.status_code == 422


async def test_create_comment_rejects_body_too_long(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={"author": "Ana", "body": "x" * 501},
    )
    assert resp.status_code == 422


async def test_create_comment_ignores_client_created_at(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.post(
        f"/api/tasks/{task.id}/comments",
        json={
            "author": "Ana",
            "body": "Hi",
            "created_at": "1999-01-01T00:00:00",
            "id": 99,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == 1


async def test_delete_comment(client, fake_repo, fake_comments):
    task = fake_repo.seed()
    comment = fake_comments.seed(task.id)
    resp = await client.delete(f"/api/tasks/{task.id}/comments/{comment.id}")
    assert resp.status_code == 204
    listed = await client.get(f"/api/tasks/{task.id}/comments")
    assert listed.json() == []


async def test_delete_missing_comment_returns_404(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.delete(f"/api/tasks/{task.id}/comments/999")
    assert resp.status_code == 404


async def test_delete_comment_wrong_task_returns_404(client, fake_repo, fake_comments):
    task_a = fake_repo.seed(title="A")
    task_b = fake_repo.seed(title="B")
    comment = fake_comments.seed(task_a.id)
    resp = await client.delete(f"/api/tasks/{task_b.id}/comments/{comment.id}")
    assert resp.status_code == 404


async def test_delete_comment_missing_task_returns_404(client):
    resp = await client.delete("/api/tasks/999/comments/1")
    assert resp.status_code == 404


async def test_delete_task_cascades_comments(client, fake_repo, fake_comments):
    task = fake_repo.seed()
    fake_comments.seed(task.id, body="Gone with the task")
    resp = await client.delete(f"/api/tasks/{task.id}")
    assert resp.status_code == 204
    follow = await client.get(f"/api/tasks/{task.id}/comments")
    assert follow.status_code == 404
