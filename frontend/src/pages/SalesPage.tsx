import React, { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Form, Modal, Pagination, Toast, ToastContainer } from 'react-bootstrap';
import { getSales, createSale, updateSale, deleteSale, getCustomers } from '../api';
import { useLoad } from '../hooks/useLoad';
import type { Sale } from '../types';

const PAGE_SIZE = 20;

interface Column {
  field: keyof Sale;
  label: string;
  summary?: boolean;
  tablet?: boolean;
}

const COLUMNS: Column[] = [
  { field: 'sales_date', label: 'Sales Date' },
  { field: 'customer_name', label: 'Customer', summary: true },
  { field: 'description', label: 'Description', summary: true },
  { field: 'sale_price_won', label: 'Price (₩)', summary: true },
  { field: 'status', label: 'Status', summary: true },
  { field: 'paid_date', label: 'Paid Date', tablet: false },
  { field: 'shipped_date', label: 'Shipped Date', tablet: false },
  { field: 'shipping_cost_dollar', label: 'Shipping ($)', tablet: false },
];

const STATUS_BADGE: Record<string, string> = {
  SOLD: 'secondary',
  PAID: 'primary',
  SHIPPED: 'success',
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'warning';
  autohide: boolean;
}

export default function SalesPage() {
  const salesLoad = useLoad(() => getSales());
  const customersLoad = useLoad(() => getCustomers().then((r) => r.items));

  const [sortField, setSortField] = useState<keyof Sale>('sales_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'unpaid' | 'unshipped' | null>(null);
  const [filterCustomerId, setFilterCustomerId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const shippingInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const warningToasts = useRef<{ paid: string | null; shipped: string | null }>({ paid: null, shipped: null });

  useEffect(() => {
    salesLoad.load();
    customersLoad.load();
  }, []);

  useEffect(() => {
    if (window.innerWidth < 576) {
      setSelectedIds(new Set());
    }
    const handleResize = () => {
      if (window.innerWidth < 576) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const applyFilters = (list: Sale[]): Sale[] => {
    return list.filter((s) => {
      if (filterStatus === 'unpaid' && s.status !== 'SOLD') return false;
      if (filterStatus === 'unshipped' && s.status !== 'PAID') return false;
      if (filterCustomerId && s.customer_id !== filterCustomerId) return false;
      return true;
    });
  };

  const sortSales = (list: Sale[]): Sale[] => {
    if (!sortField) return list;
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  };

  const filtered = applyFilters(salesLoad.data ?? []);
  const sorted = sortSales(filtered);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);
  const pageIds = pageItems.map((s) => s.id);

  const toggleSort = (field: keyof Sale) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
    setSelectedIds(new Set());
  };

  const formatDate = (iso: string | null): string => {
    return iso ? iso.slice(0, 10) : '';
  };

  const renderCell = (field: keyof Sale, sale: Sale): React.ReactNode => {
    const value = sale[field];

    if (field === 'sales_date' || field === 'paid_date' || field === 'shipped_date') {
      return value ? formatDate(value as string) : <span className="text-muted">—</span>;
    }

    if (field === 'customer_name') {
      const nick = sale.customer_nickname;
      const name = String(value ?? '');
      if (nick) {
        return (
          <>
            {name}{' '}
            <a
              href={`https://instagram.com/@${encodeURIComponent(nick)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted small"
            >
              @{nick}
            </a>
          </>
        );
      }
      return name;
    }

    if (field === 'sale_price_won') {
      return value != null ? `₩${Number(value).toLocaleString()}` : <span className="text-muted">—</span>;
    }

    if (field === 'shipping_cost_dollar') {
      return value != null ? `$${Number(value).toFixed(2)}` : <span className="text-muted">—</span>;
    }

    if (field === 'status') {
      const badge = STATUS_BADGE[String(value)] ?? 'secondary';
      return <span className={`badge text-bg-${badge}`}>{String(value ?? '')}</span>;
    }

    return String(value ?? '');
  };

  const showToast = (message: string, type: 'success' | 'danger' | 'warning' = 'success', autohide = true) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type, autohide }]);
    if (autohide) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  };

  const updateWarningToast = (key: 'paid' | 'shipped', show: boolean, message: string) => {
    if (!show) {
      if (warningToasts.current[key]) {
        setToasts((prev) => prev.filter((t) => t.id !== warningToasts.current[key]));
        warningToasts.current[key] = null;
      }
      return;
    }

    if (warningToasts.current[key]) {
      setToasts((prev) =>
        prev.map((t) => (t.id === warningToasts.current[key] ? { ...t, message } : t))
      );
      return;
    }

    const id = `toast-warning-${key}`;
    setToasts((prev) => [...prev, { id, message, type: 'warning', autohide: false }]);
    warningToasts.current[key] = id;
  };

  const saleToFormData = (sale: Sale): Record<string, unknown> => {
    return {
      customer_id: sale.customer_id,
      description: sale.description ?? null,
      sale_price_won: sale.sale_price_won ?? null,
      shipping_cost_dollar: sale.shipping_cost_dollar ?? null,
      sales_date: sale.sales_date ? sale.sales_date.slice(0, 10) : null,
      paid_date: sale.paid_date ? sale.paid_date.slice(0, 10) : null,
      shipped_date: sale.shipped_date ? sale.shipped_date.slice(0, 10) : null,
    };
  };

  const handleAddSale = () => {
    setEditingId(null);
    setModalError(null);
    setShowAddModal(true);
  };

  const handleEditSale = (id: number) => {
    setEditingId(id);
    setModalError(null);
    setShowAddModal(true);
  };

  const handleMarkPaid = async (id: number) => {
    const sale = salesLoad.data?.find((s) => s.id === id);
    if (!sale) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await updateSale(id, { ...saleToFormData(sale), paid_date: today });
      showToast('Marked as paid.', 'success');
      await salesLoad.load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'danger');
    }
  };

  const handleMarkShipped = (id: number) => {
    const sale = salesLoad.data?.find((s) => s.id === id);
    if (!sale) return;
    setEditingId(id);
    setModalError(null);
    setShowAddModal(true);
    setTimeout(() => {
      if (shippingInputRef.current) {
        shippingInputRef.current.focus();
      }
    }, 100);
  };

  const handleDelete = (id: number) => {
    const sale = salesLoad.data?.find((s) => s.id === id);
    if (!sale) return;
    const label = sale.customer_name ? `sale for ${sale.customer_name}` : 'this sale';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    (async () => {
      try {
        await deleteSale(id);
        showToast('Sale deleted.', 'success');
        await salesLoad.load();
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), 'danger');
      }
    })();
  };

  const handleViewSale = (id: number) => {
    setViewingId(id);
    setShowViewModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const formData = new FormData(form);
    const raw = Object.fromEntries(formData.entries());
    const data: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(raw)) {
      if (v === '') {
        data[k] = null;
      } else if (k === 'customer_id' || k === 'sale_price_won') {
        data[k] = Number(v);
      } else if (k === 'shipping_cost_dollar') {
        data[k] = parseFloat(String(v));
      } else {
        data[k] = v;
      }
    }

    setModalError(null);
    try {
      if (editingId !== null) {
        await updateSale(editingId, data);
        showToast('Sale updated.', 'success');
      } else {
        await createSale(data);
        showToast('Sale added.', 'success');
      }
      setShowAddModal(false);
      await salesLoad.load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    }
  };

  const bulkMarkPaid = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const eligible = (salesLoad.data ?? []).filter((s) => selectedIds.has(s.id) && s.status === 'SOLD');
    if (!eligible.length) return;
    try {
      await Promise.all(
        eligible.map((s) => updateSale(s.id, { ...saleToFormData(s), paid_date: today }))
      );
      showToast(`${eligible.length} sale(s) marked as paid.`, 'success');
      setSelectedIds(new Set());
      await salesLoad.load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'danger');
    }
  };

  const bulkMarkShipped = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const eligible = (salesLoad.data ?? []).filter((s) => selectedIds.has(s.id) && s.status === 'PAID');
    if (!eligible.length) return;
    try {
      await Promise.all(
        eligible.map((s) => updateSale(s.id, { ...saleToFormData(s), shipped_date: today }))
      );
      showToast(`${eligible.length} sale(s) marked as shipped.`, 'success');
      setSelectedIds(new Set());
      await salesLoad.load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'danger');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} sale(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(ids.map((id) => deleteSale(id)));
      showToast(`${ids.length} sale(s) deleted.`, 'success');
      setSelectedIds(new Set());
      await salesLoad.load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'danger');
    }
  };

  useEffect(() => {
    const selectedSales = (salesLoad.data ?? []).filter((s) => selectedIds.has(s.id));
    const ineligibleForPaid = selectedSales.filter((s) => s.status !== 'SOLD');
    const ineligibleForShipped = selectedSales.filter((s) => s.status !== 'PAID');

    updateWarningToast('paid', ineligibleForPaid.length > 0, `${ineligibleForPaid.length} sale(s) cannot be marked as paid.`);
    updateWarningToast('shipped', ineligibleForShipped.length > 0, `${ineligibleForShipped.length} sale(s) cannot be marked as shipped.`);
  }, [selectedIds, salesLoad.data]);

  const sale = editingId ? salesLoad.data?.find((s) => s.id === editingId) : null;
  const viewingSale = viewingId ? salesLoad.data?.find((s) => s.id === viewingId) : null;

  const tabletColspan = 1 + COLUMNS.filter((c) => c.tablet !== false).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set([...selectedIds, ...pageIds]));
    } else {
      const newSet = new Set(selectedIds);
      pageIds.forEach((id) => newSet.delete(id));
      setSelectedIds(newSet);
    }
  };

  const handleRowCheckbox = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const selectAllChecked = selectedOnPage === pageIds.length && pageIds.length > 0;
  const selectAllIndeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Sales</h4>
        <Button variant="primary" size="sm" onClick={handleAddSale}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-plus-lg me-1"
            viewBox="0 0 16 16"
          >
            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2" />
          </svg>
          Add Sale
        </Button>
      </div>

      <div className="d-flex gap-2 flex-wrap mb-3">
        <div className="btn-group btn-group-sm" role="group" aria-label="Status filter">
          <Button
            variant={filterStatus === 'unpaid' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => {
              setFilterStatus(filterStatus === 'unpaid' ? null : 'unpaid');
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            To Be Paid
          </Button>
          <Button
            variant={filterStatus === 'unshipped' ? 'success' : 'outline-success'}
            size="sm"
            onClick={() => {
              setFilterStatus(filterStatus === 'unshipped' ? null : 'unshipped');
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            To Be Shipped
          </Button>
        </div>
        <Form.Select
          size="sm"
          style={{ width: 'auto' }}
          value={filterCustomerId ? String(filterCustomerId) : ''}
          onChange={(e) => {
            setFilterCustomerId(e.target.value ? Number(e.target.value) : null);
            setPage(1);
            setSelectedIds(new Set());
          }}
        >
          <option value="">All customers</option>
          {(customersLoad.data ?? [])
            .slice()
            .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.nickname ? ` (@${c.nickname})` : ''}
              </option>
            ))}
        </Form.Select>
      </div>

      {salesLoad.error && <div className="alert alert-danger" role="alert">{salesLoad.error}</div>}

      <div className={`d-flex align-items-center gap-2 mb-2 p-2 bg-light rounded border ${selectedIds.size === 0 ? 'd-none' : 'd-flex'}`}>
        <span className="text-muted small me-auto">{selectedIds.size} selected</span>
        <Button
          variant="outline-primary"
          size="sm"
          disabled={selectedIds.size === 0 || (salesLoad.data ?? []).filter((s) => selectedIds.has(s.id) && s.status !== 'SOLD').length > 0}
          onClick={bulkMarkPaid}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="currentColor"
            className="me-1"
            viewBox="0 0 16 16"
          >
            <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z" />
          </svg>
          Paid
        </Button>
        <Button
          variant="outline-success"
          size="sm"
          disabled={selectedIds.size === 0 || (salesLoad.data ?? []).filter((s) => selectedIds.has(s.id) && s.status !== 'PAID').length > 0}
          onClick={bulkMarkShipped}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="currentColor"
            className="me-1"
            viewBox="0 0 16 16"
          >
            <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z" />
            <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
          </svg>
          Shipped
        </Button>
        <Button variant="outline-danger" size="sm" disabled={selectedIds.size === 0} onClick={bulkDelete}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            fill="currentColor"
            className="me-1"
            viewBox="0 0 16 16"
          >
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
          </svg>
          Delete
        </Button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle" id="sale-table">
          <thead className="table-light">
            <tr>
              <th className="col-checkbox d-none d-sm-table-cell" style={{ width: '1px' }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectAllChecked}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectAllIndeterminate;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                  aria-label="Select all"
                />
              </th>
              <th className="col-toggle d-none d-sm-table-cell d-lg-none" aria-label="Expand"></th>
              {COLUMNS.map(({ field, label, tablet }) => (
                <th
                  key={field}
                  scope="col"
                  className={`sortable-col${tablet === false ? ' d-none d-lg-table-cell' : ''}`}
                  data-field={field}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSort(field)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleSort(field);
                  }}
                >
                  {label}
                  {sortField === field ? (
                    <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  ) : (
                    <span className="sort-icon text-muted">⇅</span>
                  )}
                </th>
              ))}
              <th scope="col" className="d-none d-lg-table-cell" style={{ width: '1px' }}></th>
            </tr>
          </thead>
          <tbody id="table-body">
            {salesLoad.loading ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="text-center text-muted py-4">
                  Loading…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="text-center text-muted py-4">
                  {(salesLoad.data ?? []).length ? 'No sales match the current filters.' : 'No sales found.'}
                </td>
              </tr>
            ) : (
              pageItems.flatMap((sale) => {
                const isSelected = selectedIds.has(sale.id);
                const isExpanded = expandedRows.has(sale.id);

                return [
                  <tr
                    key={`row-${sale.id}`}
                    data-id={sale.id}
                    className={[isExpanded && 'card-expanded', isSelected && 'selected'].filter(Boolean).join(' ')}
                  >
                    <td className="col-checkbox d-none d-sm-table-cell" style={{ width: '1px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input row-checkbox"
                        data-id={sale.id}
                        checked={isSelected}
                        onChange={(e) => handleRowCheckbox(sale.id, e.currentTarget.checked)}
                        aria-label="Select row"
                      />
                    </td>
                    <td className="col-toggle d-none d-sm-table-cell d-lg-none">
                      <button
                        className="btn-row-expand"
                        aria-label="Expand row"
                        aria-expanded={isExpanded}
                        onClick={() => {
                          setExpandedRows((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(sale.id)) {
                              newSet.delete(sale.id);
                            } else {
                              newSet.add(sale.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <svg className="chevron-right" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
                        </svg>
                        <svg className="chevron-down" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                        </svg>
                      </button>
                    </td>
                    {COLUMNS.map(({ field, label, summary, tablet }) => (
                      <td
                        key={`${sale.id}-${field}`}
                        data-label={label}
                        {...(summary ? { 'data-summary': '1' } : {})}
                        className={tablet === false ? 'col-desktop-only' : ''}
                      >
                        {renderCell(field, sale)}
                      </td>
                    ))}
                    <td className="text-end col-desktop-only">
                      <Dropdown className={isSelected ? 'invisible' : ''} align="end">
                        <Dropdown.Toggle
                          as="button"
                          className="btn btn-sm btn-actions-menu"
                          aria-label="Actions"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                          </svg>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            className="di-dark btn-edit-sale"
                            onClick={() => handleEditSale(sale.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                            </svg>
                            Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="di-primary btn-mark-paid"
                            disabled={sale.status !== 'SOLD'}
                            onClick={() => handleMarkPaid(sale.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                              <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z" />
                            </svg>
                            Paid
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="di-success btn-mark-shipped"
                            disabled={sale.status !== 'PAID'}
                            onClick={() => handleMarkShipped(sale.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                              <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z" />
                              <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
                            </svg>
                            Shipped
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            className="di-danger btn-delete-sale"
                            onClick={() => handleDelete(sale.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                            </svg>
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                    <td className="col-mobile-actions">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleViewSale(sale.id)}
                        disabled={isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline-dark"
                        size="sm"
                        onClick={() => handleEditSale(sale.id)}
                        disabled={isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleMarkPaid(sale.id)}
                        disabled={sale.status !== 'SOLD' || isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleMarkShipped(sale.id)}
                        disabled={sale.status !== 'PAID' || isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z" />
                          <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                        disabled={isSelected}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                        </svg>
                      </Button>
                    </td>
                    <td className="col-card-toggle" data-summary="1">
                      <button
                        className="btn-card-expand"
                        aria-label="Expand card"
                        aria-expanded={isExpanded}
                        onClick={() => {
                          setExpandedRows((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(sale.id)) {
                              newSet.delete(sale.id);
                            } else {
                              newSet.add(sale.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <span className="expand-label">Expand</span>
                        <span className="collapse-label">Collapse</span>
                        <svg className="chevron-down" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                        </svg>
                        <svg className="chevron-up" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z" />
                        </svg>
                      </button>
                    </td>
                  </tr>,
                  <tr
                    key={`detail-${sale.id}`}
                    className={`row-detail${isExpanded ? ' row-detail-expanded' : ''}`}
                  >
                    <td colSpan={tabletColspan} className="row-detail-cell">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleViewSale(sale.id)}
                        disabled={isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                        </svg>
                        View
                      </Button>
                      <Button
                        variant="outline-dark"
                        size="sm"
                        onClick={() => handleEditSale(sale.id)}
                        disabled={isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                        </svg>
                        Edit
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleMarkPaid(sale.id)}
                        disabled={sale.status !== 'SOLD' || isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H1zm0 3h14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1z" />
                        </svg>
                        Paid
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleMarkShipped(sale.id)}
                        disabled={sale.status !== 'PAID' || isSelected}
                        className="me-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5z" />
                          <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 3 10a2 2 0 0 1 1.732 1H11V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
                        </svg>
                        Shipped
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                        disabled={isSelected}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                        </svg>
                        Delete
                      </Button>
                    </td>
                  </tr>,
                ];
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Sale pagination">
          <Pagination className="pagination-sm justify-content-end mb-0">
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => {
                setPage(page - 1);
                setSelectedIds(new Set());
              }}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pagination.Item
                key={p}
                active={p === page}
                onClick={() => {
                  setPage(p);
                  setSelectedIds(new Set());
                }}
              >
                {p}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => {
                setPage(page + 1);
                setSelectedIds(new Set());
              }}
            />
          </Pagination>
        </nav>
      )}

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg" fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Sale' : 'Add Sale'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && <div className="alert alert-danger">{modalError}</div>}
          <Form ref={formRef} onSubmit={handleFormSubmit} noValidate>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="sale-customer">Customer</Form.Label>
              <Form.Select id="sale-customer" name="customer_id" required defaultValue={sale?.customer_id ?? ''}>
                <option value="">Select a customer…</option>
                {(customersLoad.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.nickname ? ` (@${c.nickname})` : ''}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback>Please select a customer.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="sale-description">Description</Form.Label>
              <Form.Control
                as="textarea"
                id="sale-description"
                name="description"
                rows={2}
                defaultValue={sale?.description ?? ''}
              />
            </Form.Group>
            <div className="row g-3 mb-3">
              <div className="col-sm-6">
                <Form.Group>
                  <Form.Label htmlFor="sale-price">Price (₩)</Form.Label>
                  <Form.Control
                    type="number"
                    id="sale-price"
                    name="sale_price_won"
                    min={0}
                    step={1}
                    defaultValue={sale?.sale_price_won ?? ''}
                  />
                </Form.Group>
              </div>
              <div className="col-sm-6">
                <Form.Group>
                  <Form.Label htmlFor="sale-shipping">Shipping ($)</Form.Label>
                  <Form.Control
                    type="number"
                    id="sale-shipping"
                    name="shipping_cost_dollar"
                    min={0}
                    step={0.01}
                    defaultValue={sale?.shipping_cost_dollar ?? ''}
                    ref={shippingInputRef}
                  />
                </Form.Group>
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <Form.Group>
                  <Form.Label htmlFor="sale-sales-date">Sale Date</Form.Label>
                  <Form.Control
                    type="date"
                    id="sale-sales-date"
                    name="sales_date"
                    defaultValue={sale?.sales_date ? sale.sales_date.slice(0, 10) : ''}
                  />
                </Form.Group>
              </div>
              <div className="col-sm-4">
                <Form.Group>
                  <Form.Label htmlFor="sale-paid-date">Paid Date</Form.Label>
                  <Form.Control
                    type="date"
                    id="sale-paid-date"
                    name="paid_date"
                    defaultValue={sale?.paid_date ? sale.paid_date.slice(0, 10) : ''}
                  />
                </Form.Group>
              </div>
              <div className="col-sm-4">
                <Form.Group>
                  <Form.Label htmlFor="sale-shipped-date">Shipped Date</Form.Label>
                  <Form.Control
                    type="date"
                    id="sale-shipped-date"
                    name="shipped_date"
                    defaultValue={editingId && expandedRows.has(editingId) ? new Date().toISOString().slice(0, 10) : sale?.shipped_date ? sale.shipped_date.slice(0, 10) : ''}
                  />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => formRef.current?.requestSubmit()}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{viewingSale?.customer_name || 'Sale Details'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingSale && (
            <dl className="row mb-0">
              {COLUMNS.map(({ field, label }) => (
                <React.Fragment key={field}>
                  <dt className="col-5 text-muted fw-normal small">{label}</dt>
                  <dd className="col-7">{renderCell(field, viewingSale)}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="bottom-end" className="p-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            show
            delay={toast.autohide ? 4000 : undefined}
            autohide={toast.autohide}
            className={`text-bg-${toast.type} border-0`}
          >
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
}

