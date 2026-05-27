import type { Customer, Sale } from './types';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const getCustomers = () => request<Customer[]>('GET', '/customer');
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
