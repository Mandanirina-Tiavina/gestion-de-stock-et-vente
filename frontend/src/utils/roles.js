export const canAccess = (to, role) => {
  if (!role) return false;
  if (role === 'admin') return true;
  if (to === '/comptabilite') return role === 'comptable';
  if (to === '/parametres') return false;
  return true;
};