export function About() {
    return (
        <div className="container">
            <section className="hero">
                <h1 className="hero-title">
                    À propos de <span className="text-gold">LowkeySports</span>
                </h1>
            </section>

            <div className="about-grid">
                <section className="card about-card">
                    <h2>Notre mission</h2>
                    <p>
                        LowkeySports est un site qui vous donne notre vision des rencontres sportives à
                        venir. Nous analysons les matchs des grandes compétitions mondiales — basketball,
                        baseball, football et tennis — et partageons nos prédictions.
                    </p>
                </section>
                <section className="card about-card">
                    <h2>Sans pari</h2>
                    <p>
                        Nous ne proposons aucun pari ni aucune mise. Nos analyses sont des avis
                        personnels, issus de la forme des équipes, des confrontations passées et du
                        contexte de chaque rencontre.
                    </p>
                </section>
                <section className="card about-card">
                    <h2>Les catégories</h2>
                    <p>
                        Le site couvre quatre disciplines : le basketball (NBA, ligues européennes), le
                        baseball, le football (championnats européens et coupes) et le tennis (circuits
                        ATP et WTA). Les matchs proviennent d'un agrégateur de données sportives.
                    </p>
                </section>
                <section className="card about-card">
                    <h2>Analyses éditoriales</h2>
                    <p>
                        Chaque match analysé fait l'objet d'un texte détaillé expliquant notre choix :
                        victoire de l'équipe à domicile, de l'équipe à l'extérieur, ou match nul.
                    </p>
                </section>
            </div>
        </div>
    );
}