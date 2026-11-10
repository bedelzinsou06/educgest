let donnees = { classes: [] };

const LONGUEUR_MAX_APPRECIATION = 200;

const NOMS_PERIODES = {
  trimestres: ["1er trimestre", "2e trimestre", "3e trimestre"],
  semestres: ["1er semestre", "2e semestre"]
};

function nouvelleClasse(nom, typePeriodes) {
  return {
    id: Date.now(),
    nom: nom,
    seuilAdmission: 10,
    etablissement: "",
    anneeScolaire: "",
    modeAppreciation: "auto",
    typePeriodes: typePeriodes === "semestres" ? "semestres" : "trimestres",
    matieres: [],
    eleves: []
  };
}

function nouvelEleve(classe, nom) {
  const periodes = [];
  for (let i = 0; i < nombrePeriodes(classe); i++) {
    periodes.push({ notes: {}, appreciation: "" });
  }
  return { nom: nom, appreciationAnnuelle: "", periodes: periodes };
}

// ---------- 2. LES PÉRIODES ----------
function nombrePeriodes(classe) {
  return classe.typePeriodes === "semestres" ? 2 : 3;
}

function nomsPeriodes(classe) {
  return NOMS_PERIODES[classe.typePeriodes === "semestres" ? "semestres" : "trimestres"];
}

function nomPeriode(classe, indice) {
  return nomsPeriodes(classe)[indice];
}

// Les données d'un élève pour une période (créées si elles manquent)
function periodeDe(eleve, indice) {
  if (!Array.isArray(eleve.periodes)) eleve.periodes = [];
  while (eleve.periodes.length <= indice) {
    eleve.periodes.push({ notes: {}, appreciation: "" });
  }
  const p = eleve.periodes[indice];
  if (!p.notes || typeof p.notes !== "object") p.notes = {};
  if (typeof p.appreciation !== "string") p.appreciation = "";
  return p;
}

// Une "vue" de la classe pour UNE période.
// Elle se comporte comme une classe dont chaque élève n'aurait que les notes
// de cette période : tous les calculs ci-dessous marchent donc dessus tels quels.
// Elle partage les mêmes données que la classe : modifier une note dans la vue
// modifie la vraie note.
function vuePeriode(classe, indice) {
  const vue = Object.create(classe);   // hérite de tous les champs de la classe
  vue.periode = nomPeriode(classe, indice);
  vue.indicePeriode = indice;
  vue.eleves = classe.eleves.map(function (eleve) {
    const donneesPeriode = periodeDe(eleve, indice);
    const v = {
      nom: eleve.nom,
      source: eleve,                  // la vraie fiche de l'élève
      donneesPeriode: donneesPeriode,
      notes: donneesPeriode.notes
    };
    Object.defineProperty(v, "appreciation", {
      enumerable: true,
      get: function () { return donneesPeriode.appreciation; },
      set: function (valeur) { donneesPeriode.appreciation = valeur; }
    });
    return v;
  });
  return vue;
}

// Met d'équerre une classe lue depuis le casier ou une ancienne version :
// - ajoute le type de périodes ("trimestres" par défaut)
// - range les anciennes notes (une seule série) dans la 1re période
function migrerClasse(classe) {
  if (classe.typePeriodes !== "semestres") classe.typePeriodes = "trimestres";
  delete classe.periode;   // ancien champ, remplacé par les périodes
  const n = nombrePeriodes(classe);

  for (const eleve of classe.eleves) {
    if (typeof eleve.appreciationAnnuelle !== "string") eleve.appreciationAnnuelle = "";
    if (!Array.isArray(eleve.periodes)) {
      eleve.periodes = [{
        notes: (eleve.notes && typeof eleve.notes === "object") ? eleve.notes : {},
        appreciation: typeof eleve.appreciation === "string" ? eleve.appreciation : ""
      }];
      delete eleve.notes;
      delete eleve.appreciation;
    }
    while (eleve.periodes.length < n) {
      eleve.periodes.push({ notes: {}, appreciation: "" });
    }
  }
}

// Une période contient-elle des notes ou une appréciation écrite ?
function periodeContientDesDonnees(classe, indice) {
  return classe.eleves.some(function (eleve) {
    const p = eleve.periodes && eleve.periodes[indice];
    if (!p) return false;
    if (String(p.appreciation || "").trim() !== "") return true;
    return Object.keys(p.notes || {}).some(function (nom) {
      const n = p.notes[nom] || {};
      return (n.interros || []).some(noteValide) || (n.devoirs || []).some(noteValide);
    });
  });
}

// Changer le découpage de l'année. Retourne { ok, message }.
// - 2 semestres -> 3 trimestres : toujours possible (le 3e trimestre est vide)
// - 3 trimestres -> 2 semestres : seulement si la 3e période est vide,
//   pour ne jamais perdre de notes en silence
function changerTypePeriodes(classe, nouveauType) {
  const type = nouveauType === "semestres" ? "semestres" : "trimestres";
  if (type === classe.typePeriodes) return { ok: true, message: "" };

  if (type === "trimestres") {
    classe.typePeriodes = "trimestres";
    migrerClasse(classe);   // ajoute la période manquante à chaque élève
    return { ok: true, message: "Passage à 3 trimestres : le 3e trimestre est vide." };
  }

  if (periodeContientDesDonnees(classe, 2)) {
    return {
      ok: false,
      message: "Le 3e trimestre contient des notes ou des appréciations. Vide-le d'abord pour passer à 2 semestres."
    };
  }
  classe.typePeriodes = "semestres";
  for (const eleve of classe.eleves) {
    eleve.periodes = eleve.periodes.slice(0, 2);
  }
  return { ok: true, message: "Passage à 2 semestres." };
}

// ---------- 3. OUTILS ----------
function arrondir(valeur) {
  return Math.round(valeur * 100) / 100;
}

function noteValide(note) {
  return typeof note === "number" && !isNaN(note) && note >= 0 && note <= 20;
}

// ---------- 4. NIVEAU 1 et 2 : LA MOYENNE D'UNE MATIÈRE ----------
// Interros : somme des interros saisies / nombre d'interros saisies.
// Cette moyenne d'interros compte pour UNE note, comme un devoir.
// Moyenne de la matière = (moyenne interros + devoirs) / nombre de parties présentes.
// Retourne null si aucune note n'est saisie.
function moyenneMatiere(eleve, matiere) {
  const notes = eleve.notes[matiere.nom];
  if (!notes) return null;

  const parties = [];

  let somme = 0;
  let nb = 0;
  for (let i = 0; i < matiere.nbInterros; i++) {
    const n = notes.interros ? notes.interros[i] : null;
    if (noteValide(n)) {
      somme += n;
      nb++;
    }
  }
  if (nb > 0) parties.push(somme / nb);

  for (let i = 0; i < matiere.nbDevoirs; i++) {
    const n = notes.devoirs ? notes.devoirs[i] : null;
    if (noteValide(n)) parties.push(n);
  }

  if (parties.length === 0) return null;

  let total = 0;
  for (const p of parties) total += p;
  return total / parties.length;
}

// ---------- 5. NIVEAU 3 : LA MOYENNE GÉNÉRALE ----------
// (somme de moyenne matière x coef) / (somme des coefs des matières notées)
function calculerMoyenne(eleve, matieres) {
  let total = 0;
  let sommeCoef = 0;

  for (const matiere of matieres) {
    const m = moyenneMatiere(eleve, matiere);
    if (m !== null) {
      total += m * matiere.coef;
      sommeCoef += matiere.coef;
    }
  }

  if (sommeCoef === 0) return null;
  return arrondir(total / sommeCoef);
}

// ---------- 6. MENTION ET DÉCISION ----------
function obtenirDecision(moyenne, seuil) {
  if (moyenne === null) return "";
  return moyenne >= seuil ? "Admis(e)" : "Ajourné(e)";
}

function obtenirMention(moyenne, seuil) {
  if (moyenne === null || moyenne < seuil) return "";
  if (moyenne >= 16) return "Très bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez bien";
  return "Passable";
}

// ---------- 7. LE CLASSEMENT (avec ex æquo) ----------
// Trie une liste de résultats (qui ont une "moyenne") du meilleur au plus faible
// et leur donne un rang. Deux élèves à égalité ont le même rang.
// Ceux sans moyenne (null) sont placés à la fin, sans rang.
function trierEtClasser(resultats) {
  resultats.sort(function (a, b) {
    if (a.moyenne === null && b.moyenne === null) return 0;
    if (a.moyenne === null) return 1;
    if (b.moyenne === null) return -1;
    return b.moyenne - a.moyenne;
  });

  for (let i = 0; i < resultats.length; i++) {
    if (resultats[i].moyenne === null) continue;
    if (i > 0 && resultats[i].moyenne === resultats[i - 1].moyenne) {
      resultats[i].rang = resultats[i - 1].rang;
    } else {
      resultats[i].rang = i + 1;
    }
  }
  return resultats;
}

// Prend UNE classe (ou une vue d'une période). Retourne les élèves triés :
// { eleve, nom, moyenne, moyennesMatieres, rang, mention, decision }
// ("eleve" est la fiche de l'élève telle qu'elle est dans classe.eleves)
function calculerClassement(classe) {
  const resultats = classe.eleves.map(function (eleve) {
    const moyenne = calculerMoyenne(eleve, classe.matieres);

    const moyennesMatieres = {};
    for (const matiere of classe.matieres) {
      const m = moyenneMatiere(eleve, matiere);
      moyennesMatieres[matiere.nom] = m === null ? null : arrondir(m);
    }

    return {
      eleve: eleve,
      nom: eleve.nom,
      moyenne: moyenne,
      moyennesMatieres: moyennesMatieres,
      rang: null,
      mention: obtenirMention(moyenne, classe.seuilAdmission),
      decision: obtenirDecision(moyenne, classe.seuilAdmission)
    };
  });

  return trierEtClasser(resultats);
}

// ---------- 8. LE RANG DANS CHAQUE MATIÈRE ----------
// Retourne un tableau dans le MÊME ORDRE que classe.eleves.
// Pour chaque élève : { "Maths": { rang: 2, sur: 40 }, ... }
// Un élève sans note dans une matière n'a pas de rang dans celle-ci.
// Deux élèves à égalité ont le même rang.
function calculerRangsParMatiere(classe) {
  const resultat = classe.eleves.map(function () {
    return {};
  });

  for (const matiere of classe.matieres) {
    const liste = [];
    classe.eleves.forEach(function (eleve, indice) {
      const m = moyenneMatiere(eleve, matiere);
      if (m !== null) liste.push({ indice: indice, moyenne: arrondir(m) });
    });

    liste.sort(function (a, b) {
      return b.moyenne - a.moyenne;
    });

    for (let k = 0; k < liste.length; k++) {
      let rang = k + 1;
      if (k > 0 && liste[k].moyenne === liste[k - 1].moyenne) {
        rang = resultat[liste[k - 1].indice][matiere.nom].rang;
      }
      resultat[liste[k].indice][matiere.nom] = { rang: rang, sur: liste.length };
    }
  }

  return resultat;
}

// ---------- 9. LES STATISTIQUES ----------
function calculerStatistiques(resultats, seuil) {
  const evalues = resultats.filter(function (r) {
    return r.moyenne !== null;
  });

  if (evalues.length === 0) return null;

  let somme = 0;
  let admis = 0;
  for (const r of evalues) {
    somme += r.moyenne;
    if (r.moyenne >= seuil) admis++;
  }

  return {
    effectif: evalues.length,
    admis: admis,
    ajournes: evalues.length - admis,
    pourcentageReussite: arrondir((admis / evalues.length) * 100),
    moyenneClasse: arrondir(somme / evalues.length),
    meilleur: evalues[0],
    plusFaible: evalues[evalues.length - 1]
  };
}

// ---------- 10. LA MOYENNE ANNUELLE ----------
// Moyenne annuelle = moyenne des moyennes générales de chaque période
// (même poids pour chaque période), calculée sur les périodes où l'élève a des notes.
// Prend la VRAIE classe. Retourne les élèves classés par moyenne annuelle :
// { eleve, nom, periodes: [{ moyenne, rang, sur }, ...], moyenne, nbPeriodesNotees,
//   nbPeriodes, incomplet, rang, mention, decision }
function calculerAnnuel(classe) {
  const n = nombrePeriodes(classe);

  // Pour chaque période : le classement de la période
  const parPeriode = [];
  for (let p = 0; p < n; p++) {
    const classement = calculerClassement(vuePeriode(classe, p));
    const index = new Map();
    let effectif = 0;
    for (const r of classement) {
      index.set(r.eleve.source, r);
      if (r.moyenne !== null) effectif++;
    }
    parPeriode.push({ index: index, effectif: effectif });
  }

  const resultats = classe.eleves.map(function (eleve) {
    const periodes = parPeriode.map(function (pp) {
      const r = pp.index.get(eleve);
      return {
        moyenne: r ? r.moyenne : null,
        rang: r ? r.rang : null,
        sur: pp.effectif
      };
    });

    let somme = 0;
    let nb = 0;
    for (const p of periodes) {
      if (p.moyenne !== null) {
        somme += p.moyenne;
        nb++;
      }
    }
    const moyenne = nb === 0 ? null : arrondir(somme / nb);

    return {
      eleve: eleve,
      nom: eleve.nom,
      periodes: periodes,
      moyenne: moyenne,
      nbPeriodesNotees: nb,
      nbPeriodes: n,
      incomplet: nb > 0 && nb < n,
      rang: null,
      mention: obtenirMention(moyenne, classe.seuilAdmission),
      decision: obtenirDecision(moyenne, classe.seuilAdmission)
    };
  });

  return trierEtClasser(resultats);
}

// ---------- 11. L'APPRÉCIATION AUTOMATIQUE ----------
// Ce n'est pas de l'IA : l'app lit les notes et compose une phrase
// à partir de modèles de textes. Elle ne connaît que les notes,
// pas l'attitude ni l'assiduité de l'élève.

// Niveaux : 0 très insuffisant, 1 insuffisant, 2 passable,
//           3 assez bon, 4 bon, 5 excellent
const DEBUTS_APPRECIATION = [
  ["Résultats très insuffisants.", "Résultats faibles.", "Niveau très insuffisant pour l'instant."],
  ["Résultats insuffisants.", "Résultats fragiles, proches du seuil de réussite.", "Niveau insuffisant pour l'instant."],
  ["Résultats passables.", "Résultats justes, sans marge.", "Niveau passable."],
  ["Résultats satisfaisants.", "Travail assez bon.", "Résultats corrects."],
  ["Bons résultats.", "Très bon travail.", "Bon travail dans l'ensemble."],
  ["Excellents résultats.", "Travail remarquable.", "Résultats très brillants."]
];

const FINS_APPRECIATION = [
  ["Un travail beaucoup plus soutenu est indispensable.", "Il faut redoubler d'efforts."],
  ["Un travail plus régulier est indispensable.", "Doit redoubler d'efforts pour réussir."],
  ["Un travail plus régulier est nécessaire.", "Doit gagner en régularité."],
  ["Peut mieux faire.", "Encouragements pour la suite."],
  ["Encouragements.", "À poursuivre."],
  ["Félicitations.", "Félicitations pour ce travail."]
];

// Un nombre stable calculé à partir du nom : le même élève reçoit toujours
// la même phrase, mais deux élèves différents n'ont pas toujours la même.
function graine(texte) {
  const t = String(texte);
  let h = 7;
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) % 1000003;
  }
  return h;
}

function niveauAppreciation(moyenne, seuil) {
  if (moyenne < seuil) return moyenne >= seuil - 2 ? 1 : 0;
  if (moyenne >= 16) return 5;
  if (moyenne >= 14) return 4;
  if (moyenne >= 12) return 3;
  return 2;
}

// La meilleure et la plus faible matière de l'élève,
// seulement s'il y a au moins 2 matières et un écart d'au moins 3 points.
function matieresExtremes(classe, eleve) {
  let forte = null;
  let faible = null;
  for (const matiere of classe.matieres) {
    const m = moyenneMatiere(eleve, matiere);
    if (m === null) continue;
    const entree = { nom: matiere.nom, moyenne: m };
    if (forte === null || m > forte.moyenne) forte = entree;
    if (faible === null || m < faible.moyenne) faible = entree;
  }
  if (forte === null || forte.nom === faible.nom) return null;
  if (forte.moyenne - faible.moyenne < 3) return null;
  return { forte: forte, faible: faible };
}

// Retourne le texte automatique, ou "" si l'élève n'a aucune note
function genererAppreciation(classe, eleve) {
  const moyenne = calculerMoyenne(eleve, classe.matieres);
  if (moyenne === null) return "";

  const niveau = niveauAppreciation(moyenne, classe.seuilAdmission);
  const g = graine(eleve.nom);
  const debuts = DEBUTS_APPRECIATION[niveau];
  const fins = FINS_APPRECIATION[niveau];
  const debut = debuts[g % debuts.length];
  const fin = fins[Math.floor(g / 7) % fins.length];

  let detail = "";
  const extremes = matieresExtremes(classe, eleve);
  if (extremes !== null) {
    if (niveau === 5) {
      detail = "Très bonnes performances en " + extremes.forte.nom + ".";
    } else if (niveau === 4) {
      detail = "Peut encore progresser en " + extremes.faible.nom + ".";
    } else {
      detail = "Doit fournir plus d'efforts en " + extremes.faible.nom + ".";
    }
  }

  let texte = detail === "" ? debut : debut + " " + detail;
  if ((texte + " " + fin).length <= LONGUEUR_MAX_APPRECIATION) {
    texte = texte + " " + fin;
  } else if (texte.length > LONGUEUR_MAX_APPRECIATION) {
    texte = debut + " " + fin;
  }

  return texte.length > LONGUEUR_MAX_APPRECIATION ? texte.slice(0, LONGUEUR_MAX_APPRECIATION) : texte;
}

// Le texte qui sera imprimé sur le bulletin :
// - ce que l'enseignant a écrit, s'il a écrit quelque chose (dans les deux modes)
// - sinon le texte automatique, si la classe est en mode automatique
// - sinon "" (le bulletin laissera deux lignes vides)
function appreciationPourBulletin(classe, eleve) {
  const saisie = String(eleve.appreciation || "").trim();
  if (saisie !== "") return saisie;
  if (classe.modeAppreciation === "manuel") return "";
  return genererAppreciation(classe, eleve);
}

// ---------- 12. LE BILAN ANNUEL PAR MATIÈRE ----------
// Retourne un tableau dans le MÊME ORDRE que classe.eleves.
// Pour chaque élève : { "Maths": { periodes: [m1, m2, m3], moyenne, rang, sur }, ... }
// - periodes : la moyenne de la matière dans chaque période (null si pas de note)
// - moyenne : moyenne annuelle de la matière = moyenne de ses moyennes de période
//   (calculée sur les périodes où elle est notée)
// - rang : le rang de l'élève dans la matière sur l'année (ex æquo possibles)
function calculerMatieresAnnuelles(classe) {
  const n = nombrePeriodes(classe);
  const vues = [];
  for (let p = 0; p < n; p++) vues.push(vuePeriode(classe, p));

  const resultat = classe.eleves.map(function () {
    return {};
  });

  for (const matiere of classe.matieres) {
    const liste = [];

    classe.eleves.forEach(function (eleve, indice) {
      const periodes = vues.map(function (v) {
        const m = moyenneMatiere(v.eleves[indice], matiere);
        return m === null ? null : arrondir(m);
      });

      let somme = 0;
      let nb = 0;
      for (const m of periodes) {
        if (m !== null) {
          somme += m;
          nb++;
        }
      }
      const moyenne = nb === 0 ? null : arrondir(somme / nb);

      resultat[indice][matiere.nom] = { periodes: periodes, moyenne: moyenne, rang: null, sur: 0 };
      if (moyenne !== null) liste.push({ indice: indice, moyenne: moyenne });
    });

    liste.sort(function (a, b) {
      return b.moyenne - a.moyenne;
    });

    for (let k = 0; k < liste.length; k++) {
      let rang = k + 1;
      if (k > 0 && liste[k].moyenne === liste[k - 1].moyenne) {
        rang = resultat[liste[k - 1].indice][matiere.nom].rang;
      }
      resultat[liste[k].indice][matiere.nom].rang = rang;
      resultat[liste[k].indice][matiere.nom].sur = liste.length;
    }
  }

  return resultat;
}

// La moyenne de la classe dans chaque période (null si personne n'a de note)
function moyennesClasseParPeriode(classe) {
  const resultat = [];
  for (let p = 0; p < nombrePeriodes(classe); p++) {
    const vue = vuePeriode(classe, p);
    const stats = calculerStatistiques(calculerClassement(vue), classe.seuilAdmission);
    resultat.push(stats === null ? null : stats.moyenneClasse);
  }
  return resultat;
}

// La meilleure et la plus faible matière de l'élève sur l'année.
// matieresEleve : un élément de calculerMatieresAnnuelles.
// Retourne null s'il y a moins de 2 matières notées.
function extremesAnnuels(matieresEleve) {
  let forte = null;
  let faible = null;
  for (const nom of Object.keys(matieresEleve)) {
    const m = matieresEleve[nom].moyenne;
    if (m === null) continue;
    const entree = { nom: nom, moyenne: m };
    if (forte === null || m > forte.moyenne) forte = entree;
    if (faible === null || m < faible.moyenne) faible = entree;
  }
  if (forte === null || forte.nom === faible.nom) return null;
  return { forte: forte, faible: faible };
}

// La tendance de l'élève dans l'année : compare sa première et sa dernière
// moyenne de période. Retourne null s'il a moins de 2 périodes notées.
// resultat : un élément de calculerAnnuel.
function tendanceEleve(resultat) {
  const moyennes = resultat.periodes
    .map(function (p) { return p.moyenne; })
    .filter(function (m) { return m !== null; });
  if (moyennes.length < 2) return null;

  const debut = moyennes[0];
  const fin = moyennes[moyennes.length - 1];
  const ecart = fin - debut;

  let sens = "stable";
  if (ecart >= 0.5) sens = "progression";
  else if (ecart <= -0.5) sens = "baisse";

  return { sens: sens, debut: debut, fin: fin };
}

// ---------- 13. L'APPRÉCIATION ANNUELLE AUTOMATIQUE ----------
// Même principe que l'appréciation d'une période, mais elle regarde toute l'année :
// la moyenne annuelle, la tendance, et la meilleure / plus faible matière.
const DEBUTS_ANNUELS = [
  ["Résultats annuels très insuffisants.", "Année très difficile sur le plan des résultats."],
  ["Résultats annuels insuffisants.", "Année fragile, proche du seuil de réussite."],
  ["Résultats annuels passables.", "Année juste, sans marge."],
  ["Résultats annuels satisfaisants.", "Année correcte dans l'ensemble."],
  ["Bons résultats sur l'année.", "Très bonne année dans l'ensemble."],
  ["Excellente année.", "Résultats annuels remarquables."]
];

const FINS_ANNUELLES = [
  ["Un travail beaucoup plus soutenu est indispensable.", "Il faut redoubler d'efforts."],
  ["Un travail plus régulier est indispensable pour réussir.", "Doit redoubler d'efforts."],
  ["Un travail plus régulier est nécessaire.", "Doit gagner en régularité."],
  ["Peut mieux faire.", "Encouragements pour la suite."],
  ["Encouragements.", "À poursuivre."],
  ["Félicitations.", "Félicitations pour cette année de travail."]
];

// resultat : un élément de calculerAnnuel ; matieresEleve : un élément de calculerMatieresAnnuelles.
// Retourne "" si l'élève n'a aucune note dans l'année.
function genererAppreciationAnnuelle(classe, resultat, matieresEleve) {
  if (!resultat || resultat.moyenne === null) return "";

  const niveau = niveauAppreciation(resultat.moyenne, classe.seuilAdmission);
  const g = graine(resultat.nom);
  const debuts = DEBUTS_ANNUELS[niveau];
  const fins = FINS_ANNUELLES[niveau];
  const debut = debuts[g % debuts.length];
  const fin = fins[Math.floor(g / 7) % fins.length];

  // Détail sur les matières (seulement si l'écart est d'au moins 3 points)
  let detail = "";
  const extremes = extremesAnnuels(matieresEleve || {});
  if (extremes !== null && extremes.forte.moyenne - extremes.faible.moyenne >= 3) {
    if (niveau === 5) {
      detail = "Très bonnes performances en " + extremes.forte.nom + ".";
    } else if (niveau === 4) {
      detail = "Peut encore progresser en " + extremes.faible.nom + ".";
    } else {
      detail = "Doit fournir plus d'efforts en " + extremes.faible.nom + ".";
    }
  }

  // Tendance au fil des périodes
  let tendance = "";
  const t = tendanceEleve(resultat);
  if (t !== null) {
    if (t.sens === "progression") tendance = "Belle progression au fil des périodes.";
    else if (t.sens === "baisse") tendance = "Résultats en baisse au fil des périodes.";
    else tendance = "Niveau régulier tout au long de l'année.";
  }

  // On ajoute les morceaux dans l'ordre tant que ça tient dans la limite
  let texte = debut;
  for (const morceau of [detail, tendance, fin]) {
    if (morceau !== "" && (texte + " " + morceau).length <= LONGUEUR_MAX_APPRECIATION) {
      texte = texte + " " + morceau;
    }
  }
  return texte.length > LONGUEUR_MAX_APPRECIATION ? texte.slice(0, LONGUEUR_MAX_APPRECIATION) : texte;
}

// Le texte qui sera imprimé sur le bulletin annuel (mêmes règles que pour une période).
// eleve : la VRAIE fiche de l'élève.
function appreciationAnnuellePourBulletin(classe, eleve, resultat, matieresEleve) {
  const saisie = String(eleve.appreciationAnnuelle || "").trim();
  if (saisie !== "") return saisie;
  if (classe.modeAppreciation === "manuel") return "";
  return genererAppreciationAnnuelle(classe, resultat, matieresEleve);
}