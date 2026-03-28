import { init as initCustomers } from './customers.js';
import { init as initSales } from './sales.js';

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
}

function setActiveNav(hash) {
    document.querySelectorAll('.nav-link[data-view]').forEach((el) => {
        el.classList.toggle('active', el.dataset.view === hash);
    });
}

boot();
