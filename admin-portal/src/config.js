const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4200/api/v1`;
  }
  return 'http://localhost:4200/api/v1';
};

export const config = {
  apiUrl: getApiUrl(),
};
