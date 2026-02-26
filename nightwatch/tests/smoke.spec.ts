import { test, expect } from '@playwright/test';

const BACKEND_URL = 'https://gmai-backend.onrender.com';

test('homepage loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);
  const body = await page.textContent('body');
  expect(body).toBeTruthy();
  expect(body!.length).toBeGreaterThan(0);
});

test('API health check', async ({ request }) => {
  const response = await request.get(`${BACKEND_URL}/health`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.status).toBe('ok');
});

test('game list loads', async ({ request }) => {
  const response = await request.get(`${BACKEND_URL}/api/games`);
  expect(response.status()).toBe(200);
  const games = await response.json();
  expect(Array.isArray(games)).toBe(true);
  expect(games.length).toBeGreaterThan(0);
});

test('game query returns answer', async ({ request }) => {
  // First get a game ID from the list
  const gamesResponse = await request.get(`${BACKEND_URL}/api/games`);
  const games = await gamesResponse.json();
  const gameId = games[0]?.id || 'chess';

  const response = await request.post(`${BACKEND_URL}/api/query`, {
    data: {
      game_id: gameId,
      question: 'How do you win this game?',
    },
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.answer).toBeTruthy();
  expect(data.answer.length).toBeGreaterThan(20);
});
