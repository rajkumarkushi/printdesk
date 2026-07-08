import { Link } from "react-router-dom";
import billoraLogo from "../src/assets/billora.png";

function Landing() {
  return (
    <div className="app-page">
      <nav className="app-nav sticky-top">
        <div className="app-shell d-flex justify-content-between align-items-center py-3">
          <Link className="d-flex align-items-center gap-2" to="/">
            <div className="d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <img
                src={billoraLogo}
                alt="Billora Logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                }}
              />
            </div>
            <span className="brand-title fs-5">Billora</span>
          </Link>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-secondary btn-sm px-3">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm px-3">Start Free</Link>
          </div>
        </div>
      </nav>

      <header className="hero-modern">
        <div className="app-shell py-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <p className="text-uppercase fw-bold small text-white-50 mb-3">Billing built for busy print shops</p>
              <h1>Smart invoicing without the paperwork.</h1>
              <p className="hero-copy my-4">
                Create GST-ready invoices, track recent revenue, manage plan limits,
                and keep every order organized from one polished desk.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-light btn-lg px-4">Create free account</Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4">Login</Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="hero-panel p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <p className="small text-white-50 mb-1">Today</p>
                    <h5 className="mb-0">Shop overview</h5>
                  </div>
                  <span className="badge text-bg-light">Live</span>
                </div>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">Revenue</p>
                      <h3 className="mb-0">₹42,500</h3>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">Invoices</p>
                      <h3 className="mb-0">18</h3>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">Top customer</p>
                      <h6 className="mb-0">Urban Tee Studio</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section-band">
        <div className="app-shell">
          <div className="row mb-4">
            <div className="col-lg-7">
              <h2 className="fw-bold">Everything your counter needs.</h2>
              <p className="text-soft mb-0">
                Fast invoice entry, simple plan controls, and dashboards that make
                daily billing easier to scan.
              </p>
            </div>
          </div>
          <div className="row g-3">
            {[
              ["Instant invoices", "Reusable line items keep order entry fast."],
              ["Revenue tracking", "See recent earnings and invoice counts instantly."],
              ["Cloud access", "Work from the shop, home, or mobile without paper files."],
            ].map(([title, copy]) => (
              <div className="col-md-4" key={title}>
                <div className="modern-card bg-white p-4 h-100">
                  <h5 className="fw-bold">{title}</h5>
                  <p className="text-soft mb-0">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band bg-white">
        <div className="app-shell">
          <div className="row justify-content-center g-3">
            <div className="col-md-5">
              <div className="modern-card p-4 h-100">
                <p className="metric-label">Free</p>
                <h2 className="fw-bold">₹0</h2>
                <p className="text-soft">Up to 30 invoices per month.</p>
                <Link to="/register" className="btn btn-outline-primary w-100">Get started</Link>
              </div>
            </div>
            <div className="col-md-5">
              <div className="modern-card p-4 h-100 border-primary">
                <p className="metric-label">Basic</p>
                <h2 className="fw-bold">₹199 / month</h2>
                <p className="text-soft">More invoices and room to grow.</p>
                <Link to="/register" className="btn btn-primary w-100">Upgrade now</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4">
        <div className="app-shell d-flex flex-wrap justify-content-between gap-2 small text-soft">
          <span>© {new Date().getFullYear()} Billora</span>
          <span>Smart Billing for Growing Businesses</span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
