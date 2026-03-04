import { Link } from "react-router-dom";

function Landing() {
  return (
    <div className="bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 px-md-4">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/">
            Billora
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="mainNavbar">
            <div className="ms-auto d-flex flex-wrap gap-2">
              <Link to="/login" className="btn btn-outline-light btn-sm px-3">
                Login
              </Link>
              <Link to="/register" className="btn btn-warning btn-sm px-3">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        className="hero text-white d-flex align-items-center"
        style={{
          background: "linear-gradient(135deg, #0f172a, #1d2671)",
        }}
      >
        <div className="container py-5">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-6">
              <h1 className="fw-bold mb-3">
                Billora
                <br />
                <span className="fw-normal">
                  Smart Billing for Growing Businesses
                </span>
              </h1>
              <p className="lead mb-4">
                Create GST-ready invoices in seconds, track monthly revenue, and
                keep your business organised from anywhere.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-light btn-lg">
                  Start Free
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg">
                  View Demo
                </Link>
              </div>
              <p className="small mt-3 mb-0 text-white-50">
                No credit card required. Free plan included.
              </p>
            </div>
            <div className="col-12 col-lg-6 d-none d-lg-block">
              <div className="bg-white bg-opacity-10 rounded-4 p-4 border border-white border-opacity-25">
                <p className="text-uppercase small text-white-50 mb-2">
                  Live snapshot
                </p>
                <h5 className="mb-3">Today&apos;s overview</h5>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 rounded-3 bg-black bg-opacity-10">
                      <p className="small mb-1 text-white-50">Revenue</p>
                      <h4 className="mb-0">₹42,500</h4>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-3 bg-black bg-opacity-10">
                      <p className="small mb-1 text-white-50">Invoices</p>
                      <h4 className="mb-0">18</h4>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 rounded-3 bg-black bg-opacity-10 mt-2">
                      <p className="small mb-1 text-white-50">Top customer</p>
                      <h6 className="mb-0">Urban Tee Studio</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container py-5">
        <h2 className="text-center mb-4">Built for busy print shops</h2>
        <p className="text-center text-muted mb-5">
          Everything you need to bill faster, stay organised, and understand your growth.
        </p>

        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="card feature-card shadow-sm p-4 h-100 border-0">
              <h5>⚡ Instant invoice creation</h5>
              <p className="mb-0">Create professional invoices in seconds with reusable item lines.</p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card feature-card shadow-sm p-4 h-100 border-0">
              <h5>📊 Smart dashboard</h5>
              <p className="mb-0">See revenue, usage, and plan limits at a glance every time you log in.</p>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card feature-card shadow-sm p-4 h-100 border-0">
              <h5>☁ Cloud access</h5>
              <p className="mb-0">Your data is safe and available on any device, any time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-5">
        <div className="container">
          <h2 className="text-center mb-4">Loved by growing businesses</h2>
          <p className="text-center text-muted mb-5">
            Billora is designed for real shops with real customers and deadlines.
          </p>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="card shadow-sm p-4 h-100 border-0">
                <p className="mb-3">
                  “Earlier we used notebooks. Now everything is digital and easy.”
                </p>
                <h6 className="mb-0">Ravi</h6>
                <small className="text-muted">T-shirt printing shop owner</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm p-4 h-100 border-0">
                <p className="mb-3">
                  “The dashboard helps me track monthly income clearly.”
                </p>
                <h6 className="mb-0">Lakshmi</h6>
                <small className="text-muted">Saree designer</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm p-4 h-100 border-0">
                <p className="mb-3">
                  “Very simple software. My staff learned it in one day.”
                </p>
                <h6 className="mb-0">Ahmed</h6>
                <small className="text-muted">Boutique owner</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-light py-5">
        <div className="container">
          <h2 className="text-center mb-4">Simple pricing that scales with you</h2>
          <p className="text-center text-muted mb-5">
            Start for free and upgrade only when you are ready.
          </p>

          <div className="row justify-content-center g-4">
            <div className="col-md-4">
              <div className="card shadow-sm p-4 h-100 border-0">
                <h4>Free</h4>
                <h2 className="my-3">₹0</h2>
                <p className="mb-1">Up to 30 invoices / month</p>
                <p className="text-muted small mb-3">Perfect for new or small shops.</p>
                <Link to="/register" className="btn btn-outline-primary w-100">
                  Get started
                </Link>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow p-4 h-100 border-warning">
                <h4>Basic</h4>
                <h2 className="my-3">₹199 / month</h2>
                <p className="mb-1">Unlimited invoices</p>
                <p className="mb-3">Priority support and future features.</p>
                <Link to="/register" className="btn btn-warning w-100">
                  Upgrade now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-5 bg-dark text-white">
        <h3 className="mb-3">Ready to grow your business digitally?</h3>
        <p className="text-white-50 mb-4">
          Join other fashion printing businesses who switched from paper to PrintDesk.
        </p>
        <Link to="/register" className="btn btn-warning btn-lg">
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center py-3 small bg-light">
        <div className="container">
          <span>
            © {new Date().getFullYear()} Billora. Smart Billing for Growing
            Businesses.
          </span>
        </div>
      </footer>

    </div>
  );
}

export default Landing;