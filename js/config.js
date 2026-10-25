/* =========================================================
   TECH STORE — CONFIGURATION (le seul fichier à modifier
   pour tes coordonnées)
   ========================================================= */

window.SITE = {
  name: "TECH STORE",

  // Développement local : API Django sur le port 8000. Avant publication, remplacer par l’URL HTTPS réelle du backend.
  // Si frontend et backend partagent le même domaine, utiliser "/api".
  apiBase: "http://127.0.0.1:8000/api",
  // Le catalogue de démonstration est réservé à la prévisualisation locale.
  useDemoCatalog: false,

  // Numéro WhatsApp qui reçoit les commandes : format international, sans "+" ni espaces
  whatsapp: "221706593565",

  // Téléphone (appel) : même format ; texte tel qu'affiché sur le site
  phone: "221706593565",
  phoneDisplay: "+221 70 659 35 65",

  email: "iboui.s.s03@gmail.com",
  address: "Dakar, Sénégal",

  // Adresse du site une fois en ligne (sans "/" final) : sert aux aperçus WhatsApp/Facebook
  domain: "https://www.techstore.sn",

  // Frais de livraison : null = "à confirmer sur WhatsApp" ; sinon un montant fixe, ex. 2000
  deliveryFee: null,

  // Réseaux sociaux : colle ton lien complet ; laisse "" pour masquer l'icône
  social: {
    facebook: "",
    instagram: "",
    tiktok: ""
  }
};
