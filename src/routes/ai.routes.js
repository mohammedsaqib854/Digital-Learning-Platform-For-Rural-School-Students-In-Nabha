const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Test Route
router.get('/test', authMiddleware, aiController.testAI);

// Main AI Features
router.post('/quiz', authMiddleware, aiController.generateQuiz);
router.post('/puzzle', authMiddleware, aiController.generatePuzzle);
router.post('/study-plan', authMiddleware, aiController.generateStudyPlan);
router.post('/chat', authMiddleware, aiController.chat);
router.post('/chat-stream', authMiddleware, aiController.chatStream);
router.post('/summarize/:documentId', authMiddleware, aiController.summarizeDocument);

// Data Retrieval
router.get('/quizzes', authMiddleware, aiController.getUserQuizzes);
router.get('/study-plans', authMiddleware, aiController.getUserStudyPlans);

module.exports = router;
