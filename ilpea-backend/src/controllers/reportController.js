const db = require('../config/db');

/**
 * Obtiene métricas agregadas por ruta para análisis administrativo.
 * Incluye promedios de ocupación y sugerencias de tipo de vehículo.
 */
async function getHistoricalUsageData(req, res) {
  try {
    const sql = `
      SELECT 
        r.id AS route_id,
        r.name AS route_name,
        vt.name AS current_vehicle,
        vt.capacity AS capacity,
        COUNT(ts.id) AS total_services,
        AVG(ts.current_load) AS avg_load,
        MAX(ts.current_load) AS max_load,
        (AVG(ts.current_load) / vt.capacity) * 100 AS avg_occupancy_pct
      FROM routes r
      JOIN vehicle_types vt ON r.vehicle_type_id = vt.id
      JOIN transport_services ts ON ts.route_id = r.id
      GROUP BY r.id, r.name, vt.name, vt.capacity
      ORDER BY avg_occupancy_pct DESC
    `;

    const [rows] = await db.query(sql);

    // Añadimos lógica de recomendación a los datos
    const processedData = rows.map(r => {
      let recommendation = 'ÓPTIMO';
      let suggestion = 'Mantener vehículo actual';

      if (r.avg_occupancy_pct < 40) {
        recommendation = 'SUB-UTILIZADA';
        suggestion = r.capacity > 12 ? 'Considerar vehículo más pequeño (Van)' : 'Revisar viabilidad de ruta';
      } else if (r.avg_occupancy_pct > 85 || r.max_load >= r.capacity) {
        recommendation = 'CRÍTICA / SOBRECARGA';
        suggestion = r.capacity < 30 ? 'Considerar vehículo más grande' : 'Añadir unidad adicional';
      }

      return {
        ...r,
        recommendation,
        suggestion,
        avg_load: parseFloat(r.avg_load).toFixed(1),
        avg_occupancy_pct: parseFloat(r.avg_occupancy_pct).toFixed(1)
      };
    });

    return res.json(processedData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al generar datos del reporte' });
  }
}

module.exports = { getHistoricalUsageData };
