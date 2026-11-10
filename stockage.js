const CLE_STOCKAGE = "moyennes-app-donnees";
const NOM_APPLICATION = "moyennes-app";

// ---------- 1. LE CASIER DU NAVIGATEUR ----------

// Transforme "donnees" en texte (JSON) et le range dans le casier
function sauvegarder() {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees));
  } catch (erreur) {
    console.error("Sauvegarde impossible :", erreur);
  }
}

// Relit le casier, retransforme le texte en objets et remplace "donnees".
// Les classes créées avec une ancienne version sont mises à jour :
// leurs notes passent dans la 1re période.
function charger() {
  try {
    const texte = localStorage.getItem(CLE_STOCKAGE);
    if (texte) {
      const lu = JSON.parse(texte);
      if (lu && Array.isArray(lu.classes)) {
        for (const classe of lu.classes) {
          migrerClasse(classe);
        }
        donnees = lu;
      }
    }
  } catch (erreur) {
    console.error("Chargement impossible :", erreur);
  }
}

// ---------- 2. EXPORTER : créer et télécharger le fichier ----------
function exporterSauvegarde() {
  const contenu = {
    application: NOM_APPLICATION,
    version: 2,
    exporteLe: new Date().toISOString(),
    donnees: donnees
  };

  const texte = JSON.stringify(contenu, null, 2);
  const blob = new Blob([texte], { type: "application/json" });
  const adresse = URL.createObjectURL(blob);

  const lien = document.createElement("a");
  lien.href = adresse;
  lien.download = "sauvegarde-moyennes-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);

  setTimeout(function () {
    URL.revokeObjectURL(adresse);
  }, 1000);
}

// ---------- 3. IMPORTER : outils de vérification ----------

function estTexte(valeur) {
  return typeof valeur === "string" && valeur.trim() !== "";
}

// Un texte court facultatif (établissement, année...) : "" si absent
function texteCourt(valeur) {
  return typeof valeur === "string" ? valeur.trim().slice(0, 80) : "";
}

function texteAppreciation(valeur) {
  return typeof valeur === "string" ? valeur.slice(0, LONGUEUR_MAX_APPRECIATION) : "";
}

// Garde au plus "max" notes, et remplace tout ce qui n'est pas une note valide par null
function nettoyerListeNotes(liste, max) {
  const resultat = [];
  if (Array.isArray(liste)) {
    for (let i = 0; i < max && i < liste.length; i++) {
      resultat.push(noteValide(liste[i]) ? liste[i] : null);
    }
  }
  return resultat;
}

// Reconstruit les notes d'une période à partir du fichier.
// matieresSource : les matières telles que dans le fichier (pour retrouver les clés)
// matieres : les matières nettoyées (même ordre)
function nettoyerNotes(brutes, matieresSource, matieres) {
  const notes = {};
  if (!brutes || typeof brutes !== "object") return notes;

  for (let j = 0; j < matieresSource.length; j++) {
    const brut = brutes[matieresSource[j].nom];
    if (brut && typeof brut === "object") {
      const matiere = matieres[j];
      notes[matiere.nom] = {
        interros: nettoyerListeNotes(brut.interros, matiere.nbInterros),
        devoirs: nettoyerListeNotes(brut.devoirs, matiere.nbDevoirs)
      };
    }
  }
  return notes;
}

// Reconstruit une classe PROPRE à partir d'une classe du fichier.
// Accepte l'ancien format (une seule série de notes par élève : elle va dans la
// 1re période) et le nouveau (une série par période).
// Retourne null si la classe est invalide (le fichier sera alors refusé en entier).
function nettoyerClasse(source) {
  if (!source || typeof source !== "object") return null;
  if (!estTexte(source.nom)) return null;
  if (!Array.isArray(source.matieres) || !Array.isArray(source.eleves)) return null;

  const classe = {
    id: 0,
    nom: source.nom.trim(),
    seuilAdmission: 10,
    etablissement: texteCourt(source.etablissement),
    anneeScolaire: texteCourt(source.anneeScolaire),
    modeAppreciation: source.modeAppreciation === "manuel" ? "manuel" : "auto",
    typePeriodes: source.typePeriodes === "semestres" ? "semestres" : "trimestres",
    matieres: [],
    eleves: []
  };

  if (typeof source.seuilAdmission === "number" && source.seuilAdmission >= 0 && source.seuilAdmission <= 20) {
    classe.seuilAdmission = source.seuilAdmission;
  }

  // Les matières
  const dejaVues = {};
  for (const m of source.matieres) {
    if (!m || !estTexte(m.nom)) return null;
    if (typeof m.coef !== "number" || !(m.coef > 0)) return null;
    if (!Number.isInteger(m.nbInterros) || m.nbInterros < 0 || m.nbInterros > 3) return null;
    if (!Number.isInteger(m.nbDevoirs) || m.nbDevoirs < 0 || m.nbDevoirs > 2) return null;

    const cle = m.nom.trim().toLowerCase();
    if (dejaVues[cle]) return null;
    dejaVues[cle] = true;

    classe.matieres.push({
      nom: m.nom.trim(),
      coef: m.coef,
      nbInterros: m.nbInterros,
      nbDevoirs: m.nbDevoirs
    });
  }

  // Les élèves, avec leurs périodes
  const n = nombrePeriodes(classe);
  for (const e of source.eleves) {
    if (!e || !estTexte(e.nom)) return null;

    const periodes = [];
    if (Array.isArray(e.periodes)) {
      // Nouveau format : une série par période
      for (let p = 0; p < n; p++) {
        const brute = e.periodes[p];
        if (brute && typeof brute === "object") {
          periodes.push({
            notes: nettoyerNotes(brute.notes, source.matieres, classe.matieres),
            appreciation: texteAppreciation(brute.appreciation)
          });
        } else {
          periodes.push({ notes: {}, appreciation: "" });
        }
      }
    } else {
      // Ancien format : une seule série, rangée dans la 1re période
      periodes.push({
        notes: nettoyerNotes(e.notes, source.matieres, classe.matieres),
        appreciation: texteAppreciation(e.appreciation)
      });
      while (periodes.length < n) {
        periodes.push({ notes: {}, appreciation: "" });
      }
    }

    classe.eleves.push({
      nom: e.nom.trim(),
      appreciationAnnuelle: texteAppreciation(e.appreciationAnnuelle),
      periodes: periodes
    });
  }

  return classe;
}

// ---------- 4. IMPORTER : doublons de noms et identifiants ----------

// Un nom est "déjà pris" s'il existe déjà (sans tenir compte des majuscules)
function nomDejaPris(nom) {
  const cible = nom.trim().toLowerCase();
  return donnees.classes.some(function (c) {
    return String(c.nom).trim().toLowerCase() === cible;
  });
}

// "3ème A" -> "3ème A (2)" -> "3ème A (3)" ... jusqu'à trouver un nom libre
function nomUnique(nom) {
  if (!nomDejaPris(nom)) return nom;
  let numero = 2;
  while (nomDejaPris(nom + " (" + numero + ")")) {
    numero++;
  }
  return nom + " (" + numero + ")";
}

// Chaque classe ajoutée reçoit un identifiant tout neuf
function idUnique() {
  let id = Date.now();
  while (donnees.classes.some(function (c) { return c.id === id; })) {
    id++;
  }
  return id;
}

// ---------- 5. IMPORTER : la fonction principale ----------
// Reçoit le TEXTE du fichier. AJOUTE les classes aux classes existantes.
// Tout est vérifié AVANT d'ajouter quoi que ce soit : si le fichier est
// invalide, les données de l'enseignant ne sont pas touchées.
// Retourne { ok, message }.
function importerSauvegarde(texte) {
  let lu;
  try {
    lu = JSON.parse(texte);
  } catch (erreur) {
    return { ok: false, message: "Ce fichier n'est pas une sauvegarde valide. Rien n'a été ajouté." };
  }

  const source = (lu && lu.donnees) ? lu.donnees : lu;
  if (!source || !Array.isArray(source.classes)) {
    return { ok: false, message: "Ce fichier ne contient pas de classes. Rien n'a été ajouté." };
  }

  // Étape 1 : tout vérifier et nettoyer
  const propres = [];
  for (const brute of source.classes) {
    const propre = nettoyerClasse(brute);
    if (propre === null) {
      return { ok: false, message: "Le fichier est abîmé ou incomplet. Aucune classe n'a été ajoutée." };
    }
    propres.push(propre);
  }

  if (propres.length === 0) {
    return { ok: true, message: "Le fichier ne contient aucune classe." };
  }

  // Étape 2 : ajouter, en renommant les classes dont le nom existe déjà
  let renommees = 0;
  for (const classe of propres) {
    const nomFinal = nomUnique(classe.nom);
    if (nomFinal !== classe.nom) renommees++;
    classe.nom = nomFinal;
    classe.id = idUnique();
    donnees.classes.push(classe);
  }

  sauvegarder();

  let message = propres.length + (propres.length > 1 ? " classes ajoutées" : " classe ajoutée");
  if (renommees > 0) {
    message += ", dont " + renommees + (renommees > 1 ? " renommées" : " renommée") + " car le nom existait déjà";
  }
  return { ok: true, message: message + "." };
}