/**
 * Formate un prix en Ariary avec K (milliers) et M (millions)
 * @param {number} price - Le prix à formater
 * @returns {string} - Prix formaté (ex: "1.5K Ar", "2M Ar")
 */
export const formatPrice = (price) => {
  if (!price || price === 0) return '0 Ar';
  
  const absPrice = Math.abs(price);
  
  // Millions (>= 1 000 000)
  if (absPrice >= 1000000) {
    const millions = price / 1000000;
    // Enlever le .0 si c'est un nombre entier
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted}M Ar`;
  }
  
  // Milliers (>= 1 000)
  if (absPrice >= 1000) {
    const thousands = price / 1000;
    // Enlever le .0 si c'est un nombre entier
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K Ar`;
  }
  
  // Moins de 1000
  return `${Math.round(price)} Ar`;
};

/**
 * Formate un prix avec séparateur de milliers
 * @param {number} price - Le prix à formater
 * @returns {string} - Prix formaté (ex: "1 500 Ar", "2 300 000 Ar")
 */
export const formatPriceFull = (price) => {
  if (!price || price === 0) return '0 Ar';
  return `${price.toLocaleString('fr-FR')} Ar`;
};
