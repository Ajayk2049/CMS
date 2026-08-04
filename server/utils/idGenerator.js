/**
 * Centralized ID Generator Utility
 * Generates custom IDs in the format: PREFIX + 5-character uppercase alphanumeric string
 * Example: TAB_A8X9K, VEN_K9X2P, ADV_M4P7Q, FOOD_R8K3L, AD_X7K9P, AD_PAY_8A92B
 */

function generateAlphanumeric5() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a formatted custom ID with prefix and 5 random alphanumeric characters.
 * @param {string} prefix - ID prefix (e.g. 'TAB_', 'SCR_', 'VEN_', 'ADV_', 'FOOD_', 'NEW_HW_', 'VENUE_AD_', 'AD_', 'AD_PAY_', 'ORD_')
 * @returns {string}
 */
function generateCustomId(prefix) {
  return `${prefix}${generateAlphanumeric5()}`;
}

/**
 * Helper to repeatedly generate a custom ID until it is unique in the given Mongoose model field.
 * @param {Object} Model - Mongoose model
 * @param {string} fieldName - Field name in schema (e.g. 'deviceId', 'venueId', 'bookingId')
 * @param {string} prefix - Prefix string
 * @returns {Promise<string>}
 */
async function generateUniqueCustomId(Model, fieldName, prefix) {
  let customId;
  let exists = true;
  while (exists) {
    customId = generateCustomId(prefix);
    const count = await Model.countDocuments({ [fieldName]: customId });
    if (count === 0) exists = false;
  }
  return customId;
}

module.exports = {
  generateAlphanumeric5,
  generateCustomId,
  generateUniqueCustomId
};
