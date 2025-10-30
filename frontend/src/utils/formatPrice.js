/**
 * Formate un prix en Ariary avec K (milliers) et M (millions)
 * @param {number} price - Le prix à formater
 * @param {boolean} showDecimals - Afficher les décimales (défaut: true)
 * @returns {string} - Prix formaté (ex: "1.5K Ar", "2.3M Ar")
 */
export const formatPrice = (price, showDecimals = true) => {
  if (!price || price === 0) return '0 Ar';
  
  const absPrice = Math.abs(price);
  
  // Millions (>= 1 000 000)
  if (absPrice >= 1000000) {
    const millions = price / 1000000;
    return showDecimals 
      ? `${millions.toFixed(1)}M Ar`
      : `${Math.round(millions)}M Ar`;
  }
  
  // Milliers (>= 1 000)
  if (absPrice >= 1000) {
    const thousands = price / 1000;
    return showDecimals 
      ? `${thousands.toFixed(1)}K Ar`
      : `${Math.round(thousands)}K Ar`;
  }
  
  // Moins de 1000
  return `${price} Ar`;
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
