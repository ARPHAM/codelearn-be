import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY không tồn tại trong .env');
    return;
  }

  console.log('🔍 Đang kiểm tra danh sách model khả dụng...');
  
  // Lưu ý: SDK JS không có phương thức listModels trực tiếp theo cách đơn giản
  // Chúng ta sẽ dùng fetch để gọi thẳng REST API của Google
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Lỗi từ Google:', data.error.message);
      return;
    }

    console.log('✅ Các model bạn có thể sử dụng:');
    if (data.models) {
      data.models.forEach((m: any) => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
        }
      });
    } else {
      console.log('Không tìm thấy model nào.');
    }
  } catch (error) {
    console.error('❌ Lỗi kết nối:', error);
  }
}

listModels();
