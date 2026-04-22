/**
 * Script para importar el dataset CSV de obesidad a PostgreSQL (tabla AnthropometricData).
 * Dataset: ObesityDataSet_raw_and_data_sinthetic — 2111 registros, 17 columnas.
 *
 * Uso:   node scripts/import-excel.js
 * O con ruta custom: node scripts/import-excel.js data/mi_archivo.csv
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg }     = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma  = new PrismaClient({ adapter })

// ── Categorías válidas ────────────────────────────────────────────────────────
const VALID_NOBEYESDAD = [
  'Insufficient_Weight', 'Normal_Weight',
  'Overweight_Level_I',  'Overweight_Level_II',
  'Obesity_Type_I',      'Obesity_Type_II', 'Obesity_Type_III'
]

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines   = content.split('\n').filter(l => l.trim() !== '')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim())
    const row    = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    return { row, lineNumber: i + 2 }
  })
}

function mapRow({ row, lineNumber }) {
  const get    = (k) => (row[k] ?? '').trim()
  const getNum = (k) => { const n = parseFloat(get(k)); return isNaN(n) ? null : n }

  const Gender     = get('Gender')
  const Age        = getNum('Age')
  const Height     = getNum('Height')
  const Weight     = getNum('Weight')
  const NObeyesdad = get('NObeyesdad')

  // Filtrar filas inválidas
  if (!Gender || Age === null || Height === null || Weight === null) {
    console.warn(`⚠️  Fila ${lineNumber} omitida: datos antropométricos incompletos`)
    return null
  }
  if (Height < 1.0 || Height > 2.5) {
    console.warn(`⚠️  Fila ${lineNumber} omitida: talla fuera de rango (${Height})`)
    return null
  }
  if (Weight < 20 || Weight > 350) {
    console.warn(`⚠️  Fila ${lineNumber} omitida: peso fuera de rango (${Weight})`)
    return null
  }
  if (!VALID_NOBEYESDAD.includes(NObeyesdad)) {
    console.warn(`⚠️  Fila ${lineNumber} omitida: NObeyesdad inválido ("${NObeyesdad}")`)
    return null
  }

  return {
    Gender,
    Age,
    Height,
    Weight,
    family_history_with_overweight: get('family_history_with_overweight') || 'no',
    FAVC:   get('FAVC')   || 'no',
    FCVC:   getNum('FCVC') ?? 2,
    NCP:    getNum('NCP')  ?? 3,
    CAEC:   get('CAEC')   || 'Sometimes',
    SMOKE:  get('SMOKE')  || 'no',
    CH2O:   getNum('CH2O') ?? 2,
    SCC:    get('SCC')    || 'no',
    FAF:    getNum('FAF')  ?? 1,
    TUE:    getNum('TUE')  ?? 1,
    CALC:   get('CALC')   || 'no',
    MTRANS: get('MTRANS') || 'Public_Transportation',
    NObeyesdad
  }
}

async function importCSV(filePath) {
  console.log(`\n📂 Leyendo: ${filePath}`)
  const parsed = parseCSV(filePath)
  console.log(`📊 Filas en CSV: ${parsed.length}`)

  const records = parsed.map(mapRow).filter(Boolean)
  console.log(`✅ Filas válidas: ${records.length}`)
  console.log(`⚠️  Filas omitidas: ${parsed.length - records.length}`)

  // Distribución de categorías
  const dist = {}
  records.forEach(r => { dist[r.NObeyesdad] = (dist[r.NObeyesdad] || 0) + 1 })
  console.log('\n📈 Distribución de categorías:')
  Object.entries(dist).sort((a,b) => b[1]-a[1]).forEach(([k,v]) =>
    console.log(`   ${k.padEnd(25)} ${v} registros`)
  )

  // Limpiar tabla e importar en batches
  console.log('\n🗑️  Limpiando tabla AnthropometricData...')
  await prisma.anthropometricData.deleteMany()

  const BATCH = 200
  let imported = 0
  for (let i = 0; i < records.length; i += BATCH) {
    await prisma.anthropometricData.createMany({ data: records.slice(i, i + BATCH) })
    imported += Math.min(BATCH, records.length - i)
    process.stdout.write(`\r📥 Importados: ${imported}/${records.length}`)
  }

  console.log(`\n\n🎉 Importación completada: ${imported} registros en PostgreSQL (Neon)\n`)
  await prisma.$disconnect()
}

const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../data/obesity_dataset.csv')

if (!fs.existsSync(filePath)) {
  console.error(`❌ Archivo no encontrado: ${filePath}`)
  process.exit(1)
}

importCSV(filePath).catch(err => {
  console.error('\n❌ Error durante importación:', err.message)
  process.exit(1)
})
