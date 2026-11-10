let classeOuverte = null;   // la vraie classe affichée à l'écran (null = accueil)
let periodeActive = 0;      // 0, 1, 2 = une période ; "annee" = l'onglet Année
let vue = null;             // la "vue" de la période active (null sur l'onglet Année)

// Pour chaque élève de la vue : sa zone d'appréciation et son bouton "Rétablir"
const zonesAppreciation = new Map();

// Pareil pour les appréciations de l'année (élèves = vraies fiches)
const zonesAppreciationAnnuelle = new Map();

// Les résultats de l'année de chaque élève (calculés à l'ouverture de l'onglet Année)
let bilanAnnuel = new Map();

// ---------- 1. LES ÉLÉMENTS DE LA PAGE ----------
const ecranAccueil = document.getElementById("ecran-accueil");
const ecranClasse = document.getElementById("ecran-classe");

const elBanniere = document.getElementById("banniere");
const elAvantages = document.getElementById("avantages");
const elBtnHeroCreer = document.getElementById("btn-hero-creer");
const elBlocNouvelleClasse = document.getElementById("bloc-nouvelle-classe");
const elNouvelleClasse = document.getElementById("input-nouvelle-classe");
const elTypeCreation = document.getElementById("select-type-creation");
const elBtnCreerClasse = document.getElementById("btn-creer-classe");
const elEtatVide = document.getElementById("etat-vide");
const elListeClasses = document.getElementById("liste-classes");

const elBtnExporter = document.getElementById("btn-exporter");
const elBtnImporter = document.getElementById("btn-importer");
const elInputImport = document.getElementById("input-import");
const elMessageSauvegarde = document.getElementById("message-sauvegarde");

const elBtnRetour = document.getElementById("btn-retour");
const elTitreClasse = document.getElementById("titre-classe");
const elNomClasse = document.getElementById("input-nom-classe");
const elEtablissement = document.getElementById("input-etablissement");
const elAnnee = document.getElementById("input-annee");
const elTypePeriodes = document.getElementById("select-type-periodes");
const elMessagePeriodes = document.getElementById("message-periodes");
const elSeuil = document.getElementById("input-seuil");
const elModeAppreciation = document.getElementById("select-mode-appreciation");

const elNomMatiere = document.getElementById("input-nom-matiere");
const elCoefMatiere = document.getElementById("input-coef-matiere");
const elSelectInterros = document.getElementById("select-interros");
const elSelectDevoirs = document.getElementById("select-devoirs");
const elBtnMatiere = document.getElementById("btn-ajouter-matiere");
const elListeMatieres = document.getElementById("liste-matieres");

const elOnglets = document.getElementById("onglets");
const elVuePeriode = document.getElementById("vue-periode");
const elVueAnnee = document.getElementById("vue-annee");

const elTitreNotes = document.getElementById("titre-notes");
const elNomEleve = document.getElementById("input-nom-eleve");
const elBtnEleve = document.getElementById("btn-ajouter-eleve");
const elBtnTrier = document.getElementById("btn-trier");
const elTableauNotes = document.getElementById("tableau-notes");

const elTitreAppreciations = document.getElementById("titre-appreciations");
const elAideAppreciation = document.getElementById("aide-appreciation");
const elListeAppreciations = document.getElementById("liste-appreciations");

const elTitreResultats = document.getElementById("titre-resultats");
const elBtnBulletins = document.getElementById("btn-bulletins");
const elBtnExportPdf = document.getElementById("btn-export-pdf");
const elBtnExportExcel = document.getElementById("btn-export-excel");
const elMessageExport = document.getElementById("message-export");
const elStats = document.getElementById("zone-stats");
const elClassement = document.getElementById("tableau-classement");

const elBtnBulletinsAnnuels = document.getElementById("btn-bulletins-annuels");
const elBtnRecapAnnuelPdf = document.getElementById("btn-recap-annuel-pdf");
const elBtnRecapAnnuelExcel = document.getElementById("btn-recap-annuel-excel");
const elMessageAnnee = document.getElementById("message-annee");
const elAideAppreciationAnnuelle = document.getElementById("aide-appreciation-annuelle");
const elListeAppreciationsAnnuelles = document.getElementById("liste-appreciations-annuelles");
const elStatsAnnee = document.getElementById("stats-annee");
const elTableauAnnee = document.getElementById("tableau-annee");

// ---------- 2. PETITS OUTILS ----------
function vider(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function creer(balise, texte) {
  const element = document.createElement(balise);
  if (texte !== undefined) element.textContent = texte;
  return element;
}

function formater(nombre) {
  return nombre.toFixed(2).replace(".", ",");
}

// 1 élève, 2 élèves...
function pluriel(nombre, mot) {
  return nombre + " " + mot + (nombre > 1 ? "s" : "");
}

function creerBouton(texte, classe, action) {
  const bouton = creer("button", texte);
  bouton.type = "button";
  if (classe) bouton.className = classe;
  bouton.addEventListener("click", action);
  return bouton;
}

// Affiche un message coloré (vert si ok, rouge sinon) dans un élément
function afficherMessage(element, texte, ok) {
  element.textContent = texte;
  element.style.color = ok ? "#166534" : "#dc2626";
}

// ---------- 3. ÉCRAN D'ACCUEIL : LES CARTES DE CLASSES ----------

// La première lettre du nom, pour la pastille de couleur
function initiale(nom) {
  const texte = String(nom || "").trim();
  return texte === "" ? "?" : texte.charAt(0).toUpperCase();
}

// Moyenne de la classe (sur l'année), ou null s'il n'y a pas encore de notes
function moyenneDeLaClasse(classe) {
  try {
    const stats = calculerStatistiques(calculerAnnuel(classe), classe.seuilAdmission);
    return stats === null ? null : stats.moyenneClasse;
  } catch (erreur) {
    return null;
  }
}

// Place le curseur dans le champ "Nouvelle classe"
function allerAuFormulaire() {
  elBlocNouvelleClasse.scrollIntoView({ behavior: "smooth", block: "center" });
  elNouvelleClasse.focus({ preventScroll: true });
}

function afficherAccueil() {
  classeOuverte = null;
  vue = null;
  ecranClasse.hidden = true;
  ecranAccueil.hidden = false;
  vider(elListeClasses);

  const aucuneClasse = donnees.classes.length === 0;

  // Nouvel utilisateur : grande bannière + 3 atouts + message de bienvenue.
  // Enseignant qui a déjà des classes : bannière compacte, ses classes en premier.
  elBanniere.classList.toggle("compacte", !aucuneClasse);
  elAvantages.hidden = !aucuneClasse;
  elEtatVide.hidden = !aucuneClasse;
  elListeClasses.hidden = aucuneClasse;
  if (aucuneClasse) return;

  for (let i = 0; i < donnees.classes.length; i++) {
    const classe = donnees.classes[i];

    const carte = creer("li");
    carte.className = "carte-classe";
    carte.style.animationDelay = (i * 60) + "ms";

    // Partie cliquable : pastille + informations
    const principal = creer("button");
    principal.type = "button";
    principal.className = "carte-principale";
    principal.addEventListener("click", function () {
      ouvrirClasse(classe);
    });

    const pastille = creer("span", initiale(classe.nom));
    pastille.className = "pastille c" + (i % 4);

    const moyenne = moyenneDeLaClasse(classe);
    const infos = creer("span");
    infos.className = "carte-infos";

    infos.appendChild(creer("strong", classe.nom || "Sans nom"));

    const detail = creer("span", pluriel(classe.eleves.length, "élève") + " · " + pluriel(classe.matieres.length, "matière"));
    detail.className = "carte-detail";
    infos.appendChild(detail);

    const texteMoyenne = moyenne === null ? "Pas encore de notes" : "Moyenne de la classe : " + formater(moyenne);
    const ligneMoyenne = creer("span", texteMoyenne);
    ligneMoyenne.className = "carte-moyenne";
    infos.appendChild(ligneMoyenne);

    principal.appendChild(pastille);
    principal.appendChild(infos);

    carte.appendChild(principal);
    carte.appendChild(creerBouton("Supprimer", "btn-danger carte-supprimer", function () {
      supprimerClasse(classe);
    }));

    elListeClasses.appendChild(carte);
  }
}

function creerClasse() {
  const nom = elNouvelleClasse.value.trim();
  if (nom === "") {
    alert("Écris le nom de la classe.");
    return;
  }

  const classe = nouvelleClasse(nom, elTypeCreation.value);
  donnees.classes.push(classe);
  sauvegarder();
  elNouvelleClasse.value = "";
  ouvrirClasse(classe);
}

function supprimerClasse(classe) {
  if (!confirm("Supprimer la classe « " + classe.nom + " » et toutes ses notes ? Cette action est irréversible.")) {
    return;
  }
  donnees.classes = donnees.classes.filter(function (c) {
    return c !== classe;
  });
  sauvegarder();
  afficherAccueil();
}

// La période où l'enseignant a le plus probablement envie de reprendre :
// la dernière qui contient des notes (sinon la première)
function periodeParDefaut(classe) {
  for (let p = nombrePeriodes(classe) - 1; p >= 0; p--) {
    if (periodeContientDesDonnees(classe, p)) return p;
  }
  return 0;
}

function ouvrirClasse(classe) {
  classeOuverte = classe;
  ecranAccueil.hidden = true;
  ecranClasse.hidden = false;
  elMessageSauvegarde.textContent = "";
  elMessagePeriodes.textContent = "";

  // Les réglages (les classes anciennes n'ont pas les nouveaux champs : "" par défaut)
  elTitreClasse.textContent = classe.nom;
  elNomClasse.value = classe.nom;
  elEtablissement.value = classe.etablissement || "";
  elAnnee.value = classe.anneeScolaire || "";
  elTypePeriodes.value = classe.typePeriodes === "semestres" ? "semestres" : "trimestres";
  elSeuil.value = classe.seuilAdmission;
  elModeAppreciation.value = classe.modeAppreciation === "manuel" ? "manuel" : "auto";

  afficherMatieres();
  afficherOnglets();
  selectionnerOnglet(periodeParDefaut(classe));
  window.scrollTo(0, 0);
}

// ---------- 3 bis. EXPORTER ET IMPORTER UNE SAUVEGARDE ----------
function exporter() {
  if (donnees.classes.length === 0) {
    afficherMessage(elMessageSauvegarde, "Aucune classe à sauvegarder pour l'instant.", false);
    return;
  }
  exporterSauvegarde();
  afficherMessage(elMessageSauvegarde, "Sauvegarde téléchargée. Garde ce fichier en lieu sûr (WhatsApp, email...).", true);
}

// Appelée quand l'enseignant a choisi un fichier
function importer() {
  const fichier = elInputImport.files[0];
  if (!fichier) return;

  const lecteur = new FileReader();

  lecteur.onload = function () {
    const resultat = importerSauvegarde(String(lecteur.result));
    afficherMessage(elMessageSauvegarde, resultat.message, resultat.ok);
    afficherAccueil();
  };

  lecteur.onerror = function () {
    afficherMessage(elMessageSauvegarde, "Impossible de lire ce fichier.", false);
  };

  lecteur.readAsText(fichier);
  elInputImport.value = "";   // permet de choisir deux fois le même fichier
}

// ---------- 4. LES MATIÈRES (communes à toute l'année) ----------
function afficherMatieres() {
  vider(elListeMatieres);

  for (const matiere of classeOuverte.matieres) {
    const texte = matiere.nom + " (coef " + matiere.coef + ", "
      + matiere.nbInterros + " interro(s), " + matiere.nbDevoirs + " devoir(s))";

    const ligne = creer("li");
    ligne.appendChild(creer("span", texte));
    ligne.appendChild(creerBouton("Supprimer", "btn-danger", function () {
      supprimerMatiere(matiere);
    }));
    elListeMatieres.appendChild(ligne);
  }
}

function ajouterMatiere() {
  const nom = elNomMatiere.value.trim();
  const coef = parseFloat(elCoefMatiere.value);
  const nbInterros = parseInt(elSelectInterros.value, 10);
  const nbDevoirs = parseInt(elSelectDevoirs.value, 10);

  if (nom === "") {
    alert("Écris le nom de la matière.");
    return;
  }
  if (isNaN(coef) || coef <= 0) {
    alert("Le coefficient doit être un nombre supérieur à 0.");
    return;
  }
  for (const m of classeOuverte.matieres) {
    if (m.nom.toLowerCase() === nom.toLowerCase()) {
      alert("Cette matière existe déjà.");
      return;
    }
  }

  classeOuverte.matieres.push({ nom: nom, coef: coef, nbInterros: nbInterros, nbDevoirs: nbDevoirs });
  sauvegarder();

  elNomMatiere.value = "";
  elCoefMatiere.value = "";
  elNomMatiere.focus();

  afficherMatieres();
  rafraichirOnglet();
}

function supprimerMatiere(matiere) {
  if (!confirm("Supprimer la matière « " + matiere.nom + " » et les notes associées, dans toutes les périodes ?")) return;

  classeOuverte.matieres = classeOuverte.matieres.filter(function (m) {
    return m !== matiere;
  });
  // Les notes de cette matière sont supprimées dans TOUTES les périodes
  for (const eleve of classeOuverte.eleves) {
    for (const p of eleve.periodes) {
      delete p.notes[matiere.nom];
    }
  }
  sauvegarder();

  afficherMatieres();
  rafraichirOnglet();
}

// ---------- 5. LES ONGLETS ----------
function afficherOnglets() {
  vider(elOnglets);

  const noms = nomsPeriodes(classeOuverte);
  noms.forEach(function (nom, indice) {
    const bouton = creerBouton(nom, "onglet", function () {
      selectionnerOnglet(indice);
    });
    bouton.dataset.onglet = String(indice);
    elOnglets.appendChild(bouton);
  });

  const boutonAnnee = creerBouton("Année", "onglet", function () {
    selectionnerOnglet("annee");
  });
  boutonAnnee.dataset.onglet = "annee";
  elOnglets.appendChild(boutonAnnee);
}

function selectionnerOnglet(onglet) {
  periodeActive = onglet;

  for (const bouton of elOnglets.children) {
    bouton.classList.toggle("actif", bouton.dataset.onglet === String(onglet));
  }

  const estAnnee = onglet === "annee";
  elVuePeriode.hidden = estAnnee;
  elVueAnnee.hidden = !estAnnee;
  elMessageExport.textContent = "";
  elMessageAnnee.textContent = "";

  rafraichirOnglet();
}

// Redessine tout ce qui dépend de l'onglet affiché
function rafraichirOnglet() {
  if (periodeActive === "annee") {
    vue = null;
    afficherAnnee();
  } else {
    vue = vuePeriode(classeOuverte, periodeActive);
    elTitreNotes.textContent = "Les élèves et les notes · " + vue.periode;
    elTitreAppreciations.textContent = "Les appréciations · " + vue.periode;
    elTitreResultats.textContent = "Les résultats · " + vue.periode;
    afficherNotes();
    afficherAppreciations();
    afficherResultats();
  }
}

// ---------- 5 bis. CHANGER LE DÉCOUPAGE DE L'ANNÉE ----------
function changerDecoupage() {
  const resultat = changerTypePeriodes(classeOuverte, elTypePeriodes.value);

  if (!resultat.ok) {
    // Refusé : on remet le choix d'avant
    elTypePeriodes.value = classeOuverte.typePeriodes;
    afficherMessage(elMessagePeriodes, resultat.message, false);
    return;
  }

  sauvegarder();
  afficherMessage(elMessagePeriodes, resultat.message, true);

  afficherOnglets();
  const nb = nombrePeriodes(classeOuverte);
  const aGarder = (periodeActive === "annee" || periodeActive < nb) ? periodeActive : 0;
  selectionnerOnglet(aGarder);
}

// ---------- 6. LES ÉLÈVES ET LE TABLEAU DE SAISIE (période active) ----------
function creerChamp(eleve, matiere, type, index) {
  const champ = document.createElement("input");
  champ.type = "number";
  champ.min = 0;
  champ.max = 20;
  champ.step = "0.01";

  const notes = eleve.notes[matiere.nom];
  if (notes && notes[type] && noteValide(notes[type][index])) {
    champ.value = notes[type][index];
  }

  champ.addEventListener("input", function () {
    enregistrerNote(eleve, matiere, type, index, champ);
  });
  return champ;
}

function afficherNotes() {
  vider(elTableauNotes);

  if (vue.matieres.length === 0 || vue.eleves.length === 0) {
    const ligne = creer("tr");
    ligne.appendChild(creer("td", "Ajoute au moins une matière et un élève pour saisir les notes."));
    elTableauNotes.appendChild(ligne);
    return;
  }

  // En-tête : Élève | Matière · Int 1 | Matière · Int 2 | Matière · Dev 1 ...
  const entete = creer("tr");
  entete.appendChild(creer("th", "Élève"));
  for (const matiere of vue.matieres) {
    for (let i = 0; i < matiere.nbInterros; i++) {
      entete.appendChild(creer("th", matiere.nom + " · Int " + (i + 1)));
    }
    for (let i = 0; i < matiere.nbDevoirs; i++) {
      entete.appendChild(creer("th", matiere.nom + " · Dev " + (i + 1)));
    }
  }
  entete.appendChild(creer("th", ""));
  elTableauNotes.appendChild(entete);

  for (const eleve of vue.eleves) {
    const ligne = creer("tr");
    ligne.appendChild(creer("td", eleve.nom));

    for (const matiere of vue.matieres) {
      for (let i = 0; i < matiere.nbInterros; i++) {
        const cellule = creer("td");
        cellule.appendChild(creerChamp(eleve, matiere, "interros", i));
        ligne.appendChild(cellule);
      }
      for (let i = 0; i < matiere.nbDevoirs; i++) {
        const cellule = creer("td");
        cellule.appendChild(creerChamp(eleve, matiere, "devoirs", i));
        ligne.appendChild(cellule);
      }
    }

    const celluleSupp = creer("td");
    celluleSupp.appendChild(creerBouton("Supprimer", "btn-danger", function () {
      supprimerEleve(eleve);
    }));
    ligne.appendChild(celluleSupp);

    elTableauNotes.appendChild(ligne);
  }
}

function ajouterEleve() {
  const nom = elNomEleve.value.trim();
  if (nom === "") {
    alert("Écris le nom de l'élève.");
    return;
  }

  classeOuverte.eleves.push(nouvelEleve(classeOuverte, nom));
  sauvegarder();

  elNomEleve.value = "";
  elNomEleve.focus();

  rafraichirOnglet();
}

// "eleve" est l'élève de la vue : sa vraie fiche est eleve.source
function supprimerEleve(eleve) {
  if (!confirm("Supprimer l'élève « " + eleve.nom + " » (dans toutes les périodes) ?")) return;

  classeOuverte.eleves = classeOuverte.eleves.filter(function (e) {
    return e !== eleve.source;
  });
  sauvegarder();

  rafraichirOnglet();
}

// Tri alphabétique, déclenché seulement par le bouton.
// Les notes et l'appréciation suivent chaque élève car elles sont dans sa fiche.
function trierEleves() {
  classeOuverte.eleves.sort(function (a, b) {
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  });
  sauvegarder();
  rafraichirOnglet();
}

// Appelée à chaque chiffre tapé dans une case.
// On ne redessine pas le tableau de saisie (le curseur sauterait).
function enregistrerNote(eleve, matiere, type, index, champ) {
  if (!eleve.notes[matiere.nom]) {
    eleve.notes[matiere.nom] = { interros: [], devoirs: [] };
  }
  const liste = eleve.notes[matiere.nom][type];
  const texte = champ.value.trim();

  if (texte === "") {
    liste[index] = null;
    champ.classList.remove("invalide");
  } else {
    const note = parseFloat(texte);
    if (noteValide(note)) {
      liste[index] = note;
      champ.classList.remove("invalide");
    } else {
      liste[index] = null;
      champ.classList.add("invalide");
    }
  }

  sauvegarder();
  afficherResultats();
  rafraichirAppreciation(eleve);   // le texte automatique suit les notes
}

// ---------- 6 bis. LES APPRÉCIATIONS ----------
// Le même fonctionnement pour les appréciations d'une période et celles de l'année.
// "acces" dit comment lire, écrire et générer le texte d'un élève :
//   { lire(): texte écrit par l'enseignant, ecrire(texte), generer(): texte automatique }

function modeAutomatique() {
  return classeOuverte.modeAppreciation !== "manuel";
}

// Met à jour la zone d'un élève :
// - ce que l'enseignant a écrit, s'il a écrit quelque chose
// - sinon le texte automatique (en mode automatique), sinon rien
// La zone n'est pas touchée pendant que l'enseignant y écrit.
function rafraichirZoneAppreciation(eleve, zones) {
  const element = zones.get(eleve);
  if (!element) return;

  const auto = modeAutomatique();
  const saisie = String(element.acces.lire() || "").trim();

  if (document.activeElement !== element.zone) {
    if (saisie !== "") {
      element.zone.value = element.acces.lire();
    } else {
      element.zone.value = auto ? element.acces.generer() : "";
    }
  }

  // Le bouton "Rétablir" n'a de sens que si l'enseignant a remplacé le texte automatique
  element.bouton.hidden = !(auto && saisie !== "");
}

// Crée le bloc (nom + zone de texte + bouton "Rétablir") d'un élève
function creerBlocAppreciation(eleve, acces, zones, conteneur) {
  const auto = modeAutomatique();

  const bloc = creer("div");
  bloc.className = "bloc-appreciation";
  bloc.appendChild(creer("strong", eleve.nom));

  const zone = document.createElement("textarea");
  zone.rows = 2;
  zone.maxLength = LONGUEUR_MAX_APPRECIATION;
  zone.placeholder = auto
    ? "Le texte automatique sera utilisé si ce champ reste vide"
    : "Écris l'appréciation (sinon deux lignes vides sur le bulletin)";

  const bouton = creerBouton("Rétablir l'automatique", "btn-secondaire btn-petit", function () {
    acces.ecrire("");
    sauvegarder();
    rafraichirZoneAppreciation(eleve, zones);
  });

  zone.addEventListener("input", function () {
    acces.ecrire(zone.value.slice(0, LONGUEUR_MAX_APPRECIATION));
    sauvegarder();
    const saisie = String(acces.lire() || "").trim();
    bouton.hidden = !(modeAutomatique() && saisie !== "");
  });

  bloc.appendChild(zone);
  bloc.appendChild(bouton);
  conteneur.appendChild(bloc);

  zones.set(eleve, { zone: zone, bouton: bouton, acces: acces });
  rafraichirZoneAppreciation(eleve, zones);
}

// --- Les appréciations d'une période (période active) ---

function rafraichirAppreciation(eleve) {
  rafraichirZoneAppreciation(eleve, zonesAppreciation);
}

function afficherAppreciations() {
  vider(elListeAppreciations);
  zonesAppreciation.clear();

  const auto = modeAutomatique();
  elAideAppreciation.textContent = auto
    ? "Mode automatique : le texte est composé à partir des notes de chaque élève. Écris dans une zone pour le remplacer. Il se mettra à jour seul tant que tu ne l'as pas modifié."
    : "Mode manuel : seul ce que tu écris est imprimé. Une zone vide laisse deux lignes vides sur le bulletin.";

  if (vue.eleves.length === 0) {
    elListeAppreciations.appendChild(creer("p", "Ajoute des élèves pour écrire leurs appréciations."));
    return;
  }

  for (const eleve of vue.eleves) {
    creerBlocAppreciation(eleve, {
      lire: function () { return eleve.appreciation; },
      ecrire: function (texte) { eleve.appreciation = texte; },
      generer: function () { return genererAppreciation(vue, eleve); }
    }, zonesAppreciation, elListeAppreciations);
  }
}

// --- Les appréciations de l'année (onglet Année) ---

function afficherAppreciationsAnnuelles() {
  vider(elListeAppreciationsAnnuelles);
  zonesAppreciationAnnuelle.clear();

  const auto = modeAutomatique();
  elAideAppreciationAnnuelle.textContent = auto
    ? "Mode automatique : le texte est composé à partir de la moyenne annuelle, de la tendance et des matières de chaque élève. Écris dans une zone pour le remplacer."
    : "Mode manuel : seul ce que tu écris est imprimé sur le bulletin annuel. Une zone vide laisse deux lignes vides.";

  if (classeOuverte.eleves.length === 0) {
    elListeAppreciationsAnnuelles.appendChild(creer("p", "Ajoute des élèves pour écrire leurs appréciations."));
    return;
  }

  for (const eleve of classeOuverte.eleves) {
    const info = bilanAnnuel.get(eleve);
    creerBlocAppreciation(eleve, {
      lire: function () { return eleve.appreciationAnnuelle || ""; },
      ecrire: function (texte) { eleve.appreciationAnnuelle = texte; },
      generer: function () {
        return info ? genererAppreciationAnnuelle(classeOuverte, info.resultat, info.matieres) : "";
      }
    }, zonesAppreciationAnnuelle, elListeAppreciationsAnnuelles);
  }
}

// ---------- 7. LES RÉSULTATS D'UNE PÉRIODE ----------
function afficherResultats() {
  vider(elStats);
  vider(elClassement);

  const resultats = calculerClassement(vue);
  const stats = calculerStatistiques(resultats, vue.seuilAdmission);

  if (stats === null) {
    elStats.appendChild(creer("p", "Aucun résultat pour l'instant. Saisis des notes."));
    return;
  }

  elStats.appendChild(creer("p", "Effectif évalué : " + stats.effectif));
  elStats.appendChild(creer("p", "Admis : " + stats.admis + " | Ajournés : " + stats.ajournes));
  elStats.appendChild(creer("p", "Pourcentage de réussite : " + formater(stats.pourcentageReussite) + " %"));
  elStats.appendChild(creer("p", "Moyenne de la classe : " + formater(stats.moyenneClasse)));
  elStats.appendChild(creer("p", "Meilleur(e) : " + stats.meilleur.nom + " (" + formater(stats.meilleur.moyenne) + ")"));
  elStats.appendChild(creer("p", "Plus faible : " + stats.plusFaible.nom + " (" + formater(stats.plusFaible.moyenne) + ")"));

  // Tableau : Rang | Nom | une colonne par matière | Moyenne | Mention | Décision | Bulletin
  const entete = creer("tr");
  entete.appendChild(creer("th", "Rang"));
  entete.appendChild(creer("th", "Nom"));
  for (const matiere of vue.matieres) {
    entete.appendChild(creer("th", matiere.nom));
  }
  entete.appendChild(creer("th", "Moyenne"));
  entete.appendChild(creer("th", "Mention"));
  entete.appendChild(creer("th", "Décision"));
  entete.appendChild(creer("th", "Bulletin"));
  elClassement.appendChild(entete);

  for (const r of resultats) {
    const ligne = creer("tr");
    ligne.appendChild(creer("td", r.rang === null ? "-" : String(r.rang)));
    ligne.appendChild(creer("td", r.nom));
    for (const matiere of vue.matieres) {
      const m = r.moyennesMatieres[matiere.nom];
      ligne.appendChild(creer("td", m === null ? "-" : formater(m)));
    }
    ligne.appendChild(creer("td", r.moyenne === null ? "-" : formater(r.moyenne)));
    ligne.appendChild(creer("td", r.mention));
    ligne.appendChild(creer("td", r.decision));

    const celluleBulletin = creer("td");
    if (r.moyenne === null) {
      celluleBulletin.textContent = "-";
    } else {
      celluleBulletin.appendChild(creerBouton("PDF", "btn-petit", function () {
        lancerBulletins(r.eleve);
      }));
    }
    ligne.appendChild(celluleBulletin);

    elClassement.appendChild(ligne);
  }
}

// ---------- 8. LES RÉSULTATS DE L'ANNÉE ----------
function afficherAnnee() {
  vider(elStatsAnnee);
  vider(elTableauAnnee);

  const resultats = calculerAnnuel(classeOuverte);
  const stats = calculerStatistiques(resultats, classeOuverte.seuilAdmission);

  // Les données de chaque élève pour l'année, utiles aux appréciations
  const matieresAnnuelles = calculerMatieresAnnuelles(classeOuverte);
  const parEleve = new Map();
  for (const r of resultats) parEleve.set(r.eleve, r);
  bilanAnnuel = new Map();
  classeOuverte.eleves.forEach(function (eleve, indice) {
    bilanAnnuel.set(eleve, { resultat: parEleve.get(eleve), matieres: matieresAnnuelles[indice] });
  });

  if (stats === null) {
    elStatsAnnee.appendChild(creer("p", "Aucun résultat pour l'instant. Saisis des notes dans une période."));
  } else {
    elStatsAnnee.appendChild(creer("p", "Effectif évalué : " + stats.effectif));
    elStatsAnnee.appendChild(creer("p", "Admis : " + stats.admis + " | Ajournés : " + stats.ajournes));
    elStatsAnnee.appendChild(creer("p", "Pourcentage de réussite : " + formater(stats.pourcentageReussite) + " %"));
    elStatsAnnee.appendChild(creer("p", "Moyenne annuelle de la classe : " + formater(stats.moyenneClasse)));
    elStatsAnnee.appendChild(creer("p", "Meilleur(e) : " + stats.meilleur.nom + " (" + formater(stats.meilleur.moyenne) + ")"));
    elStatsAnnee.appendChild(creer("p", "Plus faible : " + stats.plusFaible.nom + " (" + formater(stats.plusFaible.moyenne) + ")"));

    // Tableau : Rang | Nom | une colonne par période | Moyenne annuelle | Mention | Décision | Remarque | Bulletin
    const entete = creer("tr");
    entete.appendChild(creer("th", "Rang"));
    entete.appendChild(creer("th", "Nom"));
    for (const nom of nomsPeriodes(classeOuverte)) {
      entete.appendChild(creer("th", nom));
    }
    entete.appendChild(creer("th", "Moyenne annuelle"));
    entete.appendChild(creer("th", "Mention"));
    entete.appendChild(creer("th", "Décision"));
    entete.appendChild(creer("th", "Remarque"));
    entete.appendChild(creer("th", "Bulletin"));
    elTableauAnnee.appendChild(entete);

    for (const r of resultats) {
      const ligne = creer("tr");
      ligne.appendChild(creer("td", r.rang === null ? "-" : String(r.rang)));
      ligne.appendChild(creer("td", r.nom));
      for (const p of r.periodes) {
        ligne.appendChild(creer("td", p.moyenne === null ? "-" : formater(p.moyenne)));
      }
      ligne.appendChild(creer("td", r.moyenne === null ? "-" : formater(r.moyenne)));
      ligne.appendChild(creer("td", r.mention));
      ligne.appendChild(creer("td", r.decision));
      ligne.appendChild(creer("td", r.incomplet ? "Incomplet" : ""));

      const celluleBulletin = creer("td");
      if (r.moyenne === null) {
        celluleBulletin.textContent = "-";
      } else {
        celluleBulletin.appendChild(creerBouton("PDF", "btn-petit", function () {
          lancerBulletinsAnnuels(r.eleve);
        }));
      }
      ligne.appendChild(celluleBulletin);

      elTableauAnnee.appendChild(ligne);
    }
  }

  afficherAppreciationsAnnuelles();
}

// ---------- 9. LES EXPORTS ET LES BULLETINS ----------
function lancerExportPdf() {
  if (!vue) return;
  const resultat = exporterPDF(vue);
  afficherMessage(elMessageExport, resultat.message, resultat.ok);
}

function lancerExportExcel() {
  if (!vue) return;
  const resultat = exporterExcel(vue);
  afficherMessage(elMessageExport, resultat.message, resultat.ok);
}

// eleve fourni : le bulletin de cet élève. Sinon : tous les bulletins de la période.
function lancerBulletins(eleve) {
  if (!vue) return;
  const resultat = genererBulletins(vue, eleve || null);
  afficherMessage(elMessageExport, resultat.message, resultat.ok);
}

function lancerRecapAnnuelPdf() {
  const resultat = exporterPDFAnnuel(classeOuverte);
  afficherMessage(elMessageAnnee, resultat.message, resultat.ok);
}

function lancerRecapAnnuelExcel() {
  const resultat = exporterExcelAnnuel(classeOuverte);
  afficherMessage(elMessageAnnee, resultat.message, resultat.ok);
}

// eleve fourni : la vraie fiche de l'élève. Sinon : tous les bulletins annuels.
function lancerBulletinsAnnuels(eleve) {
  const resultat = genererBulletinsAnnuels(classeOuverte, eleve || null);
  afficherMessage(elMessageAnnee, resultat.message, resultat.ok);
}

// ---------- 10. BRANCHER LES BOUTONS ET CHAMPS ----------
elBtnHeroCreer.addEventListener("click", allerAuFormulaire);

elBtnCreerClasse.addEventListener("click", creerClasse);
elNouvelleClasse.addEventListener("keydown", function (evenement) {
  if (evenement.key === "Enter") creerClasse();
});

elBtnExporter.addEventListener("click", exporter);
elBtnImporter.addEventListener("click", function () {
  elInputImport.click();   // ouvre la fenêtre de choix de fichier
});
elInputImport.addEventListener("change", importer);

elBtnRetour.addEventListener("click", afficherAccueil);

elNomClasse.addEventListener("input", function () {
  classeOuverte.nom = elNomClasse.value;
  elTitreClasse.textContent = elNomClasse.value;
  sauvegarder();
});

elEtablissement.addEventListener("input", function () {
  classeOuverte.etablissement = elEtablissement.value;
  sauvegarder();
});

elAnnee.addEventListener("input", function () {
  classeOuverte.anneeScolaire = elAnnee.value;
  sauvegarder();
});

elTypePeriodes.addEventListener("change", changerDecoupage);

elSeuil.addEventListener("input", function () {
  const seuil = parseFloat(elSeuil.value);
  if (!isNaN(seuil) && seuil >= 0 && seuil <= 20) {
    classeOuverte.seuilAdmission = seuil;
    sauvegarder();
    if (vue) {
      afficherResultats();
      // Le seuil change le niveau des textes automatiques
      for (const eleve of vue.eleves) rafraichirAppreciation(eleve);
    } else {
      afficherAnnee();
    }
  }
});

elModeAppreciation.addEventListener("change", function () {
  classeOuverte.modeAppreciation = elModeAppreciation.value === "manuel" ? "manuel" : "auto";
  sauvegarder();
  if (vue) afficherAppreciations();
  else afficherAnnee();
});

elBtnMatiere.addEventListener("click", ajouterMatiere);
elCoefMatiere.addEventListener("keydown", function (evenement) {
  if (evenement.key === "Enter") ajouterMatiere();
});

elBtnEleve.addEventListener("click", ajouterEleve);
elNomEleve.addEventListener("keydown", function (evenement) {
  if (evenement.key === "Enter") ajouterEleve();
});
elBtnTrier.addEventListener("click", trierEleves);

elBtnBulletins.addEventListener("click", function () {
  lancerBulletins(null);
});
elBtnExportPdf.addEventListener("click", lancerExportPdf);
elBtnExportExcel.addEventListener("click", lancerExportExcel);

elBtnBulletinsAnnuels.addEventListener("click", function () {
  lancerBulletinsAnnuels(null);
});
elBtnRecapAnnuelPdf.addEventListener("click", lancerRecapAnnuelPdf);
elBtnRecapAnnuelExcel.addEventListener("click", lancerRecapAnnuelExcel);

// ---------- 11. DÉMARRAGE ----------
charger();
afficherAccueil();