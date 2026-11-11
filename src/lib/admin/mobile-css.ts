// Ajustements de l'administration pour téléphone et tablette (iPhone, iPad). Rendus dans un <style>
// par les seuls écrans d'admin : aucun octet de plus pour le site public (une feuille CSS importée
// par une route serait chargée sur toutes les pages).

export const ADMIN_MOBILE_CSS = `
/* Safari iOS zoome sur tout champ dont le texte fait moins de 16 px : on évite ce zoom sur mobile. */
@media (max-width: 767px) {
  .admin-root :is(input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"]), select, textarea) {
    font-size: 16px;
  }
}
/* Écrans tactiles : cibles d'au moins 44 px (recommandation Apple) pour boutons et cases. */
@media (pointer: coarse) {
  .admin-root :is(button, summary):not([role="checkbox"], [role="switch"]) {
    min-height: 44px;
  }
  .admin-root :is(input[type="checkbox"], input[type="radio"]) {
    width: 22px;
    height: 22px;
  }
  .admin-root label:has(> input[type="file"]) {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
}
`;
