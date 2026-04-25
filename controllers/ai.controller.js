const Document = require('../models/document.model');
const Quiz = require('../models/quiz.model');
const StudyPlan = require('../models/studyPlan.model');
const ollama = require('../utils/ollama');

exports.testAI = async (req, res, next) => {
  try {
    const response = await ollama.chatWithDocument('Hello, say "AI is Ready!"', 'Test context');
    res.json({ status: 'success', message: 'Ollama is connected', response });
  } catch (error) {
    next(error);
  }
};

exports.generateQuiz = async (req, res, next) => {
  const { documentId } = req.body;
  const userId = req.user.id;

  if (!documentId) return res.status(400).json({ message: 'documentId is required' });

  try {
    const document = await Document.findById(documentId);
    if (!document || document.user_id !== userId) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check for cached quiz
    const existingQuizzes = await Quiz.findByDocumentId(documentId);
    if (existingQuizzes?.length > 0) {
      const cached = existingQuizzes[0];
      return res.json({
        success: true,
        quiz: cached
      });
    }

    let quizQuestions;
    try {
      console.log(`[AI] Generating new quiz for: ${document.title}`);
      quizQuestions = await ollama.generateQuiz(document.content);
    } catch (aiError) {
      console.error("[AI] Ollama failed, using fallback quiz:", aiError.message);
      // Fallback Quiz
      quizQuestions = [
        {
          question: `What is the main topic of ${document.title}?`,
          options: {
            a: "The primary subject covered in the document",
            b: "An unrelated minor detail",
            c: "The history of the author",
            d: "None of the above"
          },
          answer: "a"
        },
        {
          question: "Based on the content, which of the following is true?",
          options: {
            a: "The document provides specific information on the topic.",
            b: "The document is completely empty.",
            c: "The document is about space travel.",
            d: "The document is a recipe book."
          },
          answer: "a"
        }
      ];
    }
    
    // Save to DB
    const quizRecord = await Quiz.create(documentId, userId, quizQuestions);

    // Final response format
    return res.status(201).json({
      success: true,
      quiz: quizRecord
    });

  } catch (error) {
    console.error("FATAL QUIZ ERROR:", error.message);
    // Even in fatal local error, try to return something non-500
    res.json({
      success: false,
      message: "Could not generate quiz at this time.",
      quiz: null
    });
  }
};

exports.generateStudyPlan = async (req, res, next) => {
  const { documentId, weeks = 4 } = req.body;
  const userId = req.user.id;

  if (!documentId) return res.status(400).json({ message: 'documentId is required' });

  try {
    const document = await Document.findById(documentId);
    if (!document || document.user_id !== userId) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check for existing plan with same parameters
    const existingPlan = await StudyPlan.findByUserAndDocument(userId, documentId, weeks);
    if (existingPlan) {
      return res.json(existingPlan);
    }

    if (!document.content || document.content.trim().length < 100) {
      return res.status(400).json({ 
        message: 'Document content is too short to generate a study plan.' 
      });
    }

    const planData = await ollama.generateStudyPlan(document.content, weeks);
    const studyPlan = await StudyPlan.create(
      userId, 
      documentId,
      planData.title || `Plan for ${document.title}`, 
      planData, 
      weeks
    );

    res.status(201).json(studyPlan);
  } catch (error) {
    console.error(`[AI] Study Plan Error: ${error.message}`);
    next(error);
  }
};

exports.chat = async (req, res, next) => {
  const { query, documentId } = req.body;
  const userId = req.user.id;

  try {
    let context = '';
    if (documentId) {
      const doc = await Document.findById(documentId);
      if (doc?.user_id === userId) context = doc.content;
    } else {
      const docs = await Document.findByUserId(userId);
      context = docs.map(d => d.content).join('\n').substring(0, 5000);
    }

    const response = await ollama.chatWithDocument(query, context);
    res.json({ response });
  } catch (error) {
    console.error(`[AI] Chat Error: ${error.message}`);
    next(error);
  }
};

exports.chatStream = async (req, res) => {
  const { query, documentId } = req.body;
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let context = '';
    if (documentId) {
      const doc = await Document.findById(documentId);
      if (doc?.user_id === userId) context = doc.content;
    }
    await ollama.chatWithDocumentStream(query, context, res);
  } catch (error) {
    console.error(`[AI] Stream Error: ${error.message}`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

exports.generatePuzzle = async (req, res, next) => {
  const { documentId } = req.body;
  const userId = req.user.id;

  if (!documentId) return res.status(400).json({ message: 'documentId is required' });

  try {
    const document = await Document.findById(documentId);
    if (!document || document.user_id !== userId) return res.status(404).json({ message: 'Document not found' });

    if (!document.content || document.content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short for keywords.' });
    }

    const keywords = await ollama.extractKeywords(document.content);
    res.json({ keywords });
  } catch (error) {
    console.error(`[AI] Puzzle Error: ${error.message}`);
    next(error);
  }
};

exports.summarizeDocument = async (req, res, next) => {
  const { documentId } = req.params;
  try {
    const document = await Document.findById(documentId);
    if (!document || document.user_id !== req.user.id) return res.status(404).json({ message: 'Not found' });

    if (!document.content || document.content.trim().length < 50) {
      return res.status(400).json({ message: 'Document content is too short to summarize.' });
    }

    const aiResult = await ollama.summarize(document.content);
    await Document.updateAIContent(documentId, aiResult.summary, JSON.stringify(aiResult.keyPoints));

    res.json({ summary: aiResult.summary, keyPoints: aiResult.keyPoints });
  } catch (error) {
    console.error(`[AI] Summarize Error: ${error.message}`);
    next(error);
  }
};

exports.getUserQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.findByUserId(req.user.id);
    res.json(quizzes);
  } catch (error) {
    next(error);
  }
};

exports.getUserStudyPlans = async (req, res, next) => {
  try {
    const studyPlans = await StudyPlan.findByUserId(req.user.id);
    res.json(studyPlans);
  } catch (error) {
    next(error);
  }
};
