import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'

// vi.hoisted runs before everything — creates the mock object before vi.mock is registered
const redisMock = vi.hoisted(() => ({
  on: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
}))

// vi.mock is hoisted above static imports — when users-service.js imports ./redis-client.js,
// Vitest returns redisMock as the default export instead of the real Redis client
vi.mock('../redis-client.js', () => ({ default: redisMock }))

import app from '../users-service.js'

// Helper: get a CSRF token + cookie from the app
async function getCsrfToken() {
  const res = await request(app).get('/api/csrf-token')
  const cookieHeader = res.headers['set-cookie']?.find(c => c.startsWith('csrf_token='))
  const cookieValue = cookieHeader?.split(';')[0]
  return { cookie: cookieValue, token: res.body.csrfToken }
}

beforeEach(() => {
  vi.clearAllMocks()
  redisMock.setex.mockResolvedValue('OK')
  redisMock.get.mockResolvedValue(null)
  redisMock.del.mockResolvedValue(1)
  redisMock.on.mockImplementation(() => {})
})

describe('GET /api/csrf-token', () => {
  it('returns a csrfToken and sets the csrf_token cookie', async () => {
    const res = await request(app).get('/api/csrf-token')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('csrfToken')
    expect(res.headers['set-cookie']?.join()).toContain('csrf_token=')
  })
})

describe('GET /api/me', () => {
  it('returns 401 when no session cookie is present', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Not authenticated/)
  })

  it('returns 401 when session is not found in Redis', async () => {
    redisMock.get.mockResolvedValueOnce(null)
    const res = await request(app).get('/api/me').set('Cookie', 'sessionId=invalid')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Session expired or invalid/)
  })

  it('returns 200 with user data when session exists', async () => {
    redisMock.get.mockResolvedValueOnce(JSON.stringify({ username: 'Alice', email: 'alice@test.com' }))
    const res = await request(app).get('/api/me').set('Cookie', 'sessionId=valid')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ username: 'Alice', email: 'alice@test.com' })
  })

  it('returns 500 when Redis throws', async () => {
    redisMock.get.mockRejectedValueOnce(new Error('Redis down'))
    const res = await request(app).get('/api/me').set('Cookie', 'sessionId=any')
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/Session store unavailable/)
  })
})

describe('POST /api/logout', () => {
  it('returns 403 without CSRF token', async () => {
    const res = await request(app).post('/api/logout')
    expect(res.status).toBe(403)
  })

  it('clears the session and responds with 200', async () => {
    const { cookie, token } = await getCsrfToken()
    const res = await request(app)
      .post('/api/logout')
      .set('Cookie', `${cookie}; sessionId=some-session`)
      .set('X-CSRF-Token', token)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Logged out/)
    expect(redisMock.del).toHaveBeenCalled()
  })
})

describe('POST /api/login', () => {
  it('returns 403 without CSRF token', async () => {
    const res = await request(app).post('/api/login').send({ email: 'a@a.com', password: 'pass' })
    expect(res.status).toBe(403)
  })

  it('returns 200 and sets session cookie on successful login', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ username: 'Alice', email: 'alice@test.com', message: 'OK' })
    })
    const res = await request(app)
      .post('/api/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'alice@test.com', password: 'pass' })
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.join()).toContain('sessionId=')
  })

  it('returns 401 for invalid credentials', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ error: 'Bad credentials' })
    })
    const res = await request(app)
      .post('/api/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'bad@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Invalid email or password/)
  })

  it('returns generic error for non-401 auth failure', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({ error: 'Server error' })
    })
    const res = await request(app)
      .post('/api/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'a@a.com', password: 'pass' })
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/Login failed/)
  })

  it('returns 500 when auth service is unreachable', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await request(app)
      .post('/api/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'a@a.com', password: 'pass' })
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/Unable to reach the authentication service/)
  })
})

describe('POST /api/register', () => {
  it('returns 200 and sets session cookie on successful registration', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ username: 'NewUser', email: 'new@test.com', message: 'Welcome!' })
    })
    const res = await request(app)
      .post('/api/register')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'new@test.com', username: 'NewUser', password: 'pass' })
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.join()).toContain('sessionId=')
  })

  it('returns error when email already exists', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 409,
      json: async () => ({ error: 'User already exists' })
    })
    const res = await request(app)
      .post('/api/register')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'existing@test.com', username: 'User', password: 'pass' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('returns generic error on other registration failure', async () => {
    const { cookie, token } = await getCsrfToken()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ error: 'Something went wrong' })
    })
    const res = await request(app)
      .post('/api/register')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ email: 'a@a.com', username: 'U', password: 'pass' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Registration failed/)
  })
})

describe('POST /api/update-username', () => {
  it('returns 401 when no session cookie', async () => {
    const { cookie, token } = await getCsrfToken()
    const res = await request(app)
      .post('/api/update-username')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ username: 'NewName' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Not authenticated/)
  })

  it('returns 401 when session not found in Redis', async () => {
    const { cookie, token } = await getCsrfToken()
    redisMock.get.mockResolvedValueOnce(null)
    const res = await request(app)
      .post('/api/update-username')
      .set('Cookie', `${cookie}; sessionId=invalid`)
      .set('X-CSRF-Token', token)
      .send({ username: 'NewName' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Session expired or invalid/)
  })

  it('returns 400 when username is missing', async () => {
    const { cookie, token } = await getCsrfToken()
    redisMock.get.mockResolvedValueOnce(JSON.stringify({ username: 'Alice', email: 'a@a.com' }))
    const res = await request(app)
      .post('/api/update-username')
      .set('Cookie', `${cookie}; sessionId=valid`)
      .set('X-CSRF-Token', token)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Username is required/)
  })

  it('returns 200 and updates username successfully', async () => {
    const { cookie, token } = await getCsrfToken()
    redisMock.get.mockResolvedValueOnce(JSON.stringify({ username: 'Alice', email: 'a@a.com' }))
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({})
    })
    const res = await request(app)
      .post('/api/update-username')
      .set('Cookie', `${cookie}; sessionId=valid`)
      .set('X-CSRF-Token', token)
      .send({ username: 'NewAlice' })
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('NewAlice')
  })

  it('returns 500 when Redis throws', async () => {
    const { cookie, token } = await getCsrfToken()
    redisMock.get.mockRejectedValueOnce(new Error('Redis down'))
    const res = await request(app)
      .post('/api/update-username')
      .set('Cookie', `${cookie}; sessionId=valid`)
      .set('X-CSRF-Token', token)
      .send({ username: 'NewName' })
    expect(res.status).toBe(500)
  })
})

describe('POST /createuser', () => {
  it('returns a greeting message for the provided username', async () => {
    const res = await request(app).post('/createuser').send({ username: 'Pablo' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Hello Pablo/i)
  })
})
