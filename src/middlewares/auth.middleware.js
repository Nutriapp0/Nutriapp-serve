const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const session = await prisma.authSession.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada o inválida' })
    }

    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

module.exports = authMiddleware
