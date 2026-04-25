const axios = require('axios');
require('dotenv').config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_API_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const generateResponse = async (prompt, systemPrompt = '', retries = 2) => {
  const startTime = Date.now();
  const payload = {
    model: OLLAMA_MODEL,
    prompt: systemPrompt ? `${systemPrompt}\n\nContext/Text: ${prompt}` : prompt,
    stream: false,
    options: {
      temperature: 0.1,
    }
  };

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`\n--- Ollama Request (Attempt ${attempt}) ---`);
      console.log(`URL: ${OLLAMA_API_URL}`);
      console.log(`Model: ${OLLAMA_MODEL}`);
      
      const response = await axios.post(OLLAMA_API_URL, payload, {
        timeout: 120000 // 2 minutes
      });

      if (!response.data || !response.data.response) {
        console.error('[Ollama] Unexpected response structure:', response.data);
        throw new Error('Empty or invalid response from Ollama');
      }

      return response.data.response;
    } catch (error) {
      console.error(`[Ollama] Attempt ${attempt} failed.`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, JSON.stringify(error.response.data).substring(0, 500));
      } else {
        console.error(`Error: ${error.message}`);
      }
      console.error(`Request Payload:`, JSON.stringify({ ...payload, prompt: payload.prompt.substring(0, 200) + '...' }));

      if (attempt > retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const cleanJsonResponse = (response) => {
  try {
    // Find the first occurrence of { or [
    const firstBrace = response.indexOf('{');
    const firstBracket = response.indexOf('[');
    
    let startIdx;
    if (firstBrace === -1) startIdx = firstBracket;
    else if (firstBracket === -1) startIdx = firstBrace;
    else startIdx = Math.min(firstBrace, firstBracket);

    // Find the last occurrence of } or ]
    const lastBrace = response.lastIndexOf('}');
    const lastBracket = response.lastIndexOf(']');
    const endIdx = Math.max(lastBrace, lastBracket);

    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
      console.error('[Ollama] Could not find JSON delimiters in response');
      console.error('[Ollama] Raw response:', response);
      throw new Error('No JSON structure found in AI response');
    }

    const jsonStr = response.substring(startIdx, endIdx + 1);
    
    // Remove any potential markdown code block wrappers
    const sanitizedJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(sanitizedJson);
  } catch (error) {
    console.error('[Ollama] JSON Parse Error:', error.message);
    console.error('[Ollama] Raw AI Response was:', response);
    throw new Error('AI failed to generate valid JSON data.');
  }
};

module.exports = {
  summarize: async (content) => {
    const limitedContent = content.substring(0, 5000);
    const prompt = `Return ONLY a JSON object: {"summary": "short summary", "keyPoints": ["point1", "point2"]}. Text: ${limitedContent}`;
    const response = await generateResponse(prompt, 'Summarize the text.');
    return cleanJsonResponse(response);
  },
  generateQuiz: async (content) => {
    const documentText = content || "";
    const quizPrompt = `
Generate exactly 5 multiple choice questions from this content.

Return ONLY valid JSON array:
[
  {
    "question": "Question here?",
    "options": {
      "a": "Option A",
      "b": "Option B",
      "c": "Option C",
      "d": "Option D"
    },
    "answer": "a"
  }
]

Content:
${documentText.slice(0, 5000)}
`;

    try {
      console.log("[Ollama] Generating quiz...");
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: OLLAMA_MODEL || "llama3",
        prompt: quizPrompt,
        stream: false
      }, { timeout: 120000 });

      const aiText = response.data.response;
      
      let questions;
      try {
        // Try direct parse first
        questions = JSON.parse(aiText);
      } catch (e) {
        console.warn("[Ollama] Direct JSON parse failed, trying regex extraction...");
        // Regex to extract JSON array
        const jsonMatch = aiText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          try {
            questions = JSON.parse(jsonMatch[0]);
          } catch (reParseError) {
            console.error("[Ollama] Regex extraction parse failed:", reParseError.message);
            throw new Error("Invalid JSON format from AI");
          }
        } else {
          console.error("[Ollama] No JSON array found in response");
          console.error("RAW AI OUTPUT:", aiText);
          throw new Error("No valid JSON found in AI response");
        }
      }

      if (!Array.isArray(questions)) {
        throw new Error("AI response is not a JSON array");
      }

      return questions;

    } catch (error) {
      console.error("OLLAMA ERROR:", error.message);
      if (error.response) {
        console.error("OLLAMA STATUS:", error.response.status);
        console.error("OLLAMA DATA:", error.response.data);
      }
      throw error; // Let controller handle fallback
    }
  },
  generateStudyPlan: async (content, weeks = 4) => {
    const limitedContent = content.substring(0, 5000);
    const prompt = `Create a ${weeks}-week study plan. Return ONLY JSON structure:
    {
      "title": "Plan Title",
      "weeks": [
        {
          "weekNumber": 1,
          "days": [{ "day": 1, "task": "description" }]
        }
      ]
    }
    Each week must have 5 days. Text: ${limitedContent}`;
    
    const response = await generateResponse(prompt, 'Study coordinator. JSON output only.');
    return cleanJsonResponse(response);
  },
  chatWithDocument: async (query, context) => {
    const limitedContext = context.substring(0, 5000);
    const prompt = `Context: ${limitedContext}\n\nQuestion: ${query}`;
    return await generateResponse(prompt, 'Answer based on context.');
  },
  chatWithDocumentStream: async (query, context, res) => {
    try {
      const limitedContext = context.substring(0, 5000);
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt: `Context: ${limitedContext}\n\nQuestion: ${query}`,
        stream: true
      }, { responseType: 'stream', timeout: 120000 });

      response.data.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) res.write(`data: ${JSON.stringify({ text: json.response })}\n\n`);
            if (json.done) {
              res.write('data: [DONE]\n\n');
              res.end();
            }
          } catch (e) {}
        }
      });
    } catch (error) {
      console.error('[Ollama Stream Error]', error.message);
      res.write(`data: ${JSON.stringify({ error: 'AI unavailable' })}\n\n`);
      res.end();
    }
  },
  extractKeywords: async (content) => {
    const limitedContent = content.substring(0, 5000);
    const prompt = `Extract 10 terms. Output ONLY a JSON array: [{"word": "string", "definition": "string"}]. Text: ${limitedContent}`;
    const response = await generateResponse(prompt, 'JSON only.');
    return cleanJsonResponse(response);
  }
};
