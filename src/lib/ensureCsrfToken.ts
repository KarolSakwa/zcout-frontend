function readXsrfToken(): string | null {
  const xsrfCookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='));

  if (!xsrfCookie) {
    return null;
  }

  return decodeURIComponent(xsrfCookie.split('=')[1] ?? '');
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function ensureCsrfToken(): Promise<string> {
  await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'include',
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = readXsrfToken();

    if (token) {
      return token;
    }

    await sleep(40);
  }

  throw new Error('Failed to initialize CSRF token.');
}