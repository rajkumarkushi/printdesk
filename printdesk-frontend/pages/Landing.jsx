import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";
import LanguageSwitcher from "../components/LanguageSwitcher";

function Landing() {
  const { t } = useTranslation();

  const features = [
    [t("landing.feature1.title"), t("landing.feature1.desc")],
    [t("landing.feature2.title"), t("landing.feature2.desc")],
    [t("landing.feature3.title"), t("landing.feature3.desc")],
  ];

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
          <div className="d-flex gap-2 align-items-center">
            <LanguageSwitcher />
            <Link to="/login" className="btn btn-outline-secondary btn-sm px-3">{t("landing.nav.login")}</Link>
            <Link to="/register" className="btn btn-primary btn-sm px-3">{t("landing.nav.startFree")}</Link>
          </div>
        </div>
      </nav>

      <header className="hero-modern">
        <div className="app-shell py-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <p className="text-uppercase fw-bold small text-white-50 mb-3">{t("landing.hero.tagline")}</p>
              <h1>{t("landing.hero.title")}</h1>
              <p className="hero-copy my-4">
                {t("landing.hero.desc")}
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-light btn-lg px-4">{t("landing.hero.createAccount")}</Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-4">{t("landing.hero.login")}</Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="hero-panel p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <p className="small text-white-50 mb-1">{t("landing.preview.today")}</p>
                    <h5 className="mb-0">{t("landing.preview.overview")}</h5>
                  </div>
                  <span className="badge text-bg-light">{t("landing.preview.live")}</span>
                </div>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">{t("landing.preview.revenue")}</p>
                      <h3 className="mb-0">&#8377;42,500</h3>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">{t("landing.preview.invoices")}</p>
                      <h3 className="mb-0">18</h3>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 rounded-2 bg-white bg-opacity-10">
                      <p className="small text-white-50 mb-1">{t("landing.preview.topCustomer")}</p>
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
              <h2 className="fw-bold">{t("landing.features.title")}</h2>
              <p className="text-soft mb-0">
                {t("landing.features.desc")}
              </p>
            </div>
          </div>
          <div className="row g-3">
            {features.map(([title, copy]) => (
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
                <p className="metric-label">{t("landing.free.title")}</p>
                <h2 className="fw-bold">{t("landing.free.price")}</h2>
                <p className="text-soft">{t("landing.free.desc")}</p>
                <Link to="/register" className="btn btn-outline-primary w-100">{t("landing.free.cta")}</Link>
              </div>
            </div>
            <div className="col-md-5">
              <div className="modern-card p-4 h-100 border-primary">
                <p className="metric-label">{t("landing.basic.title")}</p>
                <h2 className="fw-bold">{t("landing.basic.price")}</h2>
                <p className="text-soft">{t("landing.basic.desc")}</p>
                <Link to="/register" className="btn btn-primary w-100">{t("landing.basic.cta")}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4">
        <div className="app-shell d-flex flex-wrap justify-content-between gap-2 small text-soft">
          <span>&copy; {new Date().getFullYear()} Billora</span>
          <span>{t("landing.footer.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
