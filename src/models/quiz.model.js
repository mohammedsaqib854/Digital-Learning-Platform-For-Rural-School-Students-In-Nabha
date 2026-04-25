const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Quiz = {
  create: (documentId, userId, questions) => {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const query = `INSERT INTO quizzes (id, document_id, user_id, questions, created_at) VALUES (?, ?, ?, ?, ?)`;
      db.run(query, [id, documentId, userId, JSON.stringify(questions), createdAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id, 
            document_id: documentId, 
            user_id: userId, 
            questions, 
            created_at: createdAt 
          });
        }
      });
    });
  },

  findByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC`;
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({ 
            ...row, 
            questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions 
          })));
        }
      });
    });
  },

  findByDocumentId: (documentId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM quizzes WHERE document_id = ? ORDER BY created_at DESC`;
      db.all(query, [documentId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({ 
            ...row, 
            questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions 
          })));
        }
      });
    });
  },

  deleteByDocumentId: (documentId, userId) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM quizzes WHERE document_id = ? AND user_id = ?`;
      db.run(query, [documentId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
};

module.exports = Quiz;
