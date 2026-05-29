import type { Customer, Sale } from './types';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  if (res.status === 401) {
    window.location.href = '/login';
    return null as T;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const getCustomers = (params: { q?: string; limit?: number; offset?: number; sort_by?: string; sort_dir?: 'asc' | 'desc' } = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
  const query = qs.toString();
  return request<{ items: Customer[]; total: number }>('GET', query ? `/customer?${query}` : '/customer');
};
export const createCustomer = (data: Record<string, unknown>) =>
  request<Customer>('POST', '/customer', data);
export const updateCustomer = (id: number, data: Record<string, unknown>) =>
  request<Customer>('PUT', `/customer/${id}`, data);

export const getSales = () => request<Sale[]>('GET', '/sale');
export const createSale = (data: Record<string, unknown>) =>
  request<Sale>('POST', '/sale', data);
export const updateSale = (id: number, data: Record<string, unknown>) =>
  request<Sale>('PUT', `/sale/${id}`, data);
export const deleteSale = (id: number) => request<null>('DELETE', `/sale/${id}`);
