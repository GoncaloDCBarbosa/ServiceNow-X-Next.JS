type SnQueryParams = Record<string, string>;

export interface SnResult<T = Record<string, string>> {
  result: T[];
}

function getCredentials() {
  const instance = process.env.SN_INSTANCE;
  const user = process.env.SN_USER;
  const password = process.env.SN_PASSWORD;

  if (!instance || !user || !password) {
    throw new Error(
      "ServiceNow connection is not configured. Set SN_INSTANCE, SN_USER and SN_PASSWORD in .env.local."
    );
  }

  return { instance, user, password };
}

/**
 * GET against a ServiceNow Table API endpoint, shared by every API route
 * so auth, error handling, and defaults live in one place.
 */
export async function snTableGet(
  table: string,
  params: SnQueryParams = {}
): Promise<SnResult> {
  const { instance, user, password } = getCredentials();

  const url = new URL(`/api/now/table/${table}`, instance);
  url.searchParams.set("sysparm_limit", "50");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const auth = Buffer.from(`${user}:${password}`).toString("base64");

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const raw = await res.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `ServiceNow returned a non-JSON response (status ${res.status}).`
    );
  }

  if (!res.ok) {
    const errorBody = data as { error?: { message?: string; detail?: string } };
    const message =
      errorBody?.error?.message ||
      errorBody?.error?.detail ||
      `ServiceNow request failed with status ${res.status}.`;
    throw new Error(message);
  }

  return data as SnResult;
}
