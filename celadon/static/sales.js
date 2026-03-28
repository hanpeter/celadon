import { getSales, createSale, updateSale, getCustomers } from './api.js';

const PAGE_SIZE = 20;

const COLUMNS = [
    { field: 'sales_date', label: 'Sales Date' },
    { field: 'customer_name', label: 'Customer' },
    { field: 'description', label: 'Description' },
    { field: 'sale_price_won', label: 'Price (₩)' },
    { field: 'status', label: 'Status' },
    { field: 'paid_date', label: 'Paid Date' },
    { field: 'shipped_date', label: 'Shipped Date' },
    { field: 'shipping_cost_dollar', label: 'Shipping ($)' },
];

const STATUS_BADGE = {
    SOLD: 'secondary',
    PAID: 'primary',
    SHIPPED: 'success',
};

let state = {
    sales: [],
    customers: [],
    sortField: 'sales_date',
    sortDir: 'desc',
    page: 1,
    totalPages: 1,
    filterStatus: null,
    filterCustomerId: null,
};

let modal = null;
let editingId = null;

export function init() {
    renderShell();
    modal = new bootstrap.Modal(document.getElementById('sale-modal'));
    bindEvents();
    loadSales();
}

function renderShell() {
    document.getElementById('app').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">Sales</h4>
            <button id="btn-add-sale" class="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg me-1" viewBox="0 0 16 16">
                    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
                </svg>
                Add Sale
            </button>
        </div>

        <div class="d-flex gap-2 flex-wrap mb-3">
            <div class="btn-group btn-group-sm" role="group" aria-label="Status filter">
                <button id="filter-unpaid" class="btn btn-outline-primary" type="button">To Be Paid</button>
                <button id="filter-unshipped" class="btn btn-outline-success" type="button">To Be Shipped</button>
            </div>
            <select id="filter-customer" class="form-select form-select-sm" style="width: auto;">
                <option value="">All customers</option>
            </select>
        </div>

        <div id="table-error" class="alert alert-danger d-none" role="alert"></div>

        <div class="table-responsive">
            <table class="table table-hover align-middle" id="sale-table">
                <thead class="table-light">
                    <tr id="table-head-row"></tr>
                </thead>
                <tbody id="table-body">
                    <tr><td colspan="${COLUMNS.length + 1}" class="text-center text-muted py-4">Loading…</td></tr>
                </tbody>
            </table>
        </div>

        <nav id="pagination-nav" aria-label="Sale pagination" class="d-none">
            <ul class="pagination pagination-sm justify-content-end mb-0" id="pagination"></ul>
        </nav>

        <!-- Add/Edit Modal -->
        <div class="modal fade" id="sale-modal" tabindex="-1" aria-labelledby="sale-modal-title" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="sale-modal-title">Sale</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="sale-form" novalidate>
                            <div id="modal-error" class="alert alert-danger d-none" role="alert"></div>
                            <div id="sale-fields"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" form="sale-form" id="btn-save-sale" class="btn btn-primary">Save</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast container -->
        <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container"></div>
    `;
}

function bindEvents() {
    document.getElementById('btn-add-sale').addEventListener('click', openAddModal);
    document.getElementById('sale-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('filter-unpaid').addEventListener('click', () => {
        state.filterStatus = state.filterStatus === 'unpaid' ? null : 'unpaid';
        state.page = 1;
        updateFilterButtons();
        renderTable();
    });

    document.getElementById('filter-unshipped').addEventListener('click', () => {
        state.filterStatus = state.filterStatus === 'unshipped' ? null : 'unshipped';
        state.page = 1;
        updateFilterButtons();
        renderTable();
    });

    document.getElementById('filter-customer').addEventListener('change', (e) => {
        state.filterCustomerId = e.target.value ? Number(e.target.value) : null;
        state.page = 1;
        renderTable();
    });
}

function updateFilterButtons() {
    const unpaidBtn = document.getElementById('filter-unpaid');
    const unshippedBtn = document.getElementById('filter-unshipped');
    if (!unpaidBtn || !unshippedBtn) return;

    unpaidBtn.className = `btn btn-sm ${state.filterStatus === 'unpaid' ? 'btn-primary' : 'btn-outline-primary'}`;
    unshippedBtn.className = `btn btn-sm ${state.filterStatus === 'unshipped' ? 'btn-success' : 'btn-outline-success'}`;
}

function applyFilters(list) {
    return list.filter((s) => {
        if (state.filterStatus === 'unpaid' && s.status !== 'SOLD') return false;
        if (state.filterStatus === 'unshipped' && s.status !== 'PAID') return false;
        if (state.filterCustomerId && s.customer_id !== state.filterCustomerId) return false;
        return true;
    });
}

async function loadSales() {
    setTableError(null);
    try {
        [state.sales, state.customers] = await Promise.all([getSales(), getCustomers()]);
        state.page = 1;
        populateCustomerFilter();
        renderTable();
    } catch (err) {
        setTableError(err.message);
    }
}

function populateCustomerFilter() {
    const select = document.getElementById('filter-customer');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All customers</option>' +
        state.customers
            .slice()
            .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
            .map((c) => `<option value="${c.id}" ${String(c.id) === current ? 'selected' : ''}>${escapeHtml(c.name ?? '')}${c.nickname ? ` (@${escapeHtml(c.nickname)})` : ''}</option>`)
            .join('');
}

// --- Rendering ---

function renderTable() {
    renderHeaders();
    renderBody();
    renderPagination();
}

function renderHeaders() {
    const row = document.getElementById('table-head-row');
    const sortIcon = (field) => {
        if (state.sortField !== field) return '<span class="sort-icon text-muted">⇅</span>';
        return state.sortDir === 'asc' ? '<span class="sort-icon">↑</span>' : '<span class="sort-icon">↓</span>';
    };

    row.innerHTML = COLUMNS.map(({ field, label }) => `
        <th scope="col" class="sortable-col" data-field="${field}" role="button" tabindex="0">
            ${label} ${sortIcon(field)}
        </th>
    `).join('') + '<th scope="col" class="text-end">Actions</th>';

    row.querySelectorAll('.sortable-col').forEach((th) => {
        th.addEventListener('click', () => toggleSort(th.dataset.field));
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleSort(th.dataset.field);
        });
    });
}

function renderBody() {
    const tbody = document.getElementById('table-body');

    const filtered = applyFilters([...state.sales]);

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}" class="text-center text-muted py-4">${state.sales.length ? 'No sales match the current filters.' : 'No sales found.'}</td></tr>`;
        return;
    }

    const sorted = sortSales(filtered);
    const start = (state.page - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);
    state.totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

    tbody.innerHTML = page.map((sale) => `
        <tr data-id="${sale.id}">
            ${COLUMNS.map(({ field }) => `<td>${renderCell(field, sale)}</td>`).join('')}
            <td class="text-end text-nowrap">
                <button class="btn btn-outline-dark btn-sm btn-edit-sale me-1" data-id="${sale.id}" aria-label="Edit" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-primary btn-sm btn-mark-paid me-1" data-id="${sale.id}" aria-label="Mark as paid" title="Mark as paid" ${sale.status !== 'SOLD' ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-success btn-sm btn-mark-shipped" data-id="${sale.id}" aria-label="Mark as shipped" title="Mark as shipped" ${sale.status !== 'PAID' ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z"/>
                        <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit-sale').forEach((btn) => {
        btn.addEventListener('click', () => openEditModal(Number(btn.dataset.id)));
    });
    tbody.querySelectorAll('.btn-mark-paid').forEach((btn) => {
        btn.addEventListener('click', () => markPaid(Number(btn.dataset.id)));
    });
    tbody.querySelectorAll('.btn-mark-shipped').forEach((btn) => {
        btn.addEventListener('click', () => openShippedModal(Number(btn.dataset.id)));
    });
}

function renderCell(field, sale) {
    const value = sale[field];

    switch (field) {
        case 'sales_date':
        case 'paid_date':
        case 'shipped_date':
            return value ? escapeHtml(formatDate(value)) : '<span class="text-muted">—</span>';

        case 'customer_name': {
            const nick = sale.customer_nickname;
            const name = escapeHtml(String(value ?? ''));
            if (nick) {
                return `${name} <a href="https://instagram.com/${escapeHtml(nick)}" target="_blank" rel="noopener noreferrer" class="text-muted small">@${escapeHtml(nick)}</a>`;
            }
            return name;
        }

        case 'sale_price_won':
            return value != null
                ? `₩${Number(value).toLocaleString()}`
                : '<span class="text-muted">—</span>';

        case 'shipping_cost_dollar':
            return value != null
                ? `$${Number(value).toFixed(2)}`
                : '<span class="text-muted">—</span>';

        case 'status': {
            const badge = STATUS_BADGE[value] ?? 'secondary';
            return `<span class="badge text-bg-${badge}">${escapeHtml(String(value ?? ''))}</span>`;
        }

        default:
            return escapeHtml(String(value ?? ''));
    }
}

function renderPagination() {
    const nav = document.getElementById('pagination-nav');
    const ul = document.getElementById('pagination');

    if (state.totalPages <= 1) {
        nav.classList.add('d-none');
        return;
    }
    nav.classList.remove('d-none');

    const items = [];
    items.push(`
        <li class="page-item ${state.page === 1 ? 'disabled' : ''}">
            <button class="page-link" data-page="${state.page - 1}" aria-label="Previous">&laquo;</button>
        </li>
    `);
    for (let i = 1; i <= state.totalPages; i++) {
        items.push(`
            <li class="page-item ${i === state.page ? 'active' : ''}">
                <button class="page-link" data-page="${i}">${i}</button>
            </li>
        `);
    }
    items.push(`
        <li class="page-item ${state.page === state.totalPages ? 'disabled' : ''}">
            <button class="page-link" data-page="${state.page + 1}" aria-label="Next">&raquo;</button>
        </li>
    `);

    ul.innerHTML = items.join('');
    ul.querySelectorAll('.page-link:not([disabled])').forEach((btn) => {
        btn.addEventListener('click', () => {
            const p = Number(btn.dataset.page);
            if (p >= 1 && p <= state.totalPages) {
                state.page = p;
                renderTable();
            }
        });
    });
}

// --- Sorting ---

function toggleSort(field) {
    if (state.sortField === field) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortField = field;
        state.sortDir = 'asc';
    }
    state.page = 1;
    renderTable();
}

function sortSales(list) {
    if (!state.sortField) return list;
    return list.sort((a, b) => {
        const av = a[state.sortField] ?? '';
        const bv = b[state.sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return state.sortDir === 'asc' ? cmp : -cmp;
    });
}

// --- Modal ---

function buildFormFields(sale) {
    const customerOptions = state.customers.map((c) =>
        `<option value="${c.id}" ${sale?.customer_id === c.id ? 'selected' : ''}>${escapeHtml(c.name ?? '')}${c.nickname ? ` (@${escapeHtml(c.nickname)})` : ''}</option>`
    ).join('');

    const dateVal = (f) => sale?.[f] ? sale[f].slice(0, 10) : '';

    return `
        <div class="row g-3">
            <div class="col-12">
                <label for="sale-customer" class="form-label">Customer</label>
                <select class="form-select" id="sale-customer" name="customer_id" required>
                    <option value="">Select a customer…</option>
                    ${customerOptions}
                </select>
                <div class="invalid-feedback">Please select a customer.</div>
            </div>
            <div class="col-12">
                <label for="sale-description" class="form-label">Description</label>
                <textarea class="form-control" id="sale-description" name="description" rows="2">${escapeHtml(sale?.description ?? '')}</textarea>
            </div>
            <div class="col-sm-6">
                <label for="sale-price" class="form-label">Price (₩)</label>
                <input type="number" class="form-control" id="sale-price" name="sale_price_won" min="0" step="1" value="${sale?.sale_price_won ?? ''}"/>
            </div>
            <div class="col-sm-6">
                <label for="sale-shipping" class="form-label">Shipping ($)</label>
                <input type="number" class="form-control" id="sale-shipping" name="shipping_cost_dollar" min="0" step="0.01" value="${sale?.shipping_cost_dollar ?? ''}"/>
            </div>
            <div class="col-sm-4">
                <label for="sale-sales-date" class="form-label">Sale Date</label>
                <input type="date" class="form-control" id="sale-sales-date" name="sales_date" value="${dateVal('sales_date')}"/>
            </div>
            <div class="col-sm-4">
                <label for="sale-paid-date" class="form-label">Paid Date</label>
                <input type="date" class="form-control" id="sale-paid-date" name="paid_date" value="${dateVal('paid_date')}"/>
            </div>
            <div class="col-sm-4">
                <label for="sale-shipped-date" class="form-label">Shipped Date</label>
                <input type="date" class="form-control" id="sale-shipped-date" name="shipped_date" value="${dateVal('shipped_date')}"/>
            </div>
        </div>
    `;
}

function openAddModal() {
    editingId = null;
    document.getElementById('sale-modal-title').textContent = 'Add Sale';
    document.getElementById('sale-fields').innerHTML = buildFormFields(null);
    document.getElementById('modal-error').classList.add('d-none');
    document.getElementById('sale-form').classList.remove('was-validated');
    modal.show();
}

function openEditModal(id, focusField = null) {
    const sale = state.sales.find((s) => s.id === id);
    if (!sale) return;
    editingId = id;
    document.getElementById('sale-modal-title').textContent = 'Edit Sale';
    document.getElementById('sale-fields').innerHTML = buildFormFields(sale);
    document.getElementById('modal-error').classList.add('d-none');
    document.getElementById('sale-form').classList.remove('was-validated');
    if (focusField) {
        document.getElementById('sale-modal').addEventListener('shown.bs.modal', () => {
            document.getElementById(focusField)?.focus();
        }, { once: true });
    }
    modal.show();
}

async function markPaid(id) {
    const sale = state.sales.find((s) => s.id === id);
    if (!sale) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
        await updateSale(id, { ...saleToFormData(sale), paid_date: today });
        showToast('Marked as paid.', 'success');
        await loadSales();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function openShippedModal(id) {
    const sale = state.sales.find((s) => s.id === id);
    if (!sale) return;
    const today = new Date().toISOString().slice(0, 10);
    editingId = id;
    document.getElementById('sale-modal-title').textContent = 'Edit Sale';
    document.getElementById('sale-fields').innerHTML = buildFormFields({ ...sale, shipped_date: today });
    document.getElementById('modal-error').classList.add('d-none');
    document.getElementById('sale-form').classList.remove('was-validated');
    document.getElementById('sale-modal').addEventListener('shown.bs.modal', () => {
        document.getElementById('sale-shipping')?.focus();
    }, { once: true });
    modal.show();
}

function saleToFormData(sale) {
    return {
        customer_id: sale.customer_id,
        description: sale.description ?? null,
        sale_price_won: sale.sale_price_won ?? null,
        shipping_cost_dollar: sale.shipping_cost_dollar ?? null,
        sales_date: sale.sales_date ? sale.sales_date.slice(0, 10) : null,
        paid_date: sale.paid_date ? sale.paid_date.slice(0, 10) : null,
        shipped_date: sale.shipped_date ? sale.shipped_date.slice(0, 10) : null,
    };
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const raw = Object.fromEntries(new FormData(form).entries());
    const data = sanitizeFormData(raw);

    const btn = document.getElementById('btn-save-sale');
    btn.disabled = true;
    setModalError(null);

    try {
        if (editingId !== null) {
            await updateSale(editingId, data);
            showToast('Sale updated.', 'success');
        } else {
            await createSale(data);
            showToast('Sale added.', 'success');
        }
        modal.hide();
        await loadSales();
    } catch (err) {
        setModalError(err.message);
    } finally {
        btn.disabled = false;
    }
}

function sanitizeFormData(raw) {
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v === '') {
            out[k] = null;
        } else if (k === 'customer_id' || k === 'sale_price_won') {
            out[k] = Number(v);
        } else if (k === 'shipping_cost_dollar') {
            out[k] = parseFloat(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

// --- Utilities ---

function formatDate(iso) {
    if (!iso) return '';
    return iso.slice(0, 10);
}

function setTableError(msg) {
    const el = document.getElementById('table-error');
    if (!el) return;
    if (msg) {
        el.textContent = msg;
        el.classList.remove('d-none');
    } else {
        el.classList.add('d-none');
    }
}

function setModalError(msg) {
    const el = document.getElementById('modal-error');
    if (!el) return;
    if (msg) {
        el.textContent = msg;
        el.classList.remove('d-none');
    } else {
        el.classList.add('d-none');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const id = `toast-${Date.now()}`;
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    toast.show();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
