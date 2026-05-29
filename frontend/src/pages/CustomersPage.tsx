import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Pagination,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import { getCustomers, createCustomer, updateCustomer } from '../api';
import type { Customer } from '../types';

const PAGE_SIZE = 20;

interface Column {
  field: keyof Customer;
  label: string;
  summary?: boolean;
  tablet?: boolean;
  inputType?: string;
}

const COLUMNS: Column[] = [
  { field: 'name', label: 'Name', summary: true },
  { field: 'nickname', label: 'Nickname', summary: true },
  { field: 'phone_number', label: 'Phone', tablet: false, inputType: 'tel' },
  { field: 'address', label: 'Address' },
  { field: 'postal_code', label: 'Postal Code', tablet: false },
  { field: 'personal_customs_clearance_code', label: 'Customs Code' },
];

interface ToastItem {
  id: string;
  message: string;
  variant: string;
}

// col-toggle (1) + columns visible at tablet (tablet !== false)
const TABLET_COLSPAN = 1 + COLUMNS.filter((c) => c.tablet !== false).length;

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Debounce: flush q → debouncedQ after 300ms of inactivity; reset page on new query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch from server whenever query, page, or refreshKey changes
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    getCustomers({ q: debouncedQ, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then(({ items: fetched, total: fetchedTotal }) => {
        if (!ignore) {
          setItems(fetched);
          setTotal(fetchedTotal);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [debouncedQ, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAddModal = () => {
    setEditingId(null);
    setFormData({});
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (id: number) => {
    const customer = items.find((c) => c.id === id);
    if (!customer) return;
    setEditingId(id);
    const data: Record<string, string> = {};
    COLUMNS.forEach(({ field }) => {
      data[field] = String(customer[field] ?? '');
    });
    setFormData(data);
    setModalError(null);
    setShowModal(true);
  };

  const openViewModal = (id: number) => {
    setViewingId(id);
    setShowViewModal(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setModalError(null);

    try {
      if (editingId !== null) {
        await updateCustomer(editingId, formData);
        showToast('Customer updated.', 'success');
      } else {
        await createCustomer(formData);
        showToast('Customer added.', 'success');
      }
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setModalError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const showToast = (message: string, variant: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const viewingCustomer = items.find((c) => c.id === viewingId);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Customers</h4>
        <div className="d-flex align-items-center gap-2">
          <Form.Control
            type="search"
            placeholder="Search customers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: '200px' }}
            size="sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            className="d-flex align-items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-plus-lg"
              viewBox="0 0 16 16"
            >
              <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2" />
            </svg>
            Add Customer
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      <div className="table-responsive">
        {loading ? (
          <div className="text-center text-muted py-4">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted py-4">
            {debouncedQ ? 'No customers match your search.' : 'No customers found.'}
          </div>
        ) : (
          <Table hover className="align-middle" id="customer-table">
            <thead className="table-light">
              <tr>
                {/* Tablet expand toggle column — Bootstrap hides below sm and at lg+ */}
                <th
                  className="col-toggle d-none d-sm-table-cell d-lg-none"
                  aria-label="Expand"
                />
                {COLUMNS.map(({ field, label, tablet }) => (
                  <th
                    key={field}
                    scope="col"
                    className={tablet === false ? 'col-desktop-only' : ''}
                  >
                    {label}
                  </th>
                ))}
                {/* Desktop actions column — CSS shows at lg+ */}
                <th scope="col" className="text-end col-desktop-only">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <React.Fragment key={customer.id}>
                  <tr
                    data-id={customer.id}
                    className={expandedRows.has(customer.id) ? 'card-expanded' : ''}
                  >
                    {/* Tablet expand chevron — Bootstrap hides below sm and at lg+ */}
                    <td className="col-toggle d-none d-sm-table-cell d-lg-none">
                      <button
                        className="btn-row-expand"
                        aria-label="Expand row"
                        aria-expanded={expandedRows.has(customer.id)}
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <svg
                          className="chevron-right"
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
                        </svg>
                        <svg
                          className="chevron-down"
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                        </svg>
                      </button>
                    </td>
                    {COLUMNS.map(({ field, label, summary, tablet }) => {
                      const value = customer[field] ?? '';
                      const isNickname = field === 'nickname' && value;
                      return (
                        <td
                          key={field}
                          data-label={label}
                          data-summary={summary ? '1' : undefined}
                          className={tablet === false ? 'col-desktop-only' : ''}
                        >
                          {isNickname ? (
                            <a
                              href={`https://instagram.com/@${encodeURIComponent(String(value))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              @{value}
                            </a>
                          ) : (
                            String(value)
                          )}
                        </td>
                      );
                    })}
                    {/* Desktop edit button — CSS shows at lg+ */}
                    <td className="text-end text-nowrap col-desktop-only">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="btn-edit"
                        aria-label="Edit"
                        onClick={() => openEditModal(customer.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                        </svg>
                        <span className="ms-1">Edit</span>
                      </Button>
                    </td>
                    {/* Mobile actions — CSS shows as flex when card-expanded */}
                    <td className="col-mobile-actions">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => openViewModal(customer.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                        </svg>
                        View
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => openEditModal(customer.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                        </svg>
                        Edit
                      </Button>
                    </td>
                    {/* Mobile card expand/collapse toggle — CSS shows at <576px */}
                    <td className="col-card-toggle" data-summary="1">
                      <button
                        className="btn-card-expand"
                        aria-label="Expand card"
                        aria-expanded={expandedRows.has(customer.id)}
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <span className="expand-label">Expand</span>
                        <span className="collapse-label">Collapse</span>
                        <svg
                          className="chevron-down"
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
                        </svg>
                        <svg
                          className="chevron-up"
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {/* Tablet detail row — CSS shows when row-detail-expanded at 576–991px */}
                  <tr className={`row-detail${expandedRows.has(customer.id) ? ' row-detail-expanded' : ''}`}>
                    <td colSpan={TABLET_COLSPAN} className="row-detail-cell">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-1"
                        onClick={() => openViewModal(customer.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                        </svg>
                        View
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => openEditModal(customer.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                        </svg>
                        Edit
                      </Button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Customer pagination" className="d-flex justify-content-end">
          <Pagination size="sm" className="mb-0">
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            />
            {Array.from({ length: totalPages }, (_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === page}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            />
          </Pagination>
        </nav>
      )}

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId !== null ? 'Edit Customer' : 'Add Customer'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && <Alert variant="danger">{modalError}</Alert>}
          <Form onSubmit={handleFormSubmit}>
            {COLUMNS.map(({ field, label, inputType }) => (
              <Form.Group key={field} className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type={inputType ?? 'text'}
                  value={formData[field] ?? ''}
                  onChange={(e) => handleFormChange(field, e.target.value)}
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleFormSubmit}
            disabled={saveLoading}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {viewingCustomer?.name || 'Customer Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingCustomer && (
            <dl className="row mb-0">
              {COLUMNS.map(({ field, label }) => {
                const value = viewingCustomer[field] ?? '';
                const isNickname = field === 'nickname' && value;
                return (
                  <div key={field} className="row mb-1">
                    <dt className="col-5 text-muted fw-normal small">{label}</dt>
                    <dd className="col-7">
                      {isNickname ? (
                        <a
                          href={`https://instagram.com/@${encodeURIComponent(String(value))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          @{value}
                        </a>
                      ) : value ? (
                        String(value)
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </dd>
                  </div>
                );
              })}
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
            onClose={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            show={true}
            delay={4000}
            autohide
            bg={toast.variant === 'success' ? 'success' : 'danger'}
          >
            <Toast.Body className={toast.variant === 'success' ? 'text-white' : ''}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </>
  );
}
