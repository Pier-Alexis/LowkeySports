import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { SportPage } from "./pages/SportPage";
import { MatchDetail } from "./pages/MatchDetail";
import { ArticlesPage } from "./pages/ArticlesPage";
import { ArticleDetail } from "./pages/ArticleDetail";
import { AdminPage } from "./pages/AdminPage";
import { LoginPage } from "./pages/LoginPage";

function NotFound() {
    return (
        <div className="container">
            <section className="hero">
                <h1 className="hero-title">Page introuvable</h1>
                <p className="hero-subtitle">La page demandée n'existe pas.</p>
            </section>
        </div>
    );
}

export default function App() {
    return (
        <div className="app">
            <Navbar />
            <main className="main">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/sport/:sport" element={<SportPage />} />
                    <Route path="/matches/:id" element={<MatchDetail />} />
                    <Route path="/articles" element={<ArticlesPage />} />
                    <Route path="/articles/:id" element={<ArticleDetail />} />
                    <Route path="/connexion" element={<LoginPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}