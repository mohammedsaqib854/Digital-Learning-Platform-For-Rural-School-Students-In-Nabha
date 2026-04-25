const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Document = {
  create: (userId, title, filename, mimetype, content) => {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const query = `INSERT INTO documents (id, user_id, title, filename, mimetype, content) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(query, [id, userId, title, filename, mimetype, content], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, userId, title, filename, mimetype });
        }
      });
    });
  },

  findByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, title, filename, mimetype, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC`;
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM documents WHERE id = ?`;
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  delete: (id, userId) => {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM documents WHERE id = ? AND user_id = ?`;
      db.run(query, [id, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  },

  updateAIContent: (id, summary, keyPoints) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE documents SET summary = ?, key_points = ? WHERE id = ?`;
      db.run(query, [summary, keyPoints, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
};

module.exports = Document;
