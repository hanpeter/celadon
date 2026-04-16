import { init as initCustomers } from './customers.js';
import { init as initSales, clearBulkSelectionForMobile } from './sales.js';

function collapseAllRows() {
    document.querySelectorAll('#table-body tr.card-expanded').forEach((row) => {
        row.classList.remove('card-expanded');
        row.querySelector('.btn-row-expand')?.setAttribute('aria-expanded', 'false');
        row.querySelector('.btn-card-expand')?.setAttribute('aria-expanded', 'false');
        const detail = row.nextElementSibling;
        if (detail?.classList.contains('row-detail')) {
            detail.classList.add('d-none');
        }
    });
}

function watchBreakpoints() {
    let lastBucket = getBreakpointBucket();
    window.addEventListener('resize', () => {
        const bucket = getBreakpointBucket();
        if (bucket !== lastBucket) {
            lastBucket = bucket;
            collapseAllRows();
            if (bucket === 'mobile') {
                clearBulkSelectionForMobile();
            }
        }
    });
}

function getBreakpointBucket() {
    const w = window.innerWidth;
    if (w < 576) return 'mobile';
    if (w < 992) return 'tablet';
    return 'desktop';
}

function boot() {
    function route() {
        const view = location.hash || '#sales';
        setActiveNav(view);
        if (view === '#customers') {
            initCustomers();
        } else {
            initSales();
        }
    }

    window.addEventListener('hashchange', route);
    route();
    watchBreakpoints();
}

function setActiveNav(hash) {
    document.querySelectorAll('.nav-link[data-view]').forEach((el) => {
        el.classList.toggle('active', el.dataset.view === hash);
    });
}

boot();
