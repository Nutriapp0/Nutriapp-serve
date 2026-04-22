require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const consentRoutes = require('./routes/consent.routes')
const assessmentRoutes = require('./routes/assessment.routes')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'NutriApp API' }))

app.use('/auth', authRoutes)
app.use('/consent', consentRoutes)
app.use('/assessment', assessmentRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 NutriApp API corriendo en http://localhost:${PORT}`)
})
