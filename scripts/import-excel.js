/**
 * Script para importar el Excel de datos antropométricos a PostgreSQL.
 * Uso: node scripts/import-excel.js <ruta-al-archivo.xlsx>
 * Ejemplo: node scripts/import-excel.js data/obesidad.xlsx
 */

require('dotenv').config()
const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient()

async function importExcel(filePath) {
  console.log(`📂 Leyendo archivo: ${filePath}`)
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  console.log(`📊 Total de filas encontradas: ${rows.length}`)

  // Limpiar tabla antes de importar
  await prisma.anthropometricData.deleteMany()
  console.log('🗑️  Tabla AnthropometricData limpiada')

  const BATCH_SIZE = 100
  let imported = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
      Gender:                         String(row['Gender'] || ''),
      Age:                            parseFloat(row['Age']) || 0,
      Height:                         parseFloat(row['Height']) || 0,
      Weight:                         parseFloat(row['Weight']) || 0,
      family_history_with_overweight: String(row['family_history_with_overweight'] || ''),
      FAVC:                           String(row['FAVC'] || ''),
      FCVC:                           parseFloat(row['FCVC']) || 0,
      NCP:                            parseFloat(row['NCP']) || 0,
      CAEC:                           String(row['CAEC'] || ''),
      SMOKE:                          String(row['SMOKE'] || ''),
      CH2O:                           parseFloat(row['CH2O']) || 0,
      SCC:                            String(row['SCC'] || ''),
      FAF:                            parseFloat(row['FAF']) || 0,
      TUE:                            parseFloat(row['TUE']) || 0,
      CALC:                           String(row['CALC'] || ''),
      MTRANS:                         String(row['MTRANS'] || ''),
      NObeyesdad:                     String(row['NObeyesdad'] || '')
    }))

    await prisma.anthropometricData.createMany({ data: batch })
    imported += batch.length
    console.log(`✅ Importados: ${imported}/${rows.length}`)
  }

  console.log(`\n🎉 Importación completada: ${imported} registros en PostgreSQL`)
  await prisma.$disconnect()
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('❌ Debes indicar la ruta al archivo Excel.')
  console.error('   Uso: node scripts/import-excel.js data/obesidad.xlsx')
  process.exit(1)
}

importExcel(path.resolve(filePath)).catch(err => {
  console.error('❌ Error durante importación:', err)
  process.exit(1)
})
