import { getCustomers, createCustomer, updateCustomer } from './api.js';

const PAGE_SIZE = 20;

const COLUMNS = [
    { field: 'name', label: 'Name' },
    { field: 'nickname', label: 'Nickname' },
    { field: 'cellular_phone_number', label: 'Cellular Phone' },
    { field: 'home_phone_number', label: 'Home Phone' },
    { field: 'address', label: 'Address' },
    { field: 'personal_customs_clearance_code', label: 'Customs Code' },
];

let state = {
    customers: [],
    sortField: null,
    sortDir: 'asc',
    page: 1,
    totalPages: 1,
};

let modal = null;
let editingId = null;

export function init() {
    renderShell();
    modal = new bootstrap.Modal(document.getElementById('customer-modal'));
    bindEvents();
    loadCustomers();
}

function renderShell() {
    document.getElementById('app').innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">Customers</h4>
            <button id="btn-add" class="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg me-1" viewBox="0 0 16 16">
                    <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
                </svg>
                Add Customer
            </button>
        </div>

        <div id="table-error" class="alert alert-danger d-none" role="alert"></div>

        <div class="table-responsive">
            <table class="table table-hover align-middle" id="customer-table">
                <thead class="table-light">
                    <tr id="table-head-row"></tr>
                </thead>
                <tbody id="table-body">
                    <tr><td colspan="99" class="text-center text-muted py-4">Loading…</td></tr>
                </tbody>
            </table>
        </div>

        <nav id="pagination-nav" aria-label="Customer pagination" class="d-none">
            <ul class="pagination pagination-sm justify-content-end mb-0" id="pagination"></ul>
        </nav>

        <!-- Add/Edit Modal -->
        <div class="modal fade" id="customer-modal" tabindex="-1" aria-labelledby="customer-modal-title" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="customer-modal-title">Customer</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form" novalidate>
                            <div id="modal-error" class="alert alert-danger d-none" role="alert"></div>
                            <div id="customer-fields"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" form="customer-form" id="btn-save" class="btn btn-primary">Save</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast container -->
        <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container"></div>
    `;
}

function bindEvents() {
    document.getElementById('btn-add').addEventListener('click', openAddModal);
    document.getElementById('customer-form').addEventListener('submit', handleFormSubmit);
}

async function loadCustomers() {
    setTableError(null);
    try {
        state.customers = await getCustomers();
        state.page = 1;
        renderTable();
    } catch (err) {
        setTableError(err.message);
    }
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

    if (!state.customers.length) {
        tbody.innerHTML = `<tr><td colspan="${COLUMNS.length + 1}" class="text-center text-muted py-4">No customers found.</td></tr>`;
        return;
    }

    const sorted = sortCustomers([...state.customers]);
    const start = (state.page - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);
    state.totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

    tbody.innerHTML = page.map((customer) => `
        <tr data-id="${customer.id}">
            ${COLUMNS.map(({ field }) => {
        const value = customer[field] ?? '';
        if (field === 'nickname' && value) {
            return `<td><a href="https://instagram.com/${escapeHtml(String(value))}" target="_blank" rel="noopener noreferrer">@${escapeHtml(String(value))}</a></td>`;
        }
        return `<td>${escapeHtml(String(value))}</td>`;
    }).join('')}
            <td class="text-end text-nowrap">
                <button class="btn btn-outline-secondary btn-sm btn-edit" data-id="${customer.id}" aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => openEditModal(Number(btn.dataset.id)));
    });
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

function sortCustomers(list) {
    if (!state.sortField) return list;
    return list.sort((a, b) => {
        const av = a[state.sortField] ?? '';
        const bv = b[state.sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return state.sortDir === 'asc' ? cmp : -cmp;
    });
}

// --- Modal helpers ---

function buildFormFields(customer) {
    return COLUMNS.map(({ field, label }) => `
        <div class="mb-3">
            <label for="field-${field}" class="form-label">${label}</label>
            <input
                type="text"
                class="form-control"
                id="field-${field}"
                name="${field}"
                value="${escapeHtml(String(customer?.[field] ?? ''))}"
            />
        </div>
    `).join('');
}

function openAddModal() {
    editingId = null;
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    document.getElementById('customer-fields').innerHTML = buildFormFields(null);
    document.getElementById('modal-error').classList.add('d-none');
    document.getElementById('customer-form').classList.remove('was-validated');
    modal.show();
}

function openEditModal(id) {
    const customer = state.customers.find((c) => c.id === id);
    if (!customer) return;
    editingId = id;
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    document.getElementById('customer-fields').innerHTML = buildFormFields(customer);
    document.getElementById('modal-error').classList.add('d-none');
    document.getElementById('customer-form').classList.remove('was-validated');
    modal.show();
}


async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    setModalError(null);

    try {
        if (editingId !== null) {
            await updateCustomer(editingId, data);
            showToast('Customer updated.', 'success');
        } else {
            await createCustomer(data);
            showToast('Customer added.', 'success');
        }
        modal.hide();
        await loadCustomers();
    } catch (err) {
        setModalError(err.message);
    } finally {
        btn.disabled = false;
    }
}


// --- Utilities ---

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
    const html = `
        <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
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
