const OpenAI = require('openai');

// Lazy initialization - only create client when needed
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
};

const generateIssue = async (category = 'pengasuhan') => {
  const categories = {
    pengasuhan: 'pengasuhan anak, perkembangan anak, tips parenting',
    kesehatan: 'kesehatan ibu dan anak, nutrisi, imunisasi',
    nutrisi: 'makanan sehat, MPASI, nutrisi anak',
    pengalaman: 'pengalaman sehari-hari, tips praktis, sharing'
  };
  
  const categoryKeywords = categories[category] || categories.pengasuhan;
  
  const prompt = `Generate topik diskusi yang relevan untuk komunitas ibu-ibu Indonesia. Topik harus tentang ${categoryKeywords}. Berikan 1 topik dengan format:
Title: [Judul topik]
Description: [Deskripsi singkat topik dalam 1-2 kalimat]

Pastikan topik menarik, relevan, dan memicu diskusi yang bermakna.`;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates discussion topics for Indonesian mothers community.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    });
    
    const response = completion.choices[0].message.content;
    
    // Parse response
    const titleMatch = response.match(/Title:\s*(.+)/i);
    const descMatch = response.match(/Description:\s*(.+)/i);
    
    return {
      title: titleMatch ? titleMatch[1].trim() : 'Topik Diskusi Baru',
      description: descMatch ? descMatch[1].trim() : ''
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    // Provide more detailed error message
    if (error.message && error.message.includes('API key')) {
      throw new Error('OPENAI_API_KEY tidak valid atau tidak di-set. Silakan cek konfigurasi .env');
    }
    throw new Error(`Failed to generate issue: ${error.message || 'Unknown error'}`);
  }
};

const generateRoomContent = async () => {
  const prompt = `Generate konten untuk room chat komunitas ibu-ibu Indonesia. Berikan 3 hal:
Title: [Judul room yang menarik]
Description: [Deskripsi singkat room dalam 2-3 kalimat]
Topic: [Topik diskusi yang relevan dan menarik]

Pastikan konten menarik, relevan untuk komunitas ibu-ibu, dan memicu diskusi yang bermakna.`;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates room content for Indonesian mothers community.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });
    
    const response = completion.choices[0].message.content;
    
    // Parse response
    const titleMatch = response.match(/Title:\s*(.+)/i);
    const descMatch = response.match(/Description:\s*(.+)/i);
    const topicMatch = response.match(/Topic:\s*(.+)/i);
    
    return {
      name: titleMatch ? titleMatch[1].trim() : 'Room Baru',
      description: descMatch ? descMatch[1].trim() : '',
      topic: topicMatch ? topicMatch[1].trim() : 'Diskusi Umum'
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    if (error.message && error.message.includes('API key')) {
      throw new Error('OPENAI_API_KEY tidak valid atau tidak di-set. Silakan cek konfigurasi .env');
    }
    throw new Error(`Failed to generate room content: ${error.message || 'Unknown error'}`);
  }
};

const generateOpeningMessage = async (roomName, roomTopic, roomDescription) => {
  const prompt = `Generate pesan pembuka chat yang ramah dan menarik untuk room chat komunitas ibu-ibu Indonesia. 
Room ini bernama: "${roomName}"
Topik diskusi: "${roomTopic}"
Deskripsi: "${roomDescription}"

Buat pesan pembuka yang:
- Menyambut anggota dengan hangat
- Menjelaskan topik diskusi dengan singkat
- Mengajak anggota untuk berpartisipasi
- Menggunakan bahasa Indonesia yang ramah dan tidak terlalu formal
- Maksimal 3-4 kalimat

Hanya berikan pesan saja, tanpa format tambahan.`;

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates opening messages for Indonesian mothers community chat rooms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    });
    
    const message = completion.choices[0].message.content.trim();
    return message;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    if (error.message && error.message.includes('API key')) {
      throw new Error('OPENAI_API_KEY tidak valid atau tidak di-set. Silakan cek konfigurasi .env');
    }
    // Return default message if AI generation fails
    return `Selamat datang di ${roomName}! Mari kita diskusikan tentang ${roomTopic}. Silakan bagikan pengalaman dan pendapat Anda.`;
  }
};

module.exports = {
  generateIssue,
  generateRoomContent,
  generateOpeningMessage
};

