const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4200/api/v1`;
  }
  return 'http://localhost:4200/api/v1';
};

const getUserPortalUrl = () => {
  if (process.env.NEXT_PUBLIC_USER_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_USER_PORTAL_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

export const config = {
  apiUrl: getApiUrl(),
  userPortalUrl: getUserPortalUrl(),
};
