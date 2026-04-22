const express = require('express')
const { createAssessment, getAssessment, getHistory } = require('../controllers/assessment.controller')
const authMiddleware = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/', authMiddleware, createAssessment)
router.get('/history', authMiddleware, getHistory)
router.get('/:id', authMiddleware, getAssessment)

module.exports = router
