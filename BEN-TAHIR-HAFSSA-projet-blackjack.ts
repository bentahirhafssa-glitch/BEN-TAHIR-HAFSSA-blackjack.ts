type Action = "Hit" | "Stand" | "Double" | "Split" | "Blackjack";
const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11];
function tirer(): number {
    return deck[Math.floor(Math.random() * deck.length)];
}
function total(main: number[]): number {
    let s = main.reduce((a,b)=>a+b,0);
    let aces = main.filter(c=>c===11).length;

    while (s > 21 && aces > 0) {
        s -= 10;
        aces--;
    }
    return s;
}

function estBlackjack(main: number[]): boolean {
    return main.length === 2 && total(main) === 21;
}
function strategieDure(main: number[], carteC: number): Action {
    const t = total(main);

    if (t <= 8) return "Hit";
    if (t === 9) return (carteC >= 3 && carteC <= 6) ? "Double" : "Hit";
    if (t === 10 || t === 11) return (carteC <= 9) ? "Double" : "Hit";
    if (t === 12) return (carteC >= 4 && carteC <= 6) ? "Stand" : "Hit";
    if (t >= 13 && t <= 16) return (carteC <= 6) ? "Stand" : "Hit";

    return "Stand";
}

function strategieAs(main: number[], carteC: number): Action {
    if (!main.includes(11) || main.length > 2) {
        return strategieDure(main, carteC);
    }

    const autre = main.filter(c=>c!==11)[0] || 0;

    if (autre >= 8) return "Stand";
    if (autre === 7) {
        if (carteC >= 3 && carteC <= 6) return "Double";
        if (carteC === 2 || carteC === 7 || carteC === 8) return "Stand";
        return "Hit";
    }
    if (autre === 6) return (carteC >= 3 && carteC <= 6) ? "Double" : "Hit";
    if (autre === 5 || autre === 4) return (carteC >= 4 && carteC <= 6) ? "Double" : "Hit";
    if (autre === 3 || autre === 2) return (carteC === 5 || carteC === 6) ? "Double" : "Hit";

    return "Hit";
}

function strategiePaire(main: number[], carteC: number): Action {
    const v = main[0];

    // As
    if (v === 11) return "Split";
    // Dix
    if (v === 10) return "Stand";
    if (v === 9) return (carteC === 7 || carteC >= 10) ? "Stand" : "Split";
    if (v === 8) return "Split";
    if (v === 7) return (carteC <= 7) ? "Split" : "Hit";
    if (v === 6) return (carteC <= 6) ? "Split" : "Hit";
    if (v === 5) return (carteC <= 9) ? "Double" : "Hit";
    if (v === 4) return (carteC === 5 || carteC === 6) ? "Split" : "Hit";
    if (v === 3 || v === 2) return (carteC <= 7) ? "Split" : "Hit";

    return "Hit";
}

function jouerMain(
    main: number[],
    carteC: number,
    peutDoubler: boolean,
    allowSplit: boolean
): {main:number[], etat:"normal"|"double"} {

    while (true) {
        let action: Action;

        if (allowSplit && main.length === 2 && main[0] === main[1]) {
            action = strategiePaire(main, carteC);
        } else if (main.includes(11)) {
            action = strategieAs(main, carteC);
        } else {
            action = strategieDure(main, carteC);
        }

        if (action === "Double" && !peutDoubler) action = "Hit";

        if (action === "Hit") {
            main.push(tirer());
            if (total(main) > 21) break;
        }
        else if (action === "Double") {
            main.push(tirer());
            return {main, etat:"double"};
        }
        else {
            break;
        }
    }
    return {main, etat:"normal"};
}

function tourCroupier(main: number[]): number[] {
    while (total(main) < 17) main.push(tirer());
    return main;
}

const mise = 8;
const soldeInitial = 80;
let solde = soldeInitial;
let vic = 0, def = 0, nul = 0;

for (let partie = 1; partie <= 100; partie++) {

    //Étape 10 : stop si solde trop faible OU déjà triplé
    if (solde < mise || solde >= soldeInitial * 3) break;

    solde -= mise;

    let joueur = [tirer(), tirer()];
    let croupier = [tirer(), tirer()];
    if (estBlackjack(joueur) && !estBlackjack(croupier)) {
        solde += mise * 2.5;
        vic++;
        continue;
    }
    if (estBlackjack(croupier) && !estBlackjack(joueur)) {
        def++;
        continue;
    }

    let actionInitiale: Action | null = null;
    if (joueur[0] === joueur[1]) {
        actionInitiale = strategiePaire(joueur, croupier[0]);
    }

    if (actionInitiale === "Split" && solde >= mise) {
        // On paie une deuxième mise pour la 2ème main
        solde -= mise;
        const v = joueur[0];

        let main1 = [v, tirer()];
        let main2 = [v, tirer()];

        let res1 = v === 11
            ? {main: main1, etat: "normal" as const}
            : jouerMain(main1, croupier[0], true, false); // false = pas de re-split

        let res2 = v === 11
            ? {main: main2, etat: "normal" as const}
            : jouerMain(main2, croupier[0], true, false);

        main1 = res1.main;
        main2 = res2.main;

        croupier = tourCroupier(croupier);
        const tc = total(croupier);

        function reglerMainSplit(main: number[], etat:"normal"|"double") {
            const tj = total(main);

            if (tj > 21) {
                def++;
                return;
            }
            if (tc > 21 || tj > tc) {
                solde += etat === "double" ? mise * 4 : mise * 2;
                vic++;
            } else if (tj < tc) {
                def++;
            } else {
                solde += mise;
                nul++;
            }
        }

        reglerMainSplit(main1, res1.etat);
        reglerMainSplit(main2, res2.etat);

        continue;
    }

    let jeu = jouerMain(joueur, croupier[0], true, true);
    joueur = jeu.main;


    if (total(joueur) > 21) {
        def++;
        continue;
    }

    croupier = tourCroupier(croupier);

    const tj = total(joueur);
    const tc = total(croupier);

    if (tc > 21 || tj > tc) {
        solde += jeu.etat === "double" ? mise * 4 : mise * 2;
        vic++;
    }
    else if (tj < tc) {
        def++;
    }
    else {
        solde += mise;
        nul++;
    }
}

console.log("Victoires :", vic);
console.log("Defaites :", def);
console.log("Nuls :", nul);
console.log("Solde final :", solde);

