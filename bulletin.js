// Les couleurs du bulletin (rouge, vert, bleu)
const COULEUR_VERT = [22, 101, 52];
const COULEUR_VERT_FONCE = [20, 83, 45];
const COULEUR_VERT_CLAIR = [220, 252, 231];
const COULEUR_VERT_PALE = [240, 253, 244];
const COULEUR_ROUGE = [185, 28, 28];
const COULEUR_ROUGE_CLAIR = [254, 242, 242];
const COULEUR_GRIS = [107, 114, 128];
const COULEUR_NOIR = [0, 0, 0];
const MARGE_BULLETIN = 14;

// 1 -> "1er", 2 -> "2e", 3 -> "3e"
function formaterRang(rang) {
  return rang === 1 ? "1er" : rang + "e";
}

// "1er trimestre" -> "1er trim." (pour les titres de colonnes étroites)
function abregerPeriode(nom) {
  return String(nom).replace("trimestre", "trim.").replace("semestre", "sem.");
}

// Si le contenu qui vient ne tient plus sur la page, on passe à la suivante.
// Retourne la nouvelle position verticale.
function assurerPlace(doc, y, besoin) {
  const hauteur = doc.internal.pageSize.getHeight();
  if (y + besoin > hauteur - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ---------- 1. ÉLÉMENTS COMMUNS À TOUS LES BULLETINS ----------

// En-tête : établissement, titre, ligne d'informations. Retourne la position verticale suivante.
function dessinerEnteteBulletin(doc, classe, titre, morceaux) {
  const largeur = doc.internal.pageSize.getWidth();
  const marge = MARGE_BULLETIN;
  const largeurUtile = largeur - 2 * marge;
  const infos = infosClasse(classe);

  doc.setTextColor(...COULEUR_NOIR);
  let y = 16;

  if (infos.etablissement !== "") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const lignesEtab = doc.splitTextToSize(infos.etablissement, largeurUtile);
    doc.text(lignesEtab, largeur / 2, y, { align: "center" });
    y += 6 * lignesEtab.length + 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(titre, largeur / 2, y, { align: "center" });
  y += 7;

  if (morceaux.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(morceaux.join("   -   "), largeur / 2, y, { align: "center" });
    y += 6;
  }

  doc.setDrawColor(...COULEUR_VERT);
  doc.setLineWidth(0.6);
  doc.line(marge, y, largeur - marge, y);
  return y + 8;
}

// Identité : élève, classe, date, effectif. Retourne la position verticale suivante.
function dessinerIdentiteBulletin(doc, classe, nomEleve, y) {
  const largeur = doc.internal.pageSize.getWidth();
  const marge = MARGE_BULLETIN;
  const largeurUtile = largeur - 2 * marge;

  doc.setTextColor(...COULEUR_NOIR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const lignesNom = doc.splitTextToSize("Élève : " + nomEleve, largeurUtile);
  doc.text(lignesNom, marge, y);
  y += 6 * lignesNom.length;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const texteClasse = doc.splitTextToSize("Classe : " + classe.nom, 120)[0];
  doc.text(texteClasse, marge, y);
  doc.text("Date : " + dateDuJour(), largeur - marge, y, { align: "right" });
  y += 5;
  doc.text("Effectif : " + classe.eleves.length, marge, y);
  return y + 8;
}

// La signature du professeur, seule, en bas à droite
function dessinerSignatureProfesseur(doc, y) {
  const largeur = doc.internal.pageSize.getWidth();
  y = assurerPlace(doc, y, 30);
  const centre = largeur - MARGE_BULLETIN - 32;

  doc.setTextColor(...COULEUR_NOIR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setDrawColor(...COULEUR_NOIR);
  doc.setLineWidth(0.3);
  doc.text("Le professeur", centre, y, { align: "center" });
  doc.line(centre - 30, y + 20, centre + 30, y + 20);
}

// ---------- 2. LES CARTES DU RÉSUMÉ ----------

// Une carte : un petit rectangle arrondi avec une étiquette, une valeur, un sous-texte.
// options : { fond, bordure, couleurEtiquette, couleurValeur, tailleValeur, sousTexte }
function dessinerCarte(doc, x, y, largeur, hauteur, etiquette, valeur, options) {
  const o = options || {};
  doc.setFillColor(...(o.fond || [255, 255, 255]));
  doc.setDrawColor(...(o.bordure || [209, 213, 219]));
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, largeur, hauteur, 2.5, 2.5, "FD");

  const centre = x + largeur / 2;
  const taille = o.tailleValeur || 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...(o.couleurEtiquette || COULEUR_GRIS));
  doc.text(etiquette, centre, y + 5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(taille);
  doc.setTextColor(...(o.couleurValeur || COULEUR_NOIR));
  doc.text(valeur, centre, y + (hauteur > 20 ? 15 : 11.5), { align: "center" });

  if (o.sousTexte) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...(o.couleurEtiquette || COULEUR_GRIS));
    doc.text(o.sousTexte, centre, y + hauteur - 3, { align: "center" });
  }
  doc.setTextColor(...COULEUR_NOIR);
}

// Les options de la carte "Décision" : verte si admis, rouge si ajourné
function optionsCarteDecision(decision) {
  if (String(decision).indexOf("Ajourn") === 0) {
    return { fond: COULEUR_ROUGE_CLAIR, bordure: COULEUR_ROUGE, couleurValeur: COULEUR_ROUGE };
  }
  return { fond: [255, 255, 255], bordure: COULEUR_VERT, couleurValeur: COULEUR_VERT };
}

// Une rangée de cartes de même largeur. cartes : [{ etiquette, valeur, options }]
function dessinerRangeeCartes(doc, y, cartes, hauteur) {
  const largeur = doc.internal.pageSize.getWidth();
  const largeurUtile = largeur - 2 * MARGE_BULLETIN;
  const ecart = 4;
  const largeurCarte = (largeurUtile - ecart * (cartes.length - 1)) / cartes.length;

  cartes.forEach(function (carte, i) {
    dessinerCarte(doc, MARGE_BULLETIN + i * (largeurCarte + ecart), y, largeurCarte, hauteur,
      carte.etiquette, carte.valeur, carte.options);
  });
  return y + hauteur;
}

// Le résumé d'une période : une grande carte (moyenne générale) puis 4 petites.
// Retourne la position verticale suivante.
function dessinerResumePeriode(doc, y, resultat, stats) {
  const largeur = doc.internal.pageSize.getWidth();
  const largeurUtile = largeur - 2 * MARGE_BULLETIN;
  y = assurerPlace(doc, y, 52);

  dessinerCarte(doc, MARGE_BULLETIN, y, largeurUtile, 24, "Moyenne générale", nombreFrancais(resultat.moyenne), {
    fond: COULEUR_VERT_CLAIR,
    bordure: COULEUR_VERT,
    couleurEtiquette: COULEUR_VERT_FONCE,
    couleurValeur: COULEUR_VERT_FONCE,
    tailleValeur: 22,
    sousTexte: "sur 20"
  });
  y += 24 + 4;

  y = dessinerRangeeCartes(doc, y, [
    { etiquette: "Rang", valeur: formaterRang(resultat.rang), options: { sousTexte: "sur " + stats.effectif } },
    { etiquette: "Mention", valeur: resultat.mention === "" ? "-" : resultat.mention },
    { etiquette: "Décision", valeur: resultat.decision, options: optionsCarteDecision(resultat.decision) },
    { etiquette: "Moyenne de la classe", valeur: nombreFrancais(stats.moyenneClasse) }
  ], 18);

  return y + 8;
}

// Le résumé de l'année : une rangée de 5 cartes, puis une ligne sur les matières.
// Retourne la position verticale suivante.
function dessinerResumeAnnuel(doc, y, resultat, stats, matieresEleve) {
  y = assurerPlace(doc, y, 40);

  y = dessinerRangeeCartes(doc, y, [
    {
      etiquette: "Moyenne annuelle",
      valeur: nombreFrancais(resultat.moyenne),
      options: {
        fond: COULEUR_VERT_CLAIR,
        bordure: COULEUR_VERT,
        couleurEtiquette: COULEUR_VERT_FONCE,
        couleurValeur: COULEUR_VERT_FONCE,
        sousTexte: "sur 20"
      }
    },
    { etiquette: "Rang", valeur: formaterRang(resultat.rang), options: { sousTexte: "sur " + stats.effectif } },
    { etiquette: "Mention", valeur: resultat.mention === "" ? "-" : resultat.mention },
    { etiquette: "Décision", valeur: resultat.decision, options: optionsCarteDecision(resultat.decision) },
    { etiquette: "Moyenne de la classe", valeur: nombreFrancais(stats.moyenneClasse) }
  ], 18);
  y += 6;

  doc.setTextColor(...COULEUR_NOIR);
  doc.setFontSize(9);

  // Meilleure matière et matière à renforcer
  const extremes = extremesAnnuels(matieresEleve);
  if (extremes !== null) {
    doc.setFont("helvetica", "bold");
    doc.text("Meilleure matière :", MARGE_BULLETIN, y);
    doc.setFont("helvetica", "normal");
    const texteForte = extremes.forte.nom + " (" + nombreFrancais(extremes.forte.moyenne) + ")";
    doc.text(texteForte, MARGE_BULLETIN + 34, y);

    const xFaible = doc.internal.pageSize.getWidth() / 2 + 4;
    doc.setFont("helvetica", "bold");
    doc.text("À renforcer :", xFaible, y);
    doc.setFont("helvetica", "normal");
    doc.text(extremes.faible.nom + " (" + nombreFrancais(extremes.faible.moyenne) + ")", xFaible + 24, y);
    y += 5;
  }

  // Remarque si l'élève n'a pas de notes dans toutes les périodes
  if (resultat.incomplet) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COULEUR_GRIS);
    doc.text("Moyenne annuelle calculée sur " + resultat.nbPeriodesNotees + " période(s) sur " + resultat.nbPeriodes + ".",
      MARGE_BULLETIN, y);
    doc.setTextColor(...COULEUR_NOIR);
    y += 5;
  }

  return y + 5;
}

// ---------- 3. LE BLOC D'APPRÉCIATION ----------

// Fond vert très clair, barre verte sur le côté, texte en italique entre guillemets.
// Si le texte est vide : deux lignes en pointillés à remplir à la main.
// Retourne la position verticale suivante.
function dessinerBlocAppreciation(doc, y, titre, texte) {
  const largeur = doc.internal.pageSize.getWidth();
  const largeurUtile = largeur - 2 * MARGE_BULLETIN;
  y = assurerPlace(doc, y, 40);

  let lignes = [];
  let hauteurBloc = 26;
  if (texte !== "") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    lignes = doc.splitTextToSize("« " + texte + " »", largeurUtile - 14);
    hauteurBloc = Math.max(22, lignes.length * 5 + 14);
  }

  // Fond et barre latérale
  doc.setFillColor(...COULEUR_VERT_PALE);
  doc.rect(MARGE_BULLETIN, y, largeurUtile, hauteurBloc, "F");
  doc.setFillColor(...COULEUR_VERT);
  doc.rect(MARGE_BULLETIN, y, 1.8, hauteurBloc, "F");

  // Titre
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COULEUR_VERT_FONCE);
  doc.text(titre, MARGE_BULLETIN + 6, y + 6);

  if (texte !== "") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COULEUR_NOIR);
    doc.text(lignes, MARGE_BULLETIN + 6, y + 13);
  } else {
    // Deux lignes en pointillés
    doc.setDrawColor(130, 130, 130);
    doc.setLineWidth(0.3);
    if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1, 1.5], 0);
    doc.line(MARGE_BULLETIN + 6, y + 14, largeur - MARGE_BULLETIN - 6, y + 14);
    doc.line(MARGE_BULLETIN + 6, y + 21, largeur - MARGE_BULLETIN - 6, y + 21);
    if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
  }

  doc.setTextColor(...COULEUR_NOIR);
  return y + hauteurBloc + 8;
}

// ---------- 4. LE BULLETIN D'UNE PÉRIODE ----------

// Dessine UN bulletin sur la page courante.
// classe = la vue de la période. contexte : { stats, resultat, rangsMatieres, nbInt, nbDev }
// Retourne false si AutoTable est introuvable.
function dessinerBulletin(doc, classe, eleve, contexte) {
  const marge = MARGE_BULLETIN;
  const infos = infosClasse(classe);
  const resultat = contexte.resultat;

  // --- 1. En-tête et identité ---
  const morceaux = [];
  if (infos.periode !== "") morceaux.push(infos.periode);
  if (infos.annee !== "") morceaux.push("Année scolaire : " + infos.annee);

  let y = dessinerEnteteBulletin(doc, classe, "BULLETIN DE NOTES", morceaux);
  y = dessinerIdentiteBulletin(doc, classe, eleve.nom, y);

  // --- 2. Le tableau des matières ---
  const entetes = ["Matière", "Coef"];
  for (let i = 1; i <= contexte.nbInt; i++) entetes.push("Int " + i);
  for (let i = 1; i <= contexte.nbDev; i++) entetes.push("Dev " + i);
  entetes.push("Moyenne", "Rang");

  const lignes = [];
  const rangsEleve = contexte.rangsMatieres;
  for (const matiere of classe.matieres) {
    const notes = eleve.notes[matiere.nom] || {};
    const ligne = [matiere.nom, String(matiere.coef).replace(".", ",")];

    // Une case vide ("") veut dire "cette matière n'a pas cette note".
    // Un tiret ("-") veut dire "prévue, mais pas encore saisie".
    for (let i = 0; i < contexte.nbInt; i++) {
      if (i >= matiere.nbInterros) {
        ligne.push("");
      } else {
        const n = notes.interros ? notes.interros[i] : null;
        ligne.push(noteValide(n) ? nombreFrancais(n) : "-");
      }
    }
    for (let i = 0; i < contexte.nbDev; i++) {
      if (i >= matiere.nbDevoirs) {
        ligne.push("");
      } else {
        const n = notes.devoirs ? notes.devoirs[i] : null;
        ligne.push(noteValide(n) ? nombreFrancais(n) : "-");
      }
    }

    const moyenne = moyenneMatiere(eleve, matiere);
    ligne.push(moyenne === null ? "-" : nombreFrancais(moyenne));

    const rang = rangsEleve[matiere.nom];
    ligne.push(rang ? formaterRang(rang.rang) : "-");

    lignes.push(ligne);
  }

  const reussi = dessinerTableau(doc, {
    startY: y,
    head: [entetes],
    body: lignes,
    theme: "grid",
    margin: { left: marge, right: marge, bottom: 20 },
    styles: { fontSize: 9, halign: "center", valign: "middle", cellPadding: 2 },
    headStyles: { fillColor: COULEUR_VERT, textColor: 255, halign: "center" },
    alternateRowStyles: { fillColor: COULEUR_VERT_PALE },
    columnStyles: { 0: { halign: "left" } }
  });
  if (!reussi) return false;

  y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 40) + 8;

  // --- 3. Le résumé en cartes ---
  y = dessinerResumePeriode(doc, y, resultat, contexte.stats);

  // --- 4. L'appréciation ---
  y = dessinerBlocAppreciation(doc, y, "APPRÉCIATION", appreciationPourBulletin(classe, eleve));

  // --- 5. La signature du professeur ---
  dessinerSignatureProfesseur(doc, y);
  return true;
}

// Génère le PDF des bulletins d'une période.
// classe = la VUE de la période.
// - eleveUnique fourni : le bulletin de cet élève seulement
// - sinon : un bulletin par élève qui a au moins une note, dans l'ordre de la liste
// Retourne { ok, message }.
function genererBulletins(classe, eleveUnique) {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return { ok: false, message: MESSAGE_BIBLIOTHEQUE_PDF };
    }
    if (classe.matieres.length === 0 || classe.eleves.length === 0) {
      return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };
    }

    const resultats = calculerClassement(classe);
    const stats = calculerStatistiques(resultats, classe.seuilAdmission);
    if (stats === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    const rangsMatieres = calculerRangsParMatiere(classe);
    const parEleve = new Map();
    for (const r of resultats) parEleve.set(r.eleve, r);

    // Qui imprimer ?
    const liste = eleveUnique ? [eleveUnique] : classe.eleves.slice();
    const aImprimer = liste.filter(function (e) {
      const r = parEleve.get(e);
      return r && r.moyenne !== null;
    });
    if (aImprimer.length === 0) {
      return {
        ok: false,
        message: eleveUnique ? "Cet élève n'a aucune note dans cette période : pas de bulletin." : MESSAGE_RIEN_A_EXPORTER
      };
    }
    const ignores = liste.length - aImprimer.length;

    // Nombre de colonnes d'interros et de devoirs : le maximum de la classe
    let nbInt = 0;
    let nbDev = 0;
    for (const m of classe.matieres) {
      if (m.nbInterros > nbInt) nbInt = m.nbInterros;
      if (m.nbDevoirs > nbDev) nbDev = m.nbDevoirs;
    }

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let i = 0; i < aImprimer.length; i++) {
      if (i > 0) doc.addPage();
      const eleve = aImprimer[i];
      const reussi = dessinerBulletin(doc, classe, eleve, {
        stats: stats,
        resultat: parEleve.get(eleve),
        rangsMatieres: rangsMatieres[classe.eleves.indexOf(eleve)],
        nbInt: nbInt,
        nbDev: nbDev
      });
      if (!reussi) return { ok: false, message: MESSAGE_AUTOTABLE };
    }

    const base = nomSurPourFichier(classe.nom) + suffixePeriode(classe);
    if (eleveUnique) {
      doc.save("bulletin-" + base + "-" + nomSurPourFichier(eleveUnique.nom) + "-" + dateISO() + ".pdf");
      return { ok: true, message: "Bulletin PDF téléchargé." };
    }

    doc.save("bulletins-" + base + "-" + dateISO() + ".pdf");
    let message = aImprimer.length + (aImprimer.length > 1 ? " bulletins téléchargés" : " bulletin téléchargé");
    if (ignores > 0) {
      message += ". " + ignores + (ignores > 1 ? " élèves sans note ignorés" : " élève sans note ignoré");
    }
    return { ok: true, message: message + "." };
  } catch (erreur) {
    console.error("Bulletins PDF :", erreur);
    return { ok: false, message: "La création des bulletins a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}

// ---------- 5. LE BULLETIN ANNUEL ----------

// Dessine UN bulletin annuel sur la page courante.
// classe = la vraie classe. resultat = la ligne de calculerAnnuel pour cet élève.
// contexte : { stats, noms, matieresEleve, moyennesClasse, appreciation }
// Retourne false si AutoTable est introuvable.
function dessinerBulletinAnnuel(doc, classe, resultat, contexte) {
  const marge = MARGE_BULLETIN;
  const infos = infosClasse(classe);
  const noms = contexte.noms;

  const morceaux = [];
  if (infos.annee !== "") morceaux.push("Année scolaire : " + infos.annee);

  let y = dessinerEnteteBulletin(doc, classe, "BULLETIN ANNUEL", morceaux);
  y = dessinerIdentiteBulletin(doc, classe, resultat.nom, y);

  // --- 1. Le détail par matière sur l'année ---
  const entetes = ["Matière", "Coef"];
  for (const nom of noms) entetes.push(abregerPeriode(nom));
  entetes.push("Moyenne annuelle", "Rang");

  const lignes = [];
  for (const matiere of classe.matieres) {
    const m = contexte.matieresEleve[matiere.nom];
    const ligne = [matiere.nom, String(matiere.coef).replace(".", ",")];
    for (const moyennePeriode of m.periodes) {
      ligne.push(moyennePeriode === null ? "-" : nombreFrancais(moyennePeriode));
    }
    ligne.push(m.moyenne === null ? "-" : nombreFrancais(m.moyenne));
    ligne.push(m.rang === null ? "-" : formaterRang(m.rang));
    lignes.push(ligne);
  }

  const reussi = dessinerTableau(doc, {
    startY: y,
    head: [entetes],
    body: lignes,
    theme: "grid",
    margin: { left: marge, right: marge, bottom: 20 },
    styles: { fontSize: 9, halign: "center", valign: "middle", cellPadding: 1.8 },
    headStyles: { fillColor: COULEUR_VERT, textColor: 255, halign: "center" },
    alternateRowStyles: { fillColor: COULEUR_VERT_PALE },
    columnStyles: { 0: { halign: "left" } }
  });
  if (!reussi) return false;

  y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 40) + 8;

  // --- 2. L'évolution dans l'année ---
  y = assurerPlace(doc, y, 14 + 7 * noms.length);
  const lignesEvolution = [];
  for (let p = 0; p < resultat.periodes.length; p++) {
    const periode = resultat.periodes[p];
    const moyenneClasse = contexte.moyennesClasse[p];
    lignesEvolution.push([
      noms[p],
      periode.moyenne === null ? "-" : nombreFrancais(periode.moyenne),
      periode.rang === null ? "-" : formaterRang(periode.rang) + " sur " + periode.sur,
      moyenneClasse === null ? "-" : nombreFrancais(moyenneClasse)
    ]);
  }

  const reussiEvolution = dessinerTableau(doc, {
    startY: y,
    head: [["Évolution", "Moyenne générale", "Rang", "Moyenne de la classe"]],
    body: lignesEvolution,
    theme: "grid",
    margin: { left: marge, right: marge, bottom: 20 },
    styles: { fontSize: 9, halign: "center", valign: "middle", cellPadding: 1.8 },
    headStyles: { fillColor: COULEUR_VERT, textColor: 255, halign: "center" },
    alternateRowStyles: { fillColor: COULEUR_VERT_PALE },
    columnStyles: { 0: { halign: "left" } }
  });
  if (!reussiEvolution) return false;

  y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 30) + 6;

  // La tendance, en texte
  const tendance = tendanceEleve(resultat);
  if (tendance !== null) {
    const libelle = tendance.sens === "progression" ? "en progression"
      : (tendance.sens === "baisse" ? "en baisse" : "stable");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COULEUR_GRIS);
    doc.text("Tendance : " + libelle + " (de " + nombreFrancais(tendance.debut) + " à " + nombreFrancais(tendance.fin) + ")",
      marge, y);
    doc.setTextColor(...COULEUR_NOIR);
    y += 6;
  }
  y += 2;

  // --- 3. Le résumé de l'année en cartes ---
  y = dessinerResumeAnnuel(doc, y, resultat, contexte.stats, contexte.matieresEleve);

  // --- 4. L'appréciation annuelle ---
  y = dessinerBlocAppreciation(doc, y, "APPRÉCIATION ANNUELLE", contexte.appreciation);

  // --- 5. La signature du professeur ---
  dessinerSignatureProfesseur(doc, y);
  return true;
}

// Génère le PDF des bulletins annuels. classe = la VRAIE classe.
// - eleveUnique fourni : la fiche de cet élève (classe.eleves) seulement
// - sinon : un bulletin par élève qui a au moins une note dans l'année
// Retourne { ok, message }.
function genererBulletinsAnnuels(classe, eleveUnique) {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return { ok: false, message: MESSAGE_BIBLIOTHEQUE_PDF };
    }
    if (classe.matieres.length === 0 || classe.eleves.length === 0) {
      return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };
    }

    const resultats = calculerAnnuel(classe);
    const stats = calculerStatistiques(resultats, classe.seuilAdmission);
    if (stats === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    const matieresAnnuelles = calculerMatieresAnnuelles(classe);
    const moyennesClasse = moyennesClasseParPeriode(classe);
    const parEleve = new Map();
    for (const r of resultats) parEleve.set(r.eleve, r);

    // Dans l'ordre de la liste des élèves
    const liste = (eleveUnique ? [eleveUnique] : classe.eleves.slice());
    const aImprimer = liste.filter(function (e) {
      const r = parEleve.get(e);
      return r && r.moyenne !== null;
    });
    if (aImprimer.length === 0) {
      return {
        ok: false,
        message: eleveUnique ? "Cet élève n'a aucune note dans l'année : pas de bulletin." : MESSAGE_RIEN_A_EXPORTER
      };
    }
    const ignores = liste.length - aImprimer.length;

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const noms = nomsPeriodes(classe);

    for (let i = 0; i < aImprimer.length; i++) {
      if (i > 0) doc.addPage();
      const eleve = aImprimer[i];
      const resultat = parEleve.get(eleve);
      const matieresEleve = matieresAnnuelles[classe.eleves.indexOf(eleve)];

      const reussi = dessinerBulletinAnnuel(doc, classe, resultat, {
        stats: stats,
        noms: noms,
        matieresEleve: matieresEleve,
        moyennesClasse: moyennesClasse,
        appreciation: appreciationAnnuellePourBulletin(classe, eleve, resultat, matieresEleve)
      });
      if (!reussi) return { ok: false, message: MESSAGE_AUTOTABLE };
    }

    const base = nomSurPourFichier(classe.nom);
    if (eleveUnique) {
      doc.save("bulletin-annuel-" + base + "-" + nomSurPourFichier(eleveUnique.nom) + "-" + dateISO() + ".pdf");
      return { ok: true, message: "Bulletin annuel PDF téléchargé." };
    }

    doc.save("bulletins-annuels-" + base + "-" + dateISO() + ".pdf");
    let message = aImprimer.length + (aImprimer.length > 1 ? " bulletins annuels téléchargés" : " bulletin annuel téléchargé");
    if (ignores > 0) {
      message += ". " + ignores + (ignores > 1 ? " élèves sans note ignorés" : " élève sans note ignoré");
    }
    return { ok: true, message: message + "." };
  } catch (erreur) {
    console.error("Bulletins annuels PDF :", erreur);
    return { ok: false, message: "La création des bulletins a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}