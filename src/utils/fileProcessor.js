const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

const extractText = async (filePath, mimetype) => {
  const dataBuffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf') {
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const data = await mammoth.extractRawText({ buffer: dataBuffer });
    return data.value;
  } else {
    throw new Error('Unsupported file type');
  }
};

module.exports = {
  extractText
};
