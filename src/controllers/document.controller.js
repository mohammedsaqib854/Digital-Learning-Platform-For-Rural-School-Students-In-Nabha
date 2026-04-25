const Document = require('../models/document.model');
const Quiz = require('../models/quiz.model');
const StudyPlan = require('../models/studyPlan.model');
const { extractText } = require('../utils/fileProcessor');
const path = require('path');
const fs = require('fs');

exports.uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { title } = req.body;
  const { filename, mimetype, path: filePath } = req.file;
  const userId = req.user.id;

  try {
    const content = await extractText(filePath, mimetype);
    const document = await Document.create(userId, title || filename, filename, mimetype, content);

    res.status(201).json({ message: 'Document uploaded and processed successfully', document });
  } catch (error) {
    console.error('[Upload Error]', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: 'Error processing document' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.findByUserId(req.user.id);
    res.json(documents);
  } catch (error) {
    console.error('[Fetch Error]', error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    console.error('[Fetch ID Error]', error);
    res.status(500).json({ message: 'Error fetching document' });
  }
};

exports.deleteDocument = async (req, res) => {
  const documentId = req.params.id;
  const userId = req.user.id;

  console.log(`[Delete Request] User ${userId} is deleting document ${documentId}`);

  try {
    // 1. Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      console.warn(`[Delete] Document ${documentId} not found`);
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.user_id !== userId) {
      console.warn(`[Delete] Unauthorized attempt by user ${userId} on document ${documentId}`);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // 2. Delete related quizzes
    const deletedQuizzes = await Quiz.deleteByDocumentId(documentId, userId);
    console.log(`[Delete] Removed ${deletedQuizzes} related quizzes`);

    // 3. Delete related study plans
    const deletedPlans = await StudyPlan.deleteByDocumentId(documentId, userId);
    console.log(`[Delete] Removed ${deletedPlans} related study plans`);

    // 4. Delete physical file
    const filePath = path.join(__dirname, '../../uploads', document.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[Delete] File ${document.filename} removed from disk`);
      } catch (fileErr) {
        console.error(`[Delete] Error removing file ${document.filename}:`, fileErr.message);
      }
    } else {
      console.warn(`[Delete] File ${document.filename} not found on disk, skipping unlinking`);
    }

    // 5. Delete document from DB
    const changes = await Document.delete(documentId, userId);
    
    if (changes > 0) {
      console.log(`[Delete] Document ${documentId} removed from database`);
      res.json({ success: true, message: 'Document and all related resources deleted successfully' });
    } else {
      console.warn(`[Delete] No changes made in database for document ${documentId}`);
      res.status(404).json({ message: 'Document not found in database' });
    }
  } catch (error) {
    console.error('[Delete Error]', error);
    res.status(500).json({ message: 'Internal server error during deletion' });
  }
};
