/**
 * Calculates the operational status of a transport service.
 * Order of evaluation: LLENA > ACTIVA > EN_PROGRESO > NO_VIABLE
 *
 * @param {number} currentLoad  - Passengers currently assigned
 * @param {number} capacity     - Max vehicle capacity
 * @param {number} minRequired  - Minimum passengers needed (40% of capacity)
 * @returns {string} Status label
 */
function calcStatus(currentLoad, capacity, minRequired) {
  if (currentLoad >= capacity)                        return 'LLENA';
  if (currentLoad >= minRequired)                     return 'ACTIVA';
  if (currentLoad >= Math.ceil(minRequired * 0.6))    return 'EN_PROGRESO';
  return 'NO_VIABLE';
}

module.exports = { calcStatus };
