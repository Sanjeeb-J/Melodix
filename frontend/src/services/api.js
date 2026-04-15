const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, "")
  : "";

const buildApiError = (message, status = 0, details = null) => {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
};

export const getApiUrl = (path = "") => {
  if (!API_BASE_URL) {
    throw buildApiError(
      "App configuration error: VITE_API_URL is missing.",
      0
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiRequest = async (path, options = {}) => {
  const url = getApiUrl(path);

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw buildApiError(
      "Network error - the Melodix API is unavailable right now.",
      0
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    throw buildApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      payload
    );
  }

  return payload;
};
