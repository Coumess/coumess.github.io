// vis-timeline chargé depuis un CDN, version figée (@7.7.3).
// Le build "standalone" contient Timeline, DataSet, DataView et le CSS de la frise.
import { Timeline, DataSet, DataView } from 'https://cdn.jsdelivr.net/npm/vis-timeline@7.7.3/standalone/esm/vis-timeline-graph2d.min.js';

const conteneur = document.getElementById('visualization');
const details = document.getElementById('event-details');
const UN_AN = 365.25 * 24 * 60 * 60 * 1000; // en millisecondes : vis-timeline compte en ms

// ---------------------------------------------------------------------
// 1. CHARGER LES DONNÉES
// Les événements vivent dans data/almanach.json : pour ajouter un roi,
// on touche au JSON, jamais au code.
// "await" attend la réponse du serveur ; c'est permis ici au premier
// niveau parce que le script est un module (type="module").
// ---------------------------------------------------------------------
let donnees;
try {
    const reponse = await fetch('data/almanach.json');
    donnees = await reponse.json();
} catch (erreur) {
    // Cas classique : page ouverte en double-clic (file://) au lieu d'un serveur local
    conteneur.textContent = "Impossible de charger data/almanach.json. Ouvre la page via un serveur local (http://localhost…).";
    throw erreur;
}

const aujourdhui = new Date();
for (const e of donnees.evenements) {
    if (e.end === "aujourd'hui") e.end = aujourdhui; // pour la bande "Ma vie"
}
const evenements = new DataSet(donnees.evenements); // les id sont générés tout seuls

// ---------------------------------------------------------------------
// 2. NIVEAU DE DÉTAIL SELON LE ZOOM
// Chaque événement a une "importance" : 1 = toujours visible,
// 2 = quand on voit moins de 500 ans, 3 = moins de 200 ans.
// Un DataView est une "vue filtrée" du DataSet : la frise n'affiche que
// ce qui passe le filtre, et refresh() relance le filtre.
// ---------------------------------------------------------------------
let seuil = 1;
const visibles = new DataView(evenements, { filter: e => e.importance <= seuil });

// Les GROUPES (lignes) suivent la même logique. Un groupe sans "importance"
// est toujours là ; un groupe avec importance (les couronnes) n'apparaît
// qu'au bon zoom ET si la case "Afficher les couronnes" est cochée.
// vis-timeline cache une ligne quand son groupe a visible: false.
const groupes = new DataSet(donnees.groupes);
const caseCouronnes = document.getElementById('afficher-couronnes');

function majGroupes() {
    groupes.update(groupes.get().map(g => ({
        id: g.id,
        visible: !g.importance || (caseCouronnes.checked && g.importance <= seuil),
    })));
}
caseCouronnes.addEventListener('change', majGroupes);

function seuilPourEtendue(ans) {
    if (ans > 500) return 1;
    if (ans > 200) return 2;
    return 3;
}

function majNiveauDeDetail({ start, end }) {
    const nouveau = seuilPourEtendue((end - start) / UN_AN);
    if (nouveau !== seuil) {   // on ne refiltre que si le palier change
        seuil = nouveau;
        visibles.refresh();
        majGroupes();
    }
}

// ---------------------------------------------------------------------
// 3. LA FRISE
// ---------------------------------------------------------------------
majGroupes(); // état de départ : dézoomé → couronnes cachées
const timeline = new Timeline(conteneur, visibles, groupes, {
    locale: 'fr',
    start: '1300-01-01',
    end: aujourdhui,
    min: new Date(-600, 0, 1),
    max: new Date(2050, 0, 1),
    zoomMin: 7 * 24 * 60 * 60 * 1000, // zoom max : une semaine
    zoomMax: 1000 * UN_AN,            // dézoom max : mille ans
    showCurrentTime: true,
    stack: true,
    // Marge horizontale 0 : deux règnes qui se suivent restent sur la même ligne
    // (par défaut 10px d'écart obligatoire → le second passait à la ligne)
    margin: { item: { horizontal: 0 } },
    editable: false,
});

majNiveauDeDetail(timeline.getWindow());          // palier de départ
timeline.on('rangechange', majNiveauDeDetail);    // puis à chaque zoom / glissement

// ---------------------------------------------------------------------
// 4. PANNEAU DE DÉTAIL au clic
// ---------------------------------------------------------------------
const formatDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

timeline.on('select', ({ items }) => {
    const e = items.length ? evenements.get(items[0]) : null;
    if (!e || !e.description) {
        details.hidden = true;
        return;
    }

    let quand = formatDate(e.start);
    if (e.end) {
        const duree = Math.round((new Date(e.end) - new Date(e.start)) / UN_AN);
        quand += ` – ${formatDate(e.end)} (${duree} an${duree > 1 ? 's' : ''})`;
    }

    // innerHTML accepte du HTML (ex. <em>) dans les descriptions.
    // Acceptable ici car le JSON est écrit par toi ; ne JAMAIS faire ça avec
    // du texte venant des visiteurs (risque d'injection de code).
    details.innerHTML = `
        <h2>${e.content}</h2>
        <p class="quand">${quand}</p>
        <p>${e.description}</p>
    `;
    details.hidden = false;
});
