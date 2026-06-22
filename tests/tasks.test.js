const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/models/Task', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

const Task = require('../src/models/Task');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/tasks', () => {
  it('returns an array of tasks', async () => {
    Task.find.mockResolvedValue([]);
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/tasks', () => {
  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });

  it('creates a task and returns 201', async () => {
    const fakeTask = { _id: '64a1b2c3d4e5f6a7b8c9d0e1', title: 'Buy groceries', status: 'todo' };
    Task.create.mockResolvedValue(fakeTask);
    const res = await request(app).post('/api/tasks').send({ title: 'Buy groceries' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns a task by id', async () => {
    const fakeTask = { _id: '64a1b2c3d4e5f6a7b8c9d0e1', title: 'Buy groceries', status: 'todo' };
    Task.findById.mockResolvedValue(fakeTask);
    const res = await request(app).get('/api/tasks/64a1b2c3d4e5f6a7b8c9d0e1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Buy groceries');
  });

  it('returns 404 when task does not exist', async () => {
    Task.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/tasks/nonexistentid');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('updates a task and returns it', async () => {
    const updatedTask = { _id: '64a1b2c3d4e5f6a7b8c9d0e1', title: 'Buy groceries', status: 'done' };
    Task.findByIdAndUpdate.mockResolvedValue(updatedTask);
    const res = await request(app).put('/api/tasks/64a1b2c3d4e5f6a7b8c9d0e1').send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and returns a success message', async () => {
    const fakeTask = { _id: '64a1b2c3d4e5f6a7b8c9d0e1', title: 'Buy groceries' };
    Task.findByIdAndDelete.mockResolvedValue(fakeTask);
    const res = await request(app).delete('/api/tasks/64a1b2c3d4e5f6a7b8c9d0e1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted');
  });
});

describe('PUT /api/tasks/:id - not found', () => {
  it('returns 404 when task does not exist', async () => {
    Task.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/tasks/nonexistentid').send({ status: 'done' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id - not found', () => {
  it('returns 404 when task does not exist', async () => {
    Task.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/tasks/nonexistentid');
    expect(res.status).toBe(404);
  });
});

describe('Error handling', () => {
  it('returns 500 when getAllTasks throws', async () => {
    Task.find.mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(500);
  });

  it('returns 500 when createTask throws', async () => {
    Task.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app).post('/api/tasks').send({ title: 'Test' });
    expect(res.status).toBe(500);
  });
});

describe('Integration: create then fetch by id', () => {
  it('creates a task then retrieves it by id', async () => {
    const fakeTask = { _id: '64a1b2c3d4e5f6a7b8c9d0e1', title: 'Integration test task', status: 'todo' };
    Task.create.mockResolvedValue(fakeTask);
    Task.findById.mockResolvedValue(fakeTask);

    const createRes = await request(app).post('/api/tasks').send({ title: 'Integration test task' });
    expect(createRes.status).toBe(201);

    const getRes = await request(app).get(`/api/tasks/${createRes.body._id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe('Integration test task');
  });
});
