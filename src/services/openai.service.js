const OpenAI = require('openai')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const generateDiagnostico = async (data) => {
  const {
    Gender, Age, Height, Weight,
    family_history_with_overweight,
    FAVC, FCVC, NCP, CAEC, SMOKE, CH2O, SCC, FAF, TUE, CALC, MTRANS,
    imc, imcClasificacion,
    similares
  } = data

  // Contexto de registros similares del Excel
  const contextSimilares = similares.length > 0
    ? `\nDatos de referencia de registros similares en nuestra base de datos:\n` +
      similares.map((r, i) =>
        `${i + 1}. Género: ${r.Gender}, Edad: ${r.Age}, IMC aprox: ${(r.Weight / (r.Height * r.Height)).toFixed(1)}, Clasificación: ${r.NObeyesdad}`
      ).join('\n')
    : ''

  // Determinar NObeyesdad basado en IMC como fallback
  let nObeyesdadFallback = 'Normal_Weight'
  if (imc < 18.5) nObeyesdadFallback = 'Insufficient_Weight'
  else if (imc < 25) nObeyesdadFallback = 'Normal_Weight'
  else if (imc < 27.5) nObeyesdadFallback = 'Overweight_Level_I'
  else if (imc < 30) nObeyesdadFallback = 'Overweight_Level_II'
  else if (imc < 35) nObeyesdadFallback = 'Obesity_Type_I'
  else if (imc < 40) nObeyesdadFallback = 'Obesity_Type_II'
  else nObeyesdadFallback = 'Obesity_Type_III'

  const nivelRiesgoMap = {
    'Insufficient_Weight': 'Moderado',
    'Normal_Weight': 'Bajo',
    'Overweight_Level_I': 'Moderado',
    'Overweight_Level_II': 'Moderado',
    'Obesity_Type_I': 'Alto',
    'Obesity_Type_II': 'Alto',
    'Obesity_Type_III': 'Alto'
  }

  try {
    const prompt = `Eres un nutricionista clínico experto. Analiza los siguientes datos de un estudiante universitario y genera un diagnóstico nutricional personalizado en español.

DATOS DEL ESTUDIANTE:
- Género: ${Gender}
- Edad: ${Age} años
- Talla: ${Height} m
- Peso: ${Weight} kg
- IMC calculado: ${imc} (${imcClasificacion})
- Antecedentes familiares de sobrepeso: ${family_history_with_overweight}
- Consumo frecuente de alimentos calóricos (FAVC): ${FAVC}
- Frecuencia de consumo de vegetales (FCVC 1-3): ${FCVC}
- Número de comidas principales (NCP): ${NCP}
- Consumo entre comidas (CAEC): ${CAEC}
- Fumador: ${SMOKE}
- Consumo diario de agua (CH2O litros): ${CH2O}
- Monitorea calorías (SCC): ${SCC}
- Frecuencia actividad física (FAF 0-3): ${FAF}
- Tiempo en pantallas (TUE horas): ${TUE}
- Consumo de alcohol (CALC): ${CALC}
- Medio de transporte: ${MTRANS}
${contextSimilares}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "NObeyesdad": "<una de: Insufficient_Weight, Normal_Weight, Overweight_Level_I, Overweight_Level_II, Obesity_Type_I, Obesity_Type_II, Obesity_Type_III>",
  "nivelRiesgo": "<Bajo, Moderado o Alto>",
  "diagnostico": "<párrafo de 3-4 oraciones con el diagnóstico nutricional personalizado y recomendaciones concretas para este estudiante>"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return {
      NObeyesdad: result.NObeyesdad || nObeyesdadFallback,
      nivelRiesgo: result.nivelRiesgo || nivelRiesgoMap[nObeyesdadFallback],
      diagnostico: result.diagnostico || 'Diagnóstico generado basado en IMC.'
    }
  } catch (err) {
    console.error('OpenAI error:', err.message)
    // Fallback si OpenAI falla
    return {
      NObeyesdad: nObeyesdadFallback,
      nivelRiesgo: nivelRiesgoMap[nObeyesdadFallback],
      diagnostico: `Tu IMC es ${imc} (${imcClasificacion}). Se recomienda consultar con un profesional de la salud para una evaluación personalizada.`
    }
  }
}

module.exports = { generateDiagnostico }
