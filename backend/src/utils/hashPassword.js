import bcrypt from 'bcrypt';

// Script pour générer le hash d'un mot de passe
const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erreur:', err);
    return;
  }
  console.log('\n🔐 Hash généré pour le mot de passe:', password);
  console.log('Hash:', hash);
  console.log('\nUtilisez ce hash dans votre migration ou insertion SQL\n');
});
