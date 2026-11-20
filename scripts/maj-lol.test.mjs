// Test de la transformation, SANS clé ni réseau : on donne à construire()
// des réponses Riot inventées et on vérifie le résultat.
// Lancer :  node scripts/maj-lol.test.mjs   (rien ne s'affiche si tout va bien… sauf le OK final)
import assert from 'node:assert/strict';
import { construire } from './maj-lol.mjs';

const entrees = [
    { queueType: 'RANKED_FLEX_SR', tier: 'SILVER', rank: 'I', leaguePoints: 3, wins: 1, losses: 1 },
    { queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 47, wins: 38, losses: 31 },
];
const p = (championName, teamPosition, win, kills, deaths, assists) => ({ championName, teamPosition, win, kills, deaths, assists });
const participations = [
    p('Ahri', 'MIDDLE', true, 10, 2, 5),
    p('Ahri', 'MIDDLE', false, 3, 6, 4),
    p('Thresh', 'UTILITY', true, 1, 3, 15),
];

// 1. Premier vrai passage après les fausses données : l'historique repart de zéro
const r1 = construire({ exemple: true, historique: [{ date: '2026-01-01' }] }, entrees, participations, '2026-11-20');
assert.equal(r1.exemple, false);
assert.deepEqual(r1.classement, { tier: 'GOLD', rank: 'II', leaguePoints: 47, wins: 38, losses: 31 }); // la soloQ, pas la flex
assert.deepEqual(r1.historique, [{ date: '2026-11-20', tier: 'GOLD', rank: 'II', leaguePoints: 47 }]);
assert.deepEqual(r1.champions[0], { nom: 'Ahri', parties: 2, victoires: 1, kills: 13, deaths: 8, assists: 9 }); // le plus joué en premier
assert.deepEqual(r1.roles.map(r => r.role), ['MIDDLE', 'UTILITY']);

// 2. Le lendemain : le relevé s'ajoute
const r2 = construire(r1, entrees, participations, '2026-11-21');
assert.equal(r2.historique.length, 2);

// 3. Deux passages le même jour : on remplace, on ne double pas
const r3 = construire(r2, entrees, participations, '2026-11-21');
assert.equal(r3.historique.length, 2);

// 4. Pas classé en solo : classement null, historique inchangé
const r4 = construire(r3, [], participations, '2026-11-22');
assert.equal(r4.classement, null);
assert.equal(r4.historique.length, 2);

console.log('OK : construire() se comporte comme prévu.');
