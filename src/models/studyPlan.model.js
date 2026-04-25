const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const StudyPlan = {
  create: (userId, documentId, title, planData, weeks) => {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const query = `INSERT INTO study_plans (id, user_id, document_id, title, plan_data, weeks, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(query, [id, userId, documentId, title, JSON.stringify(planData), weeks, createdAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id, 
            user_id: userId, 
            document_id: documentId, 
            title, 
            plan_data: planData, 
            weeks, 
            created_at: createdAt 
          });
        }
      });
    });
  },

  findByUserAndDocument: (userId, documentId, weeks) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM study_plans WHERE user_id = ? AND document_id = ? AND weeks = ? LIMIT 1`;
      db.get(query, [userId, documentId, weeks], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.plan_data = JSON.parse(row.plan_data);
          }
          resolve(row);
        }
      });
    });
  },

  findByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC`;
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => ({ ...row, plan_data: JSON.parse(row.plan_data) })));
        }
      });
    });
  },

  deleteByDocumentId: (documentId, userId) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM study_plans WHERE document_id = ? AND user_id = ?`;
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

module.exports = StudyPlan;
