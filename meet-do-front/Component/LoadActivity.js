function LoadActivite(activite) {
  const boutonParticiper = BoutonBleu("Participer");
  const boutonLaisserAvis = BoutonBleu("Laisser un avis");
  const boutonContact = BoutonBleu("Contactez-moi");

  return `
        <div class="activite-container">
            <div class="titre-activite-container">
                <div>
                    <h1 class="titre-activite">${activite.titre}</h1>
                    <p class="date-activite">${activite.date}</p>
                </div>
                <div class="infos-activite">
                    <p class="adresse-activite">📍 ${activite.adresse}</p>
                    <p class="groupe-activite">👥 Groupe de ${activite.nbParticipants}</p>
                </div>
            </div>
            <div class="images-activite">
                <img src="${activite.image1}" alt="Image de l'activité" class="image-activite">
                <img src="${activite.image2}" alt="Image de l'activité" class="image-activite">
            </div>
            <div class="separator"></div>
            <div class="description-container">
                <div class="description-activite">
                    <h2>📄 Description de l’activité</h2>
                    <p>${activite.description}</p>
                </div>
                <div class="actions-container">
                    ${boutonParticiper}
                    ${boutonLaisserAvis}
                    <p class="prix-activite">💶 Prix : ${activite.prix}€</p>
                    <div class="organisateur">
                        <p class="nom-organisateur">👤 ${activite.organisateur.nom}</p>
                        <p class="note-organisateur">⭐ ${activite.organisateur.note} / 5</p>
                        ${boutonContact}
                    </div>
                </div>
            </div>
            <div class="avis-container">
                <h2>📢 Avis (${activite.avis.length})</h2>
                ${activite.avis
                  .map(
                    (avis) => `
                    <div class="avis">
                        <p><strong>${avis.utilisateur}</strong> ⭐ ${avis.note}</p>
                        <p>${avis.commentaire}</p>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `;
}
