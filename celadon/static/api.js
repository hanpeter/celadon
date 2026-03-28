async function request(method, path, body) {
    const options = {
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
    if (res.status === 204) return null;
    return res.json();
}

export const getCustomers = () => request('GET', '/customer');
export const createCustomer = (data) => request('POST', '/customer', data);
export const updateCustomer = (id, data) => request('PUT', `/customer/${id}`, data);

export const getSales = () => request('GET', '/sale');
export const createSale = (data) => request('POST', '/sale', data);
export const updateSale = (id, data) => request('PUT', `/sale/${id}`, data);
