const prisma = require('../lib/prisma')

const acceptConsent = async (req, res) => {
  const userId = req.userId
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || null

  try {
    const existing = await prisma.userConsent.findUnique({ where: { userId } })
    if (existing) {
      return res.json({ message: 'Consentimiento ya aceptado', acceptedAt: existing.acceptedAt })
    }

    const consent = await prisma.userConsent.create({
      data: { userId, ipAddress }
    })

    res.status(201).json({ message: 'Consentimiento registrado', acceptedAt: consent.acceptedAt })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar consentimiento' })
  }
}

const getConsent = async (req, res) => {
  const userId = req.userId
  try {
    const consent = await prisma.userConsent.findUnique({ where: { userId } })
    res.json({ accepted: !!consent, acceptedAt: consent?.acceptedAt || null })
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar consentimiento' })
  }
}

module.exports = { acceptConsent, getConsent }
