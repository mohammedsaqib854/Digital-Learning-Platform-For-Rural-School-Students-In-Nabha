const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const User = {
  create: (username, email, password, googleId = null) => {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const query = `INSERT INTO users (id, username, email, password, google_id) VALUES (?, ?, ?, ?, ?)`;
      db.run(query, [id, username, email, password, googleId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, username, email, googleId });
        }
      });
    });
  },

  findByEmail: (email) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE email = ?`;
      db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, username, email, created_at FROM users WHERE id = ?`;
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
};

module.exports = User;
