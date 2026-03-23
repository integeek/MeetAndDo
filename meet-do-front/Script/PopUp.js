function openPopUp(id) {
  console.log("openPopUp appelé"); // ← Ajoute ceci pour tester
  document.getElementById(id).style.display = "block";
}

function closePopUp(id) {
  document.getElementById(id).style.display = "none";
}
