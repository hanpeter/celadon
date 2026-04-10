import { getCustomers, createCustomer, updateCustomer } from './api.js';

const PAGE_SIZE = 20;

const COLUMNS = [
    { field: 'name', label: 'Name', summary: true },
    { field: 'nickname', label: 'Nickname', summary: true },
    { field: 'phone_number', label: 'Phone', tablet: false, inputType: 'tel' },
    { field: 'address', label: 'Address' },
    { field: 'postal_code', label: 'Postal Code', tablet: false },
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
let viewModal = null;
let editingId = null;

export function init() {
    renderShell();
    modal = new bootstrap.Modal(document.getElementById('customer-modal'));
    viewModal = new bootstrap.Modal(document.getElementById('customer-view-modal'));
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
            <div class="modal-dialog modal-fullscreen-sm-down">
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

        <!-- View Modal (read-only) -->
        <div class="modal fade" id="customer-view-modal" tabindex="-1" aria-labelledby="customer-view-modal-title" aria-hidden="true">
            <div class="modal-dialog modal-fullscreen-sm-down">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="customer-view-modal-title">Customer Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <dl id="customer-view-fields" class="row mb-0"></dl>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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

    document.getElementById('table-body').addEventListener('click', (e) => {
        // Tablet row expand toggle (chevron at left of row)
        const rowExpandBtn = e.target.closest('.btn-row-expand');
        if (rowExpandBtn) {
            const mainRow = rowExpandBtn.closest('tr');
            const detailRow = mainRow.nextElementSibling;
            const isExpanding = !mainRow.classList.contains('card-expanded');
            mainRow.classList.toggle('card-expanded', isExpanding);
            rowExpandBtn.setAttribute('aria-expanded', String(isExpanding));
            if (detailRow?.classList.contains('row-detail')) {
                detailRow.classList.toggle('d-none', !isExpanding);
            }
            return;
        }

        // Mobile card expand toggle (button at bottom of card)
        const cardExpandBtn = e.target.closest('.btn-card-expand');
        if (cardExpandBtn) {
            const mainRow = cardExpandBtn.closest('tr');
            const isExpanding = !mainRow.classList.contains('card-expanded');
            mainRow.classList.toggle('card-expanded', isExpanding);
            cardExpandBtn.setAttribute('aria-expanded', String(isExpanding));
            return;
        }

        // View button (tablet detail row)
        const viewBtn = e.target.closest('.btn-view-customer');
        if (viewBtn) {
            openViewModal(Number(viewBtn.dataset.id));
            return;
        }

        // Edit button
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            openEditModal(Number(editBtn.dataset.id));
        }
    });
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

    // Toggle header — visible at tablet only (hidden at mobile via card CSS, hidden at desktop via d-lg-none)
    const expandTh = `<th class="col-toggle d-none d-sm-table-cell d-lg-none" aria-label="Expand"></th>`;

    const dataThs = COLUMNS.map(({ field, label, tablet }) => {
        const tabletClass = tablet === false ? ' d-none d-lg-table-cell' : '';
        return `
            <th scope="col" class="sortable-col${tabletClass}" data-field="${field}" role="button" tabindex="0">
                ${label} ${sortIcon(field)}
            </th>
        `;
    }).join('');

    // Actions header: visible on desktop only (tablet shows actions in detail row)
    const actionsTh = `<th scope="col" class="text-end d-none d-lg-table-cell">Actions</th>`;

    row.innerHTML = expandTh + dataThs + actionsTh;

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
        tbody.innerHTML = `<tr><td colspan="99" class="text-center text-muted py-4">No customers found.</td></tr>`;
        return;
    }

    const sorted = sortCustomers([...state.customers]);
    const start = (state.page - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);
    state.totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

    // Total visible columns at tablet = expand + non-tablet-false columns
    const tabletColspan = 1 + COLUMNS.filter((c) => c.tablet !== false).length;

    tbody.innerHTML = page.map((customer) => {
        const dataCells = COLUMNS.map(({ field, label, summary, tablet }) => {
            const value = customer[field] ?? '';
            const summaryAttr = summary ? ' data-summary="1"' : '';
            const tabletClass = tablet === false ? ' col-desktop-only' : '';
            if (field === 'nickname' && value) {
                return `<td data-label="${label}"${summaryAttr} class="${tabletClass.trim()}">`
                    + `<a href="https://instagram.com/${escapeHtml(String(value))}" target="_blank" rel="noopener noreferrer">@${escapeHtml(String(value))}</a>`
                    + `</td>`;
            }
            return `<td data-label="${label}"${summaryAttr} class="${tabletClass.trim()}">${escapeHtml(String(value))}</td>`;
        }).join('');

        // Tablet toggle cell — left chevron, visible at tablet only (576px–991px)
        const expandTd = `
            <td class="col-toggle d-none d-sm-table-cell d-lg-none">
                <button class="btn-row-expand" aria-label="Expand row" aria-expanded="false">
                    <svg class="chevron-right" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                    </svg>
                    <svg class="chevron-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                    </svg>
                </button>
            </td>`;

        // Mobile expand/collapse button — bottom of card, visible at mobile only (<576px)
        const cardToggleTd = `
            <td class="col-card-toggle" data-summary="1">
                <button class="btn-card-expand" aria-label="Expand card" aria-expanded="false">
                    <span class="expand-label">Expand</span>
                    <span class="collapse-label">Collapse</span>
                    <svg class="chevron-down" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                    </svg>
                    <svg class="chevron-up" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
                    </svg>
                </button>
            </td>`;

        // Actions cell (desktop only)
        const actionsTd = `
            <td class="text-end text-nowrap card-actions-cell col-desktop-only">
                <button class="btn btn-outline-secondary btn-sm btn-edit" data-id="${customer.id}" aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                    <span class="btn-label ms-1">Edit</span>
                </button>
            </td>`;

        // Detail row (tablet only) — hidden by default
        const detailRow = `
            <tr class="row-detail d-none d-lg-none">
                <td colspan="${tabletColspan}" class="row-detail-cell">
                    <button class="btn btn-outline-secondary btn-sm btn-view-customer me-1" data-id="${customer.id}" aria-label="View">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                        </svg>
                        View
                    </button>
                    <button class="btn btn-outline-secondary btn-sm btn-edit" data-id="${customer.id}" aria-label="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                        Edit
                    </button>
                </td>
            </tr>`;

        return `<tr data-id="${customer.id}">${expandTd}${dataCells}${actionsTd}${cardToggleTd}</tr>${detailRow}`;
    }).join('');
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
    return COLUMNS.map(({ field, label, inputType }) => `
        <div class="mb-3">
            <label for="field-${field}" class="form-label">${label}</label>
            <input
                type="${inputType ?? 'text'}"
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

function openViewModal(id) {
    const customer = state.customers.find((c) => c.id === id);
    if (!customer) return;
    document.getElementById('customer-view-modal-title').textContent = customer.name || 'Customer Details';
    document.getElementById('customer-view-fields').innerHTML = COLUMNS.map(({ field, label }) => {
        const value = customer[field] ?? '';
        const display = (field === 'nickname' && value)
            ? `<a href="https://instagram.com/${escapeHtml(String(value))}" target="_blank" rel="noopener noreferrer">@${escapeHtml(String(value))}</a>`
            : escapeHtml(String(value)) || '<span class="text-muted">—</span>';
        return `
            <dt class="col-5 text-muted fw-normal small">${label}</dt>
            <dd class="col-7">${display}</dd>
        `;
    }).join('');
    viewModal.show();
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
