const oracledb = require('oracledb');
const dbConfig = require('../config/database');

// 5. Regional Taxonomic Diversity and Conservation Priorities
// File: getRegionalTaxonomicDiversity.js

async function getRegionalTaxonomicDiversity() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const sql = `
            WITH RegionTaxonomy AS (
                SELECT
                    og.stateProvince,
                    bd.family,
                    bd.genus,
                    COUNT(DISTINCT bd.scientificName) AS NumberOfSpecies,
                    COUNT(DISTINCT CASE WHEN bd.iucnRedListCategory IN ('VU', 'EN', 'CR') THEN bd.scientificName END) AS ThreatenedSpecies
                FROM
                    observation_geospatial og
                    JOIN bird_details bd ON og.gbifID = bd.gbifID
                GROUP BY
                    og.stateProvince, bd.family, bd.genus
            ),
            ConservationFocus AS (
                SELECT
                    stateProvince,
                    family,
                    genus,
                    NumberOfSpecies,
                    ThreatenedSpecies,
                    (CAST(ThreatenedSpecies AS FLOAT) / NumberOfSpecies) * 100 AS ThreatenedPercentage
                FROM
                    RegionTaxonomy
            )
            SELECT
                stateProvince,
                family,
                genus,
                NumberOfSpecies,
                ThreatenedSpecies,
                ROUND(ThreatenedPercentage, 2) AS ThreatenedPercentage
            FROM
                ConservationFocus
            ORDER BY
                ThreatenedPercentage DESC, ThreatenedSpecies DESC
            LIMIT 10;
        `;
    const result = await connection.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows;
  } catch (err) {
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

module.exports = getRegionalTaxonomicDiversity;
