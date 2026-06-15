const BASE = '/api';

async function request(method, path, body, isFormData) {
  const opts = {
    method,
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'שגיאה בשרת');
  return data;
}

export const api = {
  login: (mobile) => request('POST', '/auth/login', { mobile }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),

  submitSales: (data) => request('POST', '/sales', data),
  getMySales: (month) => request('GET', `/sales/my${month ? `?month=${month}` : ''}`),
  getDistrictSales: (month, district) =>
    request('GET', `/sales/district?${new URLSearchParams({ ...(month && { month }), ...(district && { district }) })}`),
  getManagementSales: (month) => request('GET', `/sales/management${month ? `?month=${month}` : ''}`),

  importUsers: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/admin/import', fd, true);
  },
  getUsers: () => request('GET', '/admin/users'),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
  getDistricts: () => request('GET', '/admin/districts'),
};
