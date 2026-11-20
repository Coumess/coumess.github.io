// =====================================================================
// MISE À JOUR DES STATS LOL : API Riot → data/lol.json
// ---------------------------------------------------------------------
// Ce script tourne CÔTÉ SERVEUR (ton PC ou GitHub Actions), jamais dans
// le navigateur : c'est pour ça que la clé Riot reste secrète.
// Le site, lui, ne lit que le JSON produit.
//
// En local :       node --env-file=.env scripts/maj-lol.mjs
//                  (.env contient une ligne RIOT_API_KEY=RGAPI-…, et .env est dans .gitignore)
// Sur GitHub :     la clé vient des "Secrets" du dépôt (voir .github/workflows/lol.yml)
// =====================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const JOUEUR = { nom: 'Alexcalibur', tag: 'GRAAL' };
const PLATEFORME = 'https://euw1.api.riotgames.com';   // serveur EUW : classement
const REGION = 'https://europe.api.riotgames.com';      // région Europe : compte + parties
const NB_PARTIES = 40;   // parties analysées (≈ 43 requêtes, sous la limite de 100 / 2 min)
const SOLOQ = 420;       // identifiant Riot de la file "Classée Solo/Duo"
const FICHIER = 'data/lol.json';

// ---------------------------------------------------------------------
// Appel à l'API : la clé part dans un en-tête HTTP, jamais dans l'URL
// ---------------------------------------------------------------------
async function riot(url) {
    const reponse = await fetch(url, { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } });

    // 429 = "trop de requêtes" : Riot dit combien de secondes attendre
    if (reponse.status === 429) {
        const attente = Number(reponse.headers.get('Retry-After') ?? 10);
        console.log(`Limite atteinte, pause de ${attente} s…`);
        await new Promise(r => setTimeout(r, attente * 1000));
        return riot(url);
    }
    // 401/403 = clé absente, invalide ou expirée (la clé de dev meurt au bout de 24 h)
    if (!reponse.ok) throw new Error(`Riot a répondu ${reponse.status} pour ${url}`);
    return reponse.json();
}

// ---------------------------------------------------------------------
// Transformation : réponses brutes de Riot → notre format (le même que
// les fausses données de l'étape 6). Fonction "pure" : pas d'appel
// réseau, pas de fichier → facile à tester (voir maj-lol.test.mjs).
// ---------------------------------------------------------------------
export function construire(ancien, entrees, participations, aujourdhui) {
    const solo = entrees.find(e => e.queueType === 'RANKED_SOLO_5x5');
    const classement = solo && {
        tier: solo.tier, rank: solo.rank, leaguePoints: solo.leaguePoints,
        wins: solo.wins, losses: solo.losses,
    };

    // Historique : on garde les anciens relevés (sauf les faux de l'étape 6)
    // et on ajoute/remplace celui du jour. C'est CE fichier qui garde la mémoire,
    // puisque l'API ne donne que le rang actuel.
    let historique = ancien?.exemple ? [] : (ancien?.historique ?? []);
    historique = historique.filter(r => r.date !== aujourdhui);
    if (classement) {
        historique.push({ date: aujourdhui, tier: classement.tier, rank: classement.rank, leaguePoints: classement.leaguePoints });
    }

    // Regroupement des parties par champion, puis par rôle
    const regrouper = (cle) => {
        const groupes = {};
        for (const p of participations) {
            const nom = p[cle];
            if (!nom) continue; // rôle vide (rare) : on ignore
            groupes[nom] ??= { parties: 0, victoires: 0, kills: 0, deaths: 0, assists: 0 };
            const g = groupes[nom];
            g.parties++;
            g.victoires += p.win ? 1 : 0;
            g.kills += p.kills;
            g.deaths += p.deaths;
            g.assists += p.assists;
        }
        // objet → tableau trié du plus joué au moins joué
        return Object.entries(groupes).sort((a, b) => b[1].parties - a[1].parties);
    };

    return {
        exemple: false,
        joueur: `${JOUEUR.nom}#${JOUEUR.tag}`,
        serveur: 'EUW',
        maj: aujourdhui,
        classement: classement ?? null, // null = pas classé en solo cette saison
        historique,
        champions: regrouper('championName').map(([nom, g]) => ({ nom, ...g })),
        roles: regrouper('teamPosition').map(([role, g]) => ({ role, parties: g.parties, victoires: g.victoires })),
    };
}

// ---------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------
async function main() {
    if (!process.env.RIOT_API_KEY) throw new Error('RIOT_API_KEY manquante (fichier .env ou secret GitHub).');

    // 1. Riot ID → puuid (l'identifiant permanent du compte)
    const compte = await riot(`${REGION}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(JOUEUR.nom)}/${encodeURIComponent(JOUEUR.tag)}`);

    // 2. Classement actuel (une entrée par file : solo, flex…)
    const entrees = await riot(`${PLATEFORME}/lol/league/v4/entries/by-puuid/${compte.puuid}`);

    // 3. Les dernières parties classées solo : d'abord les identifiants…
    const ids = await riot(`${REGION}/lol/match/v5/matches/by-puuid/${compte.puuid}/ids?queue=${SOLOQ}&count=${NB_PARTIES}`);

    // …puis le détail de chaque partie, une par une (pour ménager la limite)
    const participations = [];
    for (const id of ids) {
        const partie = await riot(`${REGION}/lol/match/v5/matches/${id}`);
        // 10 joueurs par partie : on garde la ligne qui est la nôtre
        participations.push(partie.info.participants.find(p => p.puuid === compte.puuid));
    }

    // 4. On relit l'ancien fichier (pour l'historique), puis on écrit.
    //    L'écriture n'a lieu qu'ici, à la toute fin : si un appel a échoué
    //    plus haut, le script s'est arrêté et l'ancien fichier est intact.
    const ancien = JSON.parse(await readFile(FICHIER, 'utf8').catch(() => 'null'));
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const donnees = construire(ancien, entrees, participations, aujourdhui);
    await writeFile(FICHIER, JSON.stringify(donnees, null, 2) + '\n');

    console.log(`OK : ${participations.length} parties, rang ${donnees.classement ? `${donnees.classement.tier} ${donnees.classement.rank}` : 'non classé'}.`);
}

// Lancer main() seulement si on exécute CE fichier (pas quand le test l'importe)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(erreur => {
        console.error('Échec :', erreur.message);
        process.exit(1); // code d'erreur → GitHub Actions marque la tâche en rouge
    });
}
