import api from './api'

// Thin wrapper over the /api/tasks endpoints. Keeping HTTP details in one
// module means components never import axios directly — which also makes them
// trivial to test with a mocked service.

export async function listTasks(status) {
  const params = status && status !== 'all' ? { status } : {}
  const { data } = await api.get('/api/tasks', { params })
  return data
}

export async function getTask(id) {
  const { data } = await api.get(`/api/tasks/${id}`)
  return data
}

export async function createTask(task) {
  const { data } = await api.post('/api/tasks', task)
  return data
}

export async function updateTask(id, task) {
  const { data } = await api.put(`/api/tasks/${id}`, task)
  return data
}

export async function deleteTask(id) {
  await api.delete(`/api/tasks/${id}`)
}
