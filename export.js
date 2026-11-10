// ---------- 1. PETITS OUTILS (partagés avec bulletin.js) ----------

function deuxChiffres(nombre) {
  return (nombre < 10 ? "0" : "") + nombre;
}

// 01/11/2026
function dateDuJour() {
  const d = new Date();
  return deuxChiffres(d.getDate()) + "/" + deuxChiffres(d.getMonth() + 1) + "/" + d.getFullYear();
}

// 2026-11-01 (pour les noms de fichiers)
function dateISO() {
  return new Date().toISOString().slice(0, 10);
}

// 15.36 -> "15,36"
function nombreFrancais(nombre) {
  return nombre.toFixed(2).replace(".", ",");
}

// "3ème A" -> "3eme-a" (nom de fichier sûr, sans accents ni espaces)
function nomSurPourFichier(nom) {
  const propre = String(nom || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return propre === "" ? "classe" : propre;
}

// "-1er-trimestre" si la vue est celle d'une période, sinon ""
function suffixePeriode(classe) {
  return classe.periode ? "-" + nomSurPourFichier(classe.periode) : "";
}

// Les informations facultatives de la classe, sans espaces inutiles.
// "periode" n'existe que sur la vue d'une période.
function infosClasse(classe) {
  return {
    etablissement: String(classe.etablissement || "").trim(),
    periode: String(classe.periode || "").trim(),
    annee: String(classe.anneeScolaire || "").trim()
  };
}

// Déclenche le téléchargement d'un fichier
function telechargerFichier(blob, nomFichier) {
  const adresse = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = adresse;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(function () {
    URL.revokeObjectURL(adresse);
  }, 1000);
}

// Les bibliothèques se présentent différemment selon leur version :
// on essaie les façons connues d'appeler AutoTable.
function dessinerTableau(doc, options) {
  const bibliotheque = window["jspdf-autotable"] || window.jspdfAutoTable;
  if (bibliotheque && typeof bibliotheque.autoTable === "function") {
    bibliotheque.autoTable(doc, options);
    return true;
  }
  if (bibliotheque && typeof bibliotheque.default === "function") {
    bibliotheque.default(doc, options);
    return true;
  }
  if (typeof doc.autoTable === "function") {
    doc.autoTable(options);
    return true;
  }
  return false;
}

const MESSAGE_RIEN_A_EXPORTER = "Rien à exporter : ajoute des matières, des élèves et saisis des notes.";
const MESSAGE_BIBLIOTHEQUE_PDF = "La bibliothèque PDF est introuvable. Vérifie que le dossier lib contient jspdf.umd.min.js et jspdf.plugin.autotable.js.";
const MESSAGE_AUTOTABLE = "Le module de tableaux (AutoTable) est introuvable. Vérifie le fichier lib/jspdf.plugin.autotable.js.";

// ---------- 2. CONSTRUIRE LES TABLEAUX RÉCAPITULATIFS ----------

// Les statistiques, avec la moyenne générale de la classe en premier
function lignesStatistiques(statistiques, libelleMoyenne) {
  return [
    [libelleMoyenne, nombreFrancais(statistiques.moyenneClasse)],
    ["Effectif évalué", String(statistiques.effectif)],
    ["Admis", String(statistiques.admis)],
    ["Ajournés", String(statistiques.ajournes)],
    ["Pourcentage de réussite", nombreFrancais(statistiques.pourcentageReussite) + " %"],
    ["Meilleur(e)", statistiques.meilleur.nom + " (" + nombreFrancais(statistiques.meilleur.moyenne) + ")"],
    ["Plus faible", statistiques.plusFaible.nom + " (" + nombreFrancais(statistiques.plusFaible.moyenne) + ")"]
  ];
}

// Récapitulatif d'UNE période (classe = la vue de la période).
// Retourne null s'il n'y a rien à exporter (pas de notes).
// Sinon : { entetes, lignes, stats } (tout en texte, prêt à écrire).
// Les élèves sont classés du meilleur au plus faible ;
// ceux sans note sont à la fin (calculerClassement s'en occupe).
function construireRecapitulatif(classe) {
  if (classe.eleves.length === 0 || classe.matieres.length === 0) return null;

  const resultats = calculerClassement(classe);
  const statistiques = calculerStatistiques(resultats, classe.seuilAdmission);
  if (statistiques === null) return null;

  const entetes = ["Rang", "Nom"];
  for (const matiere of classe.matieres) {
    entetes.push(matiere.nom);
  }
  entetes.push("Moyenne", "Mention", "Décision");

  const lignes = [];
  for (const r of resultats) {
    const ligne = [r.rang === null ? "-" : String(r.rang), r.nom];
    for (const matiere of classe.matieres) {
      const m = r.moyennesMatieres[matiere.nom];
      ligne.push(m === null ? "-" : nombreFrancais(m));
    }
    ligne.push(r.moyenne === null ? "-" : nombreFrancais(r.moyenne));
    ligne.push(r.mention);
    ligne.push(r.decision);
    lignes.push(ligne);
  }

  return {
    entetes: entetes,
    lignes: lignes,
    stats: lignesStatistiques(statistiques, "Moyenne générale de la classe")
  };
}

// Récapitulatif de l'ANNÉE (classe = la vraie classe).
// Colonnes : Rang, Nom, une colonne par période, Moyenne annuelle, Mention,
// Décision, Remarque ("Incomplet" si l'élève n'a pas de notes dans toutes les périodes).
function construireRecapitulatifAnnuel(classe) {
  if (classe.eleves.length === 0 || classe.matieres.length === 0) return null;

  const resultats = calculerAnnuel(classe);
  const statistiques = calculerStatistiques(resultats, classe.seuilAdmission);
  if (statistiques === null) return null;

  const entetes = ["Rang", "Nom"].concat(nomsPeriodes(classe));
  entetes.push("Moyenne annuelle", "Mention", "Décision", "Remarque");

  const lignes = [];
  for (const r of resultats) {
    const ligne = [r.rang === null ? "-" : String(r.rang), r.nom];
    for (const p of r.periodes) {
      ligne.push(p.moyenne === null ? "-" : nombreFrancais(p.moyenne));
    }
    ligne.push(r.moyenne === null ? "-" : nombreFrancais(r.moyenne));
    ligne.push(r.mention);
    ligne.push(r.decision);
    ligne.push(r.incomplet ? "Incomplet" : "");
    lignes.push(ligne);
  }

  return {
    entetes: entetes,
    lignes: lignes,
    stats: lignesStatistiques(statistiques, "Moyenne annuelle de la classe")
  };
}

// ---------- 3. ÉCRIRE UN FICHIER EXCEL (CSV) ----------

// Protège un texte saisi par l'utilisateur : Excel pourrait prendre
// un texte qui commence par = + - @ pour une formule.
function securiserTexte(texte) {
  const t = String(texte);
  if (t !== "-" && /^[=+\-@]/.test(t)) return "'" + t;
  return t;
}

// Met une valeur entre guillemets si elle contient ; " ou un retour à la ligne
function echapperCSV(valeur) {
  const texte = String(valeur);
  if (/[;"\n\r]/.test(texte)) {
    return '"' + texte.replace(/"/g, '""') + '"';
  }
  return texte;
}

function ligneCSV(cellules) {
  return cellules.map(echapperCSV).join(";");
}

// options : { titre, classe, periode (texte ou ""), recap, base (début du nom de fichier),
//             indicesEntetesUtilisateur (colonnes d'en-tête saisies par l'utilisateur) }
function ecrireExcel(options) {
  const classe = options.classe;
  const recap = options.recap;
  const infos = infosClasse(classe);

  const lignes = [];
  lignes.push(ligneCSV([options.titre]));
  if (infos.etablissement !== "") lignes.push(ligneCSV(["Établissement", securiserTexte(infos.etablissement)]));
  lignes.push(ligneCSV(["Classe", securiserTexte(classe.nom)]));
  if (options.periode !== "") lignes.push(ligneCSV(["Période", options.periode]));
  if (infos.annee !== "") lignes.push(ligneCSV(["Année scolaire", securiserTexte(infos.annee)]));
  lignes.push(ligneCSV(["Date", dateDuJour()]));
  lignes.push("");

  const entetes = recap.entetes.map(function (titre, i) {
    return options.indicesEntetesUtilisateur.indexOf(i) >= 0 ? securiserTexte(titre) : titre;
  });
  lignes.push(ligneCSV(entetes));

  // Le nom de l'élève est la colonne 1
  for (const ligne of recap.lignes) {
    const copie = ligne.slice();
    copie[1] = securiserTexte(copie[1]);
    lignes.push(ligneCSV(copie));
  }

  lignes.push("");
  for (const stat of recap.stats) {
    lignes.push(ligneCSV(stat));
  }

  // \uFEFF : marque UTF-8, pour qu'Excel affiche bien les accents
  const texte = "\uFEFF" + lignes.join("\r\n");
  const blob = new Blob([texte], { type: "text/csv;charset=utf-8" });
  telechargerFichier(blob, options.base + "-" + dateISO() + ".csv");
}

// Récapitulatif d'une période (classe = vue). Retourne { ok, message }.
function exporterExcel(classe) {
  try {
    const recap = construireRecapitulatif(classe);
    if (recap === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    // Les colonnes 2 à (avant-dernières 3) sont les noms de matières
    const indices = [];
    for (let i = 2; i < recap.entetes.length - 3; i++) indices.push(i);

    ecrireExcel({
      titre: "Tableau récapitulatif",
      classe: classe,
      periode: String(classe.periode || ""),
      recap: recap,
      base: "recapitulatif-" + nomSurPourFichier(classe.nom) + suffixePeriode(classe),
      indicesEntetesUtilisateur: indices
    });
    return { ok: true, message: "Fichier Excel (CSV) téléchargé." };
  } catch (erreur) {
    console.error("Export Excel :", erreur);
    return { ok: false, message: "L'export Excel a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}

// Récapitulatif de l'année (classe = la vraie classe). Retourne { ok, message }.
function exporterExcelAnnuel(classe) {
  try {
    const recap = construireRecapitulatifAnnuel(classe);
    if (recap === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    ecrireExcel({
      titre: "Tableau récapitulatif annuel",
      classe: classe,
      periode: "",
      recap: recap,
      base: "recapitulatif-annuel-" + nomSurPourFichier(classe.nom),
      indicesEntetesUtilisateur: []
    });
    return { ok: true, message: "Fichier Excel (CSV) téléchargé." };
  } catch (erreur) {
    console.error("Export Excel annuel :", erreur);
    return { ok: false, message: "L'export Excel a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}

// ---------- 4. ÉCRIRE UN FICHIER PDF (paysage) ----------

// options : { titre, classe, morceaux (lignes d'info sous la classe), recap,
//             colonneDecision (indice de la colonne "Décision"), nomFichier }
// Retourne { ok, message }.
function ecrirePDF(options) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    return { ok: false, message: MESSAGE_BIBLIOTHEQUE_PDF };
  }

  const classe = options.classe;
  const recap = options.recap;
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const largeur = doc.internal.pageSize.getWidth();
  const hauteur = doc.internal.pageSize.getHeight();
  const marge = 14;
  const infos = infosClasse(classe);

  // --- En-tête ---
  let y = 14;

  if (infos.etablissement !== "") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(infos.etablissement, marge, y);
    y += 7;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(options.titre, marge, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Classe : " + classe.nom, marge, y);
  doc.text("Date : " + dateDuJour(), largeur - marge, y, { align: "right" });
  y += 6;

  if (options.morceaux.length > 0) {
    doc.text(options.morceaux.join("   -   "), marge, y);
    y += 6;
  }

  // --- Le tableau ---
  const nbColonnes = recap.entetes.length;
  const taillePolice = nbColonnes > 12 ? 7 : (nbColonnes > 9 ? 8 : 9);

  const reussi = dessinerTableau(doc, {
    startY: y + 2,
    head: [recap.entetes],
    body: recap.lignes,
    theme: "grid",
    margin: { left: marge, right: marge, bottom: 16 },
    styles: { fontSize: taillePolice, halign: "center", valign: "middle", cellPadding: 2 },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, halign: "center" },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: { 0: { cellWidth: 14 }, 1: { halign: "left" } },
    didParseCell: function (donnees) {
      // Les ajournés en rouge
      if (donnees.section === "body" && donnees.column.index === options.colonneDecision
          && String(donnees.cell.raw).indexOf("Ajourn") === 0) {
        donnees.cell.styles.textColor = [185, 28, 28];
      }
    }
  });

  if (!reussi) {
    return { ok: false, message: MESSAGE_AUTOTABLE };
  }

  // --- Les statistiques, sous le tableau ---
  let yStats = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 40) + 10;
  if (yStats > hauteur - 50) {
    doc.addPage();
    yStats = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Statistiques de la classe", marge, yStats);
  yStats += 7;

  doc.setFontSize(10);
  for (const stat of recap.stats) {
    doc.setFont("helvetica", "bold");
    doc.text(stat[0] + " :", marge, yStats);
    doc.setFont("helvetica", "normal");
    doc.text(stat[1], marge + 62, yStats);
    yStats += 6;
  }

  // --- Numéro de page, en bas de chaque page ---
  const nbPages = doc.internal.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i);
    doc.text("Page " + i + " / " + nbPages, largeur / 2, hauteur - 8, { align: "center" });
  }

  doc.save(options.nomFichier + "-" + dateISO() + ".pdf");
  return { ok: true, message: "Fichier PDF téléchargé." };
}

// Récapitulatif d'une période (classe = vue). Retourne { ok, message }.
function exporterPDF(classe) {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return { ok: false, message: MESSAGE_BIBLIOTHEQUE_PDF };
    }
    const recap = construireRecapitulatif(classe);
    if (recap === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    const infos = infosClasse(classe);
    const morceaux = [];
    if (infos.periode !== "") morceaux.push("Période : " + infos.periode);
    if (infos.annee !== "") morceaux.push("Année scolaire : " + infos.annee);

    return ecrirePDF({
      titre: "Tableau récapitulatif",
      classe: classe,
      morceaux: morceaux,
      recap: recap,
      colonneDecision: recap.entetes.length - 1,
      nomFichier: "recapitulatif-" + nomSurPourFichier(classe.nom) + suffixePeriode(classe)
    });
  } catch (erreur) {
    console.error("Export PDF :", erreur);
    return { ok: false, message: "L'export PDF a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}

// Récapitulatif de l'année (classe = la vraie classe). Retourne { ok, message }.
function exporterPDFAnnuel(classe) {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return { ok: false, message: MESSAGE_BIBLIOTHEQUE_PDF };
    }
    const recap = construireRecapitulatifAnnuel(classe);
    if (recap === null) return { ok: false, message: MESSAGE_RIEN_A_EXPORTER };

    const infos = infosClasse(classe);
    const morceaux = [];
    if (infos.annee !== "") morceaux.push("Année scolaire : " + infos.annee);

    return ecrirePDF({
      titre: "Tableau récapitulatif annuel",
      classe: classe,
      morceaux: morceaux,
      recap: recap,
      colonneDecision: recap.entetes.length - 2,   // "Remarque" est la dernière colonne
      nomFichier: "recapitulatif-annuel-" + nomSurPourFichier(classe.nom)
    });
  } catch (erreur) {
    console.error("Export PDF annuel :", erreur);
    return { ok: false, message: "L'export PDF a échoué. Ouvre la console (F12) pour voir le détail." };
  }
}