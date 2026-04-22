const express = require('express')
const { acceptConsent, getConsent } = require('../controllers/consent.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/', authMiddleware, acceptConsent)
router.get('/', authMiddleware, getConsent)

module.exports = router
