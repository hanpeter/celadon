import { getSales, createSale, updateSale, deleteSale, getCustomers } from './api.js';

const PAGE_SIZE = 20;

const COLUMNS = [
    { field: 'sales_date', label: 'Sales Date' },
    { field: 'customer_name', label: 'Customer', summary: true },
    { field: 'description', label: 'Description', summary: true },
    { field: 'sale_price_won', label: 'Price (₩)', summary: true },
    { field: 'status', label: 'Status', summary: true },
    { field: 'paid_date', label: 'Paid Date', tablet: false },
    { field: 'shipped_date', label: 'Shipped Date', tablet: false },
    { field: 'shipping_cost_dollar', label: 'Shipping ($)', tablet: false },
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
    selectedIds: new Set(),
};

let modal = null;
let viewModal = null;
let editingId = null;
const warningToastEls = { paid: null, shipped: null };

export function init() {
    renderShell();
    modal = new bootstrap.Modal(document.getElementById('sale-modal'));
    viewModal = new bootstrap.Modal(document.getElementById('sale-view-modal'));
    bindEvents();
    loadSales();
}

/** Clears bulk row selection when entering mobile layout (checkboxes hidden; otherwise Edit stays disabled). */
export function clearBulkSelectionForMobile() {
    if (!state.selectedIds.size) return;
    state.selectedIds.clear();
    if (!document.getElementById('sale-table')) return;
    updateBulkToolbar();
    renderBody();
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

        <div id="bulk-toolbar" class="d-none d-flex align-items-center gap-2 mb-2 p-2 bg-light rounded border">
            <span id="bulk-count" class="text-muted small me-auto">0 selected</span>
            <button id="btn-bulk-paid" class="btn btn-outline-primary btn-sm" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-1" viewBox="0 0 16 16">
                    <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                </svg>Paid
            </button>
            <button id="btn-bulk-shipped" class="btn btn-outline-success btn-sm" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-1" viewBox="0 0 16 16">
                    <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z"/>
                    <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                </svg>Shipped
            </button>
            <button id="btn-bulk-delete" class="btn btn-outline-danger btn-sm" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-1" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>Delete
            </button>
        </div>

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
            <div class="modal-dialog modal-lg modal-fullscreen-sm-down">
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

        <!-- View Modal (read-only) -->
        <div class="modal fade" id="sale-view-modal" tabindex="-1" aria-labelledby="sale-view-modal-title" aria-hidden="true">
            <div class="modal-dialog modal-fullscreen-sm-down">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="sale-view-modal-title">Sale Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <dl id="sale-view-fields" class="row mb-0"></dl>
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
    document.getElementById('btn-add-sale').addEventListener('click', openAddModal);
    document.getElementById('sale-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('filter-unpaid').addEventListener('click', () => {
        state.filterStatus = state.filterStatus === 'unpaid' ? null : 'unpaid';
        state.page = 1;
        state.selectedIds.clear();
        updateFilterButtons();
        renderTable();
        updateBulkToolbar();
    });

    document.getElementById('filter-unshipped').addEventListener('click', () => {
        state.filterStatus = state.filterStatus === 'unshipped' ? null : 'unshipped';
        state.page = 1;
        state.selectedIds.clear();
        updateFilterButtons();
        renderTable();
        updateBulkToolbar();
    });

    document.getElementById('filter-customer').addEventListener('change', (e) => {
        state.filterCustomerId = e.target.value ? Number(e.target.value) : null;
        state.page = 1;
        state.selectedIds.clear();
        renderTable();
        updateBulkToolbar();
    });

    document.getElementById('btn-bulk-paid').addEventListener('click', bulkMarkPaid);
    document.getElementById('btn-bulk-shipped').addEventListener('click', bulkMarkShipped);
    document.getElementById('btn-bulk-delete').addEventListener('click', bulkDelete);

    document.getElementById('table-body').addEventListener('change', (e) => {
        const cb = e.target.closest('.row-checkbox');
        if (cb) {
            const id = Number(cb.dataset.id);
            if (cb.checked) {
                state.selectedIds.add(id);
            } else {
                state.selectedIds.delete(id);
            }
            renderBody();
            updateBulkToolbar();
        }
    });

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
                detailRow.classList.toggle('row-detail-expanded', isExpanding);
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
        const viewBtn = e.target.closest('.btn-view-sale');
        if (viewBtn) {
            openViewModal(Number(viewBtn.dataset.id));
            return;
        }

        // Edit button
        const editBtn = e.target.closest('.btn-edit-sale');
        if (editBtn) {
            openEditModal(Number(editBtn.dataset.id));
            return;
        }

        // Mark paid button
        const paidBtn = e.target.closest('.btn-mark-paid');
        if (paidBtn) {
            markPaid(Number(paidBtn.dataset.id));
            return;
        }

        // Mark shipped button
        const shippedBtn = e.target.closest('.btn-mark-shipped');
        if (shippedBtn) {
            openShippedModal(Number(shippedBtn.dataset.id));
            return;
        }

        // Delete button
        const deleteBtn = e.target.closest('.btn-delete-sale');
        if (deleteBtn) {
            handleDelete(Number(deleteBtn.dataset.id));
        }
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
        state.selectedIds.clear();
        populateCustomerFilter();
        renderTable();
        updateBulkToolbar();
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

    // Select-all checkbox — hidden on mobile
    const selectAllTh = `<th class="col-checkbox d-none d-sm-table-cell" style="width:1px">
        <input type="checkbox" class="form-check-input" id="select-all-checkbox" aria-label="Select all">
    </th>`;

    // Toggle header — visible at tablet only
    const expandTh = `<th class="col-toggle d-none d-sm-table-cell d-lg-none" aria-label="Expand"></th>`;

    const dataThs = COLUMNS.map(({ field, label, tablet }) => {
        const tabletClass = tablet === false ? ' d-none d-lg-table-cell' : '';
        return `
            <th scope="col" class="sortable-col${tabletClass}" data-field="${field}" role="button" tabindex="0">
                ${label} ${sortIcon(field)}
            </th>
        `;
    }).join('');

    // Actions header: visible on desktop only
    const actionsTh = `<th scope="col" class="d-none d-lg-table-cell" style="width:1px"></th>`;

    row.innerHTML = selectAllTh + expandTh + dataThs + actionsTh;

    row.querySelectorAll('.sortable-col').forEach((th) => {
        th.addEventListener('click', () => toggleSort(th.dataset.field));
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleSort(th.dataset.field);
        });
    });

    const selectAllCb = document.getElementById('select-all-checkbox');
    if (selectAllCb) {
        selectAllCb.addEventListener('change', () => {
            const pageIds = getPageIds();
            if (selectAllCb.checked) {
                pageIds.forEach((id) => state.selectedIds.add(id));
            } else {
                pageIds.forEach((id) => state.selectedIds.delete(id));
            }
            renderBody();
            updateBulkToolbar();
        });
    }
}

function renderBody() {
    const tbody = document.getElementById('table-body');

    const filtered = applyFilters([...state.sales]);

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="99" class="text-center text-muted py-4">${state.sales.length ? 'No sales match the current filters.' : 'No sales found.'}</td></tr>`;
        return;
    }

    const sorted = sortSales(filtered);
    const start = (state.page - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);
    state.totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

    // Total visible columns at tablet = expand + non-tablet-false columns
    const tabletColspan = 1 + COLUMNS.filter((c) => c.tablet !== false).length;

    tbody.innerHTML = page.map((sale) => {
        const isSelected = state.selectedIds.has(sale.id);
        const rowDisabled = isSelected ? 'disabled' : '';

        const dataCells = COLUMNS.map(({ field, label, summary, tablet }) => {
            const tabletClass = tablet === false ? ' col-desktop-only' : '';
            const summaryAttr = summary ? ' data-summary="1"' : '';
            return `<td data-label="${label}"${summaryAttr} class="${tabletClass.trim()}">${renderCell(field, sale)}</td>`;
        }).join('');

        // Per-row checkbox — hidden on mobile
        const checkboxTd = `
            <td class="col-checkbox d-none d-sm-table-cell" style="width:1px">
                <input type="checkbox" class="form-check-input row-checkbox" data-id="${sale.id}" aria-label="Select row" ${isSelected ? 'checked' : ''}>
            </td>`;

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

        // Mobile actions cell — hidden by default, shown when card is expanded
        const mobileActionsTd = `
            <td class="col-mobile-actions">
                <button class="btn btn-outline-dark btn-sm btn-edit-sale" data-id="${sale.id}" aria-label="Edit" ${rowDisabled}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-primary btn-sm btn-mark-paid" data-id="${sale.id}" aria-label="Mark as paid" ${sale.status !== 'SOLD' || isSelected ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                    </svg>
                </button>
                <button class="btn btn-outline-success btn-sm btn-mark-shipped" data-id="${sale.id}" aria-label="Mark as shipped" ${sale.status !== 'PAID' || isSelected ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z"/>
                        <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                    </svg>
                </button>
                <button class="btn btn-outline-danger btn-sm btn-delete-sale" data-id="${sale.id}" aria-label="Delete" ${rowDisabled}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                </button>
            </td>`;

        // Actions cell (desktop only) — dropdown hidden when row is selected
        const actionsTd = `
            <td class="text-end col-desktop-only">
                <div class="dropdown${isSelected ? ' invisible' : ''}">
                    <button class="btn btn-sm btn-actions-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Actions">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                        </svg>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item di-dark btn-edit-sale" data-id="${sale.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-2" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>Edit
                        </button></li>
                        <li><button class="dropdown-item di-primary btn-mark-paid" data-id="${sale.id}" ${sale.status !== 'SOLD' ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-2" viewBox="0 0 16 16">
                                <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                            </svg>Paid
                        </button></li>
                        <li><button class="dropdown-item di-success btn-mark-shipped" data-id="${sale.id}" ${sale.status !== 'PAID' ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-2" viewBox="0 0 16 16">
                                <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z"/>
                                <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                            </svg>Shipped
                        </button></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item di-danger btn-delete-sale" data-id="${sale.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="me-2" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                            </svg>Delete
                        </button></li>
                    </ul>
                </div>
            </td>`;

        // Detail row (tablet only) — hidden by default; all buttons disabled when row is selected
        const detailRow = `
            <tr class="row-detail">
                <td colspan="${tabletColspan}" class="row-detail-cell">
                    <button class="btn btn-outline-secondary btn-sm btn-view-sale me-1" data-id="${sale.id}" aria-label="View" ${rowDisabled}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                        </svg>
                        View
                    </button>
                    <button class="btn btn-outline-dark btn-sm btn-edit-sale me-1" data-id="${sale.id}" aria-label="Edit" ${rowDisabled}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-outline-primary btn-sm btn-mark-paid me-1" data-id="${sale.id}" aria-label="Mark as paid" ${sale.status !== 'SOLD' || isSelected ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z"/>
                        </svg>
                        Paid
                    </button>
                    <button class="btn btn-outline-success btn-sm btn-mark-shipped me-1" data-id="${sale.id}" aria-label="Mark as shipped" ${sale.status !== 'PAID' || isSelected ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z"/>
                            <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                        </svg>
                        Shipped
                    </button>
                    <button class="btn btn-outline-danger btn-sm btn-delete-sale" data-id="${sale.id}" aria-label="Delete" ${rowDisabled}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                        Delete
                    </button>
                </td>
            </tr>`;

        return `<tr data-id="${sale.id}">${checkboxTd}${expandTd}${dataCells}${actionsTd}${mobileActionsTd}${cardToggleTd}</tr>${detailRow}`;
    }).join('');
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
                state.selectedIds.clear();
                renderTable();
                updateBulkToolbar();
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
    state.selectedIds.clear();
    renderTable();
    updateBulkToolbar();
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

function openViewModal(id) {
    const sale = state.sales.find((s) => s.id === id);
    if (!sale) return;
    const title = sale.customer_name || 'Sale Details';
    document.getElementById('sale-view-modal-title').textContent = title;
    document.getElementById('sale-view-fields').innerHTML = COLUMNS.map(({ field, label }) => {
        const display = renderCell(field, sale) || '<span class="text-muted">—</span>';
        return `
            <dt class="col-5 text-muted fw-normal small">${label}</dt>
            <dd class="col-7">${display}</dd>
        `;
    }).join('');
    viewModal.show();
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

async function handleDelete(id) {
    const sale = state.sales.find((s) => s.id === id);
    if (!sale) return;
    const label = sale.customer_name ? `sale for ${sale.customer_name}` : 'this sale';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
        await deleteSale(id);
        showToast('Sale deleted.', 'success');
        await loadSales();
    } catch (err) {
        showToast(err.message, 'danger');
    }
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

// --- Bulk Actions ---

function getPageIds() {
    const filtered = applyFilters([...state.sales]);
    const sorted = sortSales(filtered);
    const start = (state.page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE).map((s) => s.id);
}

function updateBulkToolbar() {
    const count = state.selectedIds.size;
    const toolbar = document.getElementById('bulk-toolbar');
    const countEl = document.getElementById('bulk-count');
    const paidBtn = document.getElementById('btn-bulk-paid');
    const shippedBtn = document.getElementById('btn-bulk-shipped');
    const deleteBtn = document.getElementById('btn-bulk-delete');
    if (!toolbar) return;

    if (count === 0) {
        toolbar.classList.add('d-none');
        toolbar.classList.remove('d-flex');
        updateWarningToast('paid', false, '');
        updateWarningToast('shipped', false, '');
        return;
    }

    toolbar.classList.remove('d-none');
    toolbar.classList.add('d-flex');
    countEl.textContent = `${count} selected`;
    deleteBtn.disabled = false;

    const selectedSales = state.sales.filter((s) => state.selectedIds.has(s.id));

    const ineligibleForPaid = selectedSales.filter((s) => s.status !== 'SOLD');
    const ineligibleForShipped = selectedSales.filter((s) => s.status !== 'PAID');

    const paidDisabled = ineligibleForPaid.length > 0;
    const shippedDisabled = ineligibleForShipped.length > 0;

    paidBtn.disabled = paidDisabled;
    shippedBtn.disabled = shippedDisabled;

    updateWarningToast('paid', paidDisabled, `${ineligibleForPaid.length} sale(s) cannot be marked as paid.`);
    updateWarningToast('shipped', shippedDisabled, `${ineligibleForShipped.length} sale(s) cannot be marked as shipped.`);

    // Update select-all checkbox state
    const pageIds = getPageIds();
    const selectAllCb = document.getElementById('select-all-checkbox');
    if (selectAllCb && pageIds.length > 0) {
        const selectedOnPage = pageIds.filter((id) => state.selectedIds.has(id)).length;
        selectAllCb.checked = selectedOnPage === pageIds.length;
        selectAllCb.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
    }
}

function updateWarningToast(key, show, message) {
    const existing = warningToastEls[key];

    if (!show) {
        if (existing) {
            const instance = bootstrap.Toast.getInstance(existing);
            if (instance) instance.hide();
            else existing.remove();
            warningToastEls[key] = null;
        }
        return;
    }

    if (existing) {
        existing.querySelector('.toast-body').textContent = message;
        return;
    }

    const container = document.getElementById('toast-container');
    const id = `toast-warning-${key}`;
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-bg-warning border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `);
    const el = document.getElementById(id);
    warningToastEls[key] = el;
    const toast = new bootstrap.Toast(el, { autohide: false });
    el.addEventListener('hidden.bs.toast', () => {
        el.remove();
        warningToastEls[key] = null;
    });
    toast.show();
}

async function bulkMarkPaid() {
    const today = new Date().toISOString().slice(0, 10);
    const eligible = state.sales.filter((s) => state.selectedIds.has(s.id) && s.status === 'SOLD');
    if (!eligible.length) return;
    try {
        await Promise.all(eligible.map((s) => updateSale(s.id, { ...saleToFormData(s), paid_date: today })));
        showToast(`${eligible.length} sale(s) marked as paid.`, 'success');
        state.selectedIds.clear();
        await loadSales();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function bulkMarkShipped() {
    const today = new Date().toISOString().slice(0, 10);
    const eligible = state.sales.filter((s) => state.selectedIds.has(s.id) && s.status === 'PAID');
    if (!eligible.length) return;
    try {
        await Promise.all(eligible.map((s) => updateSale(s.id, { ...saleToFormData(s), shipped_date: today })));
        showToast(`${eligible.length} sale(s) marked as shipped.`, 'success');
        state.selectedIds.clear();
        await loadSales();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function bulkDelete() {
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} sale(s)? This cannot be undone.`)) return;
    try {
        await Promise.all(ids.map((id) => deleteSale(id)));
        showToast(`${ids.length} sale(s) deleted.`, 'success');
        state.selectedIds.clear();
        await loadSales();
    } catch (err) {
        showToast(err.message, 'danger');
    }
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
