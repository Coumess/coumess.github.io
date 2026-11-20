// =====================================================================
// LE GRIMOIRE DE LA FAILLE : affiche data/lol.json
// Ce fichier ne sait PAS d'où viennent les données (écrites à la main
// ou générées par l'API Riot à l'étape 7) : il lit juste le JSON.
// =====================================================================

const d = await fetch('data/lol.json').then(r => r.json());

// ---------- Petits outils ----------
const TIERS = {
    IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', PLATINUM: 'Platine',
    EMERALD: 'Émeraude', DIAMOND: 'Diamant', MASTER: 'Maître', GRANDMASTER: 'Grand Maître', CHALLENGER: 'Challenger',
};
const ORDRE_TIERS = Object.keys(TIERS);       // ['IRON', 'BRONZE', …] dans l'ordre
const ORDRE_DIVISIONS = ['IV', 'III', 'II', 'I'];
const ROLES = { TOP: 'Haut', JUNGLE: 'Jungle', MIDDLE: 'Milieu', BOTTOM: 'Tireur', UTILITY: 'Support' };

const nomRang = r => `${TIERS[r.tier]} ${r.rank}`;
const pourcent = (part, total) => Math.round((100 * part) / total);
const date = (iso, options) => new Date(iso).toLocaleDateString('fr-FR', options);

// Un rang devient un seul nombre pour pouvoir le dessiner :
// chaque division vaut 100 LP, chaque tier 400 (4 divisions).
// Ex. Or II 47 LP = 3×400 + 2×100 + 47 = 1447
const lpAbsolus = r => ORDRE_TIERS.indexOf(r.tier) * 400 + ORDRE_DIVISIONS.indexOf(r.rank) * 100 + r.leaguePoints;
// …et l'inverse, pour écrire le nom de la division d'une ligne du graphique
const nomDivision = v => `${TIERS[ORDRE_TIERS[Math.floor(v / 400)]]} ${ORDRE_DIVISIONS[(v % 400) / 100]}`;

// ---------- En-tête ----------
document.getElementById('identite').textContent =
    `${d.joueur} · ${d.serveur} · mis à jour le ${date(d.maj, { day: 'numeric', month: 'long', year: 'numeric' })}`;
document.getElementById('avertissement').hidden = !d.exemple;

// ---------- Tuiles : les chiffres clés ----------
const c = d.classement; // null si pas classé en solo cette saison
const somme = cle => d.champions.reduce((total, champ) => total + champ[cle], 0);
// KDA = (kills + assists) / morts. Math.max(…, 1) évite de diviser par 0
// (une partie sans mourir donnerait "Infinity").
const kda = (k, mort, a) => (k + a) / Math.max(mort, 1);
const kdaGlobal = kda(somme('kills'), somme('deaths'), somme('assists'));

const tuile = (label, valeur, detail) => `
    <div class="tuile">
        <span class="tuile-label">${label}</span>
        <span class="tuile-valeur">${valeur}</span>
        <span class="tuile-detail">${detail}</span>
    </div>`;

document.getElementById('tuiles').innerHTML =
    (c
        ? tuile('Rang', nomRang(c), `${c.leaguePoints} LP`) +
          tuile('Victoires', `${pourcent(c.wins, c.wins + c.losses)}&nbsp;%`, `${c.wins} V · ${c.losses} D`)
        : tuile('Rang', 'Non classé', 'en Solo/Duo cette saison')) +
    tuile('KDA', kdaGlobal.toFixed(2), `sur les ${somme('parties')} dernières parties`);

// ---------- Graphique : évolution du rang (SVG fait main) ----------
// Un SVG est un dessin décrit en balises : <line>, <polyline>, <circle>, <text>…
// viewBox fixe un repère de 640×240 ; le CSS l'étire ensuite à la largeur de l'écran.
function graphiqueRang(historique) {
    // Il faut au moins 2 relevés pour tracer une ligne (le 1er jour, il n'y en a qu'un)
    if (historique.length < 2) {
        return `<p class="sous-titre">La courbe se dessinera au fil des relevés quotidiens.</p>`;
    }
    const L = 640, H = 240;
    const marge = { gauche: 80, droite: 15, haut: 10, bas: 30 };
    const valeurs = historique.map(lpAbsolus);
    const min = Math.floor(Math.min(...valeurs) / 100) * 100;      // arrondi à la division
    const max = Math.ceil((Math.max(...valeurs) + 1) / 100) * 100;

    // Fonctions d'échelle : donnée → pixel
    const x = i => marge.gauche + (i * (L - marge.gauche - marge.droite)) / (historique.length - 1);
    const y = v => H - marge.bas - ((v - min) * (H - marge.haut - marge.bas)) / (max - min);

    let svg = '';
    // Une bande par division, avec son nom au milieu
    for (let v = min; v < max; v += 100) {
        svg += `<line class="grille" x1="${marge.gauche}" x2="${L - marge.droite}" y1="${y(v)}" y2="${y(v)}"/>`;
        svg += `<text class="etiquette" x="${marge.gauche - 10}" y="${y(v + 50)}" text-anchor="end" dominant-baseline="middle">${nomDivision(v)}</text>`;
    }
    svg += `<line class="grille" x1="${marge.gauche}" x2="${L - marge.droite}" y1="${y(max)}" y2="${y(max)}"/>`;

    // Dates : la première et la dernière suffisent
    const jourMois = { day: 'numeric', month: 'short' };
    svg += `<text class="etiquette" x="${x(0)}" y="${H - 8}">${date(historique[0].date, jourMois)}</text>`;
    svg += `<text class="etiquette" x="${x(historique.length - 1)}" y="${H - 8}" text-anchor="end">${date(historique.at(-1).date, jourMois)}</text>`;

    // La courbe
    const points = valeurs.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    svg += `<polyline class="courbe" points="${points}"/>`;

    // Les points, avec une info-bulle native (<title>) au survol.
    // Le cercle invisible plus grand rend la cible facile à viser.
    historique.forEach((r, i) => {
        const info = `${date(r.date, jourMois)} : ${nomRang(r)}, ${r.leaguePoints} LP`;
        svg += `<g class="point"><title>${info}</title>
                    <circle class="cible" cx="${x(i)}" cy="${y(valeurs[i])}" r="12"/>
                    <circle class="marque" cx="${x(i)}" cy="${y(valeurs[i])}" r="4"/>
                </g>`;
    });

    const debut = nomRang(historique[0]), fin = nomRang(historique.at(-1));
    return `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution du rang, de ${debut} à ${fin}, sur ${historique.length} semaines">${svg}</svg>`;
}
document.getElementById('graphique-rang').innerHTML = graphiqueRang(d.historique);

// ---------- Tableaux avec barres de winrate ----------
// La largeur de la barre vient d'une variable CSS (--pct) posée en ligne :
// le CSS dessine, le JS ne fait que donner le nombre.
const barre = (victoires, parties) => {
    const p = pourcent(victoires, parties);
    return `<div class="barre-ligne" title="${victoires} V · ${parties - victoires} D">
                <div class="barre" style="--pct: ${p}%"></div>
                <span>${p}&nbsp;%</span>
            </div>`;
};

// slice(0, 8) : on n'affiche que les 8 plus joués (le JSON les contient tous,
// pour que les totaux du KDA restent justes)
document.getElementById('table-champions').innerHTML = d.champions.slice(0, 8).map(ch => `
    <tr>
        <th scope="row">${ch.nom}</th>
        <td>${ch.parties}</td>
        <td>${barre(ch.victoires, ch.parties)}</td>
        <td>${kda(ch.kills, ch.deaths, ch.assists).toFixed(2)}
            <small>${(ch.kills / ch.parties).toFixed(1)} / ${(ch.deaths / ch.parties).toFixed(1)} / ${(ch.assists / ch.parties).toFixed(1)}</small></td>
    </tr>`).join('');

document.getElementById('table-roles').innerHTML = d.roles.map(r => `
    <tr>
        <th scope="row">${ROLES[r.role]}</th>
        <td>${r.parties}</td>
        <td>${barre(r.victoires, r.parties)}</td>
    </tr>`).join('');
