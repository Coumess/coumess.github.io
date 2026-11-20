// =====================================================================
// PANNEAUX DE PROJETS
// Avant : ~40 lignes (afficher, masquer, setTimeout, classes…).
// Maintenant <dialog> fait presque tout ; il reste 2 petites choses.
// =====================================================================

// 1. Ouvrir : chaque carte porte data-dialog="id-du-panneau".
//    showModal() ouvre le panneau en mode "modal" : fond assombri,
//    reste de la page inactif, Échap pour fermer.
document.querySelectorAll('[data-dialog]').forEach(carte => {
    carte.addEventListener('click', () => {
        document.getElementById(carte.dataset.dialog).showModal();
    });
});

// 2. Fermer en cliquant sur le fond sombre.
//    Le fond (::backdrop) fait partie du <dialog> : un clic dessus a pour
//    cible le <dialog> lui-même, alors qu'un clic DANS le panneau a pour
//    cible un de ses enfants (texte, image…). D'où le test e.target === panneau.
document.querySelectorAll('dialog').forEach(panneau => {
    panneau.addEventListener('click', e => {
        if (e.target === panneau) panneau.close();
    });
});
