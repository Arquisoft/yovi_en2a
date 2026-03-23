const COOKIE_NAME = 'user';
const COOKIE_MAX_AGE = 1800; // 30 minutes in seconds

export interface UserCookieData {
  username: string;
  email: string;
}

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
};

export function GetUserFromCookie(): UserCookieData | null {
  const cookieValue = getCookie(COOKIE_NAME);
  if (!cookieValue) return null;
  try {
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch {
    return null;
  }
}

export function GetEmailFromCookie(): string {
  return GetUserFromCookie()?.email ?? '';
}

export function GetUsernameFromCookie(): string {
  return GetUserFromCookie()?.username ?? 'User';
}

export function IsLoggedIn(): boolean {
  return GetUserFromCookie() !== null;
}

export function SetUserCookie(username: string, email: string): void {
  const userData = JSON.stringify({ username, email });
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(userData)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ClearUserCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
