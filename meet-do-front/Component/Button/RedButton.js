function BoutonRouge(texte) {
  if (texte === "Annuler ma réservation") {
    return `
        <button onclick="openPopUp('cancel-popup')" class="buttonRo" type="submit">
            ${texte}
        </button>
    `;
  } else if (texte === "Supprimer mon activité") {
    return `
        <button onclick="openPopUp('delete-popup')" class="buttonRo" type="submit">
            ${texte}
        </button>
    `;
  } else {
    return `
        <button type="button" class="buttonRo" >${texte}</button>
`;
  }
}
