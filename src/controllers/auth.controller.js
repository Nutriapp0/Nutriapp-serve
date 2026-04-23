const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const register = async (req, res) => {
  const { email, nombre, password } = req.body

  if (!email || !nombre || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, nombre, passwordHash }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    })
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.authSession.create({
      data: { userId: user.id, token, expiresAt }
    })

    res.status(201).json({
      user: { id: user.id, nombre: user.nombre, email: user.email },
      token
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    })

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Eliminar sesión previa si existe
    await prisma.authSession.deleteMany({ where: { userId: user.id } })

    await prisma.authSession.create({
      data: { userId: user.id, token, expiresAt }
    })

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

const logout = async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  if (token) {
    await prisma.authSession.deleteMany({ where: { token } }).catch(() => {})
  }
  res.json({ message: 'Sesión cerrada exitosamente' })
}

module.exports = { register, login, logout }
