import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';

export default function App() {
  return (
    <HashRouter>
      <Navbar bg="dark" variant="dark" expand="md">
        <Container fluid="lg">
          <Navbar.Brand>Celadon</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-3">
              <Nav.Item>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  to="/customers"
                >
                  Customers
                </NavLink>
              </Nav.Item>
              <Nav.Item>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  to="/sales"
                >
                  Sales
                </NavLink>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid="lg">
        <main id="app">
          <Routes>
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="*" element={<SalesPage />} />
          </Routes>
        </main>
      </Container>
    </HashRouter>
  );
}
