import { describe, test, expect, beforeEach } from 'vitest';
import { GetEmailFromCookie, GetUsernameFromCookie } from '../utils/CookieRetriever';

describe('CookieRetriever Utilities', () => {
  beforeEach(() => {
    // Limpiamos las cookies antes de cada test
    document.cookie = 'user=; path=/; max-age=0';
  });

  test('GetEmailFromCookie returns empty string if no cookie exists', () => {
    expect(GetEmailFromCookie()).toBe("");
  });

  test('GetEmailFromCookie returns email from valid JSON cookie', () => {
    const userData = JSON.stringify({ email: 'test@example.com', username: 'testuser' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;
    
    expect(GetEmailFromCookie()).toBe('test@example.com');
  });

  test('GetEmailFromCookie handles malformed JSON by returning decoded string', () => {
    const malformed = "not-json-data";
    document.cookie = `user=${malformed}; path=/`;
    
    // Según tu código, si falla el JSON.parse, devuelve el valor decodificado
    expect(GetEmailFromCookie()).toBe('not-json-data');
  });

  test('GetUsernameFromCookie returns "User" if no cookie exists', () => {
    expect(GetUsernameFromCookie()).toBe("User");
  });

  test('GetUsernameFromCookie returns username from valid cookie', () => {
    const userData = JSON.stringify({ email: 'a@a.com', username: 'Pablo' });
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;
    
    expect(GetUsernameFromCookie()).toBe('Pablo');
  });

  test('GetUsernameFromCookie returns "User" if username is missing in JSON', () => {
    const userData = JSON.stringify({ email: 'a@a.com' }); // No username
    document.cookie = `user=${encodeURIComponent(userData)}; path=/`;
    
    expect(GetUsernameFromCookie()).toBe('User');
  });

  test('GetUsernameFromCookie returns "User" on parse error', () => {
    document.cookie = `user=invalid-json; path=/`;
    expect(GetUsernameFromCookie()).toBe('User');
  });
});