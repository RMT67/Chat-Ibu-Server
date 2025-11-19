const OpenAI = require('openai');

// Configuration
const API_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 2;

// Rate limiting storage
const rateLimitMap = new Map();
const RATE_LIMIT = {
  GENERATE_CONTENT: { max: 5, window: 60000 }, // 5 requests per minute per user
  GENERATE_MESSAGE: { max: 10, window: 60000 } // 10 requests per minute per user
};

// Helper function untuk rate limiting
const checkRateLimit = (userId, type) => {
  const now = Date.now();
  const key = `${userId}:${type}`;
  const limit = RATE_LIMIT[type];
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }
  
  const record = rateLimitMap.get(key);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + limit.window;
    return true;
  }
  
  if (record.count >= limit.max) {
    return false;
  }
  
  record.count++;
  return true;
};

// Helper function untuk timeout promise
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

// Helper function untuk sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  // Remove potentially dangerous characters and trim
  return input.replace(/[<>]/g, '').trim().substring(0, 500);
};

// Helper function untuk robust parsing
const parseResponse = (response, format) => {
  if (!response || typeof response !== 'string') {
    return null;
  }
  
  const result = {};
  const lines = response.split('\n');
  
  for (const [key, pattern] of Object.entries(format)) {
    // Try multiple patterns
    const patterns = [
      new RegExp(`${pattern}:\\s*(.+?)(?=\\n|$)`, 'i'),
      new RegExp(`${pattern}:\\s*(.+)`, 'i'),
      new RegExp(`^${pattern}:\\s*(.+)`, 'im')
    ];
    
    let match = null;
    for (const regex of patterns) {
      match = response.match(regex);
      if (match) break;
    }
    
    if (match && match[1]) {
      result[key] = match[1].trim();
    }
  }
  
  return result;
};

// Lazy initialization - only create client when needed
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    // Validate API key format
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OPENAI_API_KEY format');
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: API_TIMEOUT,
      maxRetries: MAX_RETRIES
    });
  }
  return openai;
};

const generateRoomContent = async (userId = null) => {
  // Rate limiting
  if (userId && !checkRateLimit(userId, 'GENERATE_CONTENT')) {
    throw new Error('Too many requests. Please wait before generating again.');
  }
  
  const prompt = `Generate konten untuk room chat komunitas ibu-ibu Indonesia. Berikan 3 hal dengan format yang jelas:
Title: [Judul room yang menarik]
Description: [Deskripsi singkat room dalam 2-3 kalimat]
Topic: [Topik diskusi yang relevan dan menarik]

Pastikan konten menarik, relevan untuk komunitas ibu-ibu, dan memicu diskusi yang bermakna.`;

  try {
    const client = getOpenAIClient();
    
    const completionPromise = client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates room content for Indonesian mothers community. Always respond in the exact format requested: Title, Description, Topic.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });
    
    const completion = await withTimeout(completionPromise, API_TIMEOUT);
    
    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const response = completion.choices[0].message.content;
    
    // Robust parsing
    const parsed = parseResponse(response, {
      name: 'Title',
      description: 'Description',
      topic: 'Topic'
    });
    
    // Return with fallback values
    return {
      name: parsed?.name || 'Room Diskusi Ibu-Ibu',
      description: parsed?.description || 'Tempat diskusi yang nyaman untuk berbagi pengalaman dan tips',
      topic: parsed?.topic || 'Diskusi Umum'
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Provide fallback instead of throwing error
    return {
      name: 'Room Diskusi Ibu-Ibu',
      description: 'Tempat diskusi yang nyaman untuk berbagi pengalaman dan tips',
      topic: 'Diskusi Umum'
    };
  }
};

const generateOpeningMessage = async (roomName, roomTopic, roomDescription, userId = null) => {
  // Rate limiting
  if (userId && !checkRateLimit(userId, 'GENERATE_MESSAGE')) {
    // Return fallback instead of throwing error for better UX
    return `Selamat datang di ${sanitizeInput(roomName)}! Mari kita diskusikan tentang ${sanitizeInput(roomTopic)}. Silakan bagikan pengalaman dan pendapat Anda.`;
  }
  
  // Sanitize inputs
  const safeRoomName = sanitizeInput(roomName || 'Room');
  const safeRoomTopic = sanitizeInput(roomTopic || 'Diskusi Umum');
  const safeRoomDescription = sanitizeInput(roomDescription || '');
  
  const prompt = `Generate pesan pembuka chat yang ramah dan menarik untuk room chat komunitas ibu-ibu Indonesia. 
Room ini bernama: "${safeRoomName}"
Topik diskusi: "${safeRoomTopic}"
Deskripsi: "${safeRoomDescription}"

Buat pesan pembuka yang:
- Menyambut anggota dengan hangat
- Menjelaskan topik diskusi dengan singkat
- Mengajak anggota untuk berpartisipasi
- Menggunakan bahasa Indonesia yang ramah dan tidak terlalu formal
- Maksimal 3-4 kalimat

Hanya berikan pesan saja, tanpa format tambahan, tanpa prefix, tanpa markdown.`;

  try {
    const client = getOpenAIClient();
    
    const completionPromise = client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates opening messages for Indonesian mothers community chat rooms. Always respond with only the message text, no formatting, no prefixes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    });
    
    const completion = await withTimeout(completionPromise, API_TIMEOUT);
    
    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    let message = completion.choices[0].message.content.trim();
    
    // Clean up message (remove markdown, extra formatting)
    message = message.replace(/^["']|["']$/g, ''); // Remove quotes
    message = message.replace(/\*\*/g, ''); // Remove markdown bold
    message = message.replace(/\*/g, ''); // Remove markdown italic
    message = message.trim();
    
    // Validate message length
    if (message.length === 0 || message.length > 500) {
      throw new Error('Invalid message length');
    }
    
    return message;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    // Return default message if AI generation fails
    return `Selamat datang di ${safeRoomName}! Mari kita diskusikan tentang ${safeRoomTopic}. Silakan bagikan pengalaman dan pendapat Anda.`;
  }
};

// Clean up rate limiting map periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const keysToDelete = [];
  
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 60000) { // Keep for 1 minute after expiry
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => rateLimitMap.delete(key));
}, 300000); // Every 5 minutes

module.exports = {
  generateRoomContent,
  generateOpeningMessage
};
