const prisma = require('../lib/prisma')
const { generateDiagnostico } = require('../services/openai.service')

// Calcular IMC y clasificación OMS
const calcularIMC = (weight, height) => {
  const imc = weight / (height * height)
  const imcRound = parseFloat(imc.toFixed(2))
  let clasificacion = ''
  if (imc < 18.5) clasificacion = 'Bajo peso'
  else if (imc < 25) clasificacion = 'Peso normal'
  else if (imc < 30) clasificacion = 'Sobrepeso'
  else if (imc < 35) clasificacion = 'Obesidad tipo I'
  else if (imc < 40) clasificacion = 'Obesidad tipo II'
  else clasificacion = 'Obesidad tipo III'
  return { imc: imcRound, imcClasificacion: clasificacion }
}

const createAssessment = async (req, res) => {
  const userId = req.userId

  // Verificar consentimiento
  const consent = await prisma.userConsent.findUnique({ where: { userId } })
  if (!consent) {
    return res.status(403).json({ error: 'Debe aceptar el consentimiento informado primero' })
  }

  const {
    Gender, Age, Height, Weight,
    family_history_with_overweight,
    FAVC, FCVC, NCP, CAEC, SMOKE, CH2O, SCC, FAF, TUE, CALC, MTRANS
  } = req.body

  // Validación básica
  if (!Gender || !Age || !Height || !Weight) {
    return res.status(400).json({ error: 'Datos antropométricos incompletos' })
  }

  try {
    const { imc, imcClasificacion } = calcularIMC(parseFloat(Weight), parseFloat(Height))

    // Buscar registros similares del Excel para contexto
    const similares = await prisma.anthropometricData.findMany({
      where: { Gender },
      take: 5,
      orderBy: { id: 'asc' }
    })

    // Generar diagnóstico con OpenAI
    const { diagnostico, NObeyesdad, nivelRiesgo } = await generateDiagnostico({
      Gender, Age, Height, Weight,
      family_history_with_overweight,
      FAVC, FCVC, NCP, CAEC, SMOKE, CH2O, SCC, FAF, TUE, CALC, MTRANS,
      imc, imcClasificacion,
      similares
    })

    // Guardar evaluación
    const assessment = await prisma.assessment.create({
      data: {
        Gender, Age: parseFloat(Age), Height: parseFloat(Height), Weight: parseFloat(Weight),
        family_history_with_overweight, FAVC,
        FCVC: parseFloat(FCVC), NCP: parseFloat(NCP), CAEC, SMOKE,
        CH2O: parseFloat(CH2O), SCC,
        FAF: parseFloat(FAF), TUE: parseFloat(TUE), CALC, MTRANS,
        imc, imcClasificacion, NObeyesdad, diagnostico, nivelRiesgo,
        registrosSimilares: similares.length
      }
    })

    await prisma.userAssessment.create({
      data: { userId, assessmentId: assessment.id }
    })

    res.status(201).json({ assessment })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al procesar la evaluación' })
  }
}

const getAssessment = async (req, res) => {
  const { id } = req.params
  const userId = req.userId

  try {
    const userAssessment = await prisma.userAssessment.findFirst({
      where: { assessmentId: id, userId },
      include: { assessment: true }
    })

    if (!userAssessment) {
      return res.status(404).json({ error: 'Evaluación no encontrada' })
    }

    res.json({ assessment: userAssessment.assessment })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la evaluación' })
  }
}

const getHistory = async (req, res) => {
  const userId = req.userId
  const page = parseInt(req.query.page) || 1
  const limit = 10
  const skip = (page - 1) * limit

  try {
    const [items, total] = await Promise.all([
      prisma.userAssessment.findMany({
        where: { userId },
        include: { assessment: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.userAssessment.count({ where: { userId } })
    ])

    res.json({
      assessments: items.map(i => i.assessment),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' })
  }
}

module.exports = { createAssessment, getAssessment, getHistory }
