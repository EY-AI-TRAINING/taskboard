"""End-to-end tests for every /api/tasks endpoint (via the ASGI app)."""


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_list_empty(client):
    resp = await client.get("/api/tasks")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_filters_by_status(client, fake_repo):
    fake_repo.seed(title="A", status="todo")
    fake_repo.seed(title="B", status="done")
    fake_repo.seed(title="C", status="done")

    resp = await client.get("/api/tasks", params={"status": "done"})
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert titles == ["B", "C"]


async def test_list_rejects_unknown_status(client):
    resp = await client.get("/api/tasks", params={"status": "archived"})
    assert resp.status_code == 422


async def test_get_single_task(client, fake_repo):
    task = fake_repo.seed(title="Wire endpoint")
    resp = await client.get(f"/api/tasks/{task.id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Wire endpoint"
    assert resp.json()["comment_count"] == 0


async def test_list_includes_comment_count(client, fake_repo, fake_comments):
    task = fake_repo.seed(title="Discuss")
    fake_comments.seed(task.id, body="One")
    fake_comments.seed(task.id, body="Two")
    resp = await client.get("/api/tasks")
    assert resp.status_code == 200
    assert resp.json()[0]["comment_count"] == 2


async def test_get_missing_task_returns_404(client):
    resp = await client.get("/api/tasks/999")
    assert resp.status_code == 404


async def test_create_task(client):
    resp = await client.post(
        "/api/tasks",
        json={"title": "New task", "description": "desc", "assignee": "Sam"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == 1
    assert body["status"] == "todo"
    assert body["assignee"] == "Sam"


async def test_create_task_requires_title(client):
    resp = await client.post("/api/tasks", json={"description": "no title"})
    assert resp.status_code == 422


async def test_create_task_rejects_bad_status(client):
    resp = await client.post("/api/tasks", json={"title": "x", "status": "nope"})
    assert resp.status_code == 422


async def test_update_task(client, fake_repo):
    task = fake_repo.seed(title="Old", status="todo")
    resp = await client.put(
        f"/api/tasks/{task.id}",
        json={"title": "Updated", "status": "in-progress"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated"
    assert body["status"] == "in-progress"


async def test_update_missing_task_returns_404(client):
    resp = await client.put("/api/tasks/999", json={"title": "x", "status": "todo"})
    assert resp.status_code == 404


async def test_delete_task(client, fake_repo):
    task = fake_repo.seed()
    resp = await client.delete(f"/api/tasks/{task.id}")
    assert resp.status_code == 204

    follow_up = await client.get(f"/api/tasks/{task.id}")
    assert follow_up.status_code == 404


async def test_delete_missing_task_returns_404(client):
    resp = await client.delete("/api/tasks/999")
    assert resp.status_code == 404


async def test_count_returns_total(client, fake_repo):
    fake_repo.seed(title="A", status="todo")
    fake_repo.seed(title="B", status="done")

    resp = await client.get("/api/tasks/count")
    assert resp.status_code == 200
    assert resp.json() == {"count": 2}


async def test_count_filters_by_status(client, fake_repo):
    fake_repo.seed(title="A", status="todo")
    fake_repo.seed(title="B", status="done")

    resp = await client.get("/api/tasks/count", params={"status": "done"})
    assert resp.status_code == 200
    assert resp.json() == {"count": 1}


async def test_count_rejects_unknown_status(client):
    resp = await client.get("/api/tasks/count", params={"status": "archived"})
    assert resp.status_code == 422
