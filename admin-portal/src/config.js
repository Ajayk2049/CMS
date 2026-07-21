const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4200/api/v1`;
  }
  return 'http://localhost:4200/api/v1';
};

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    return `ws://${window.location.hostname}:4200`;
  }
  return 'ws://localhost:4200';
};

export const config = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
};
