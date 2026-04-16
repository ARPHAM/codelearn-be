import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'GOOGLE_GENERATIVE_AI_API_KEY',
    );
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured in .env');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
    });
  }

  async chat(dto: ChatDto) {
    const { messages, codeContext, problemContext } = dto;

    try {
      // Xây dựng System Prompt (Logic được chuyển từ Frontend)
      const systemPrompt = `
Bạn là một trợ lý lập trình thông minh trên nền tảng CodeLearn. 
Nhiệm vụ của bạn là hỗ trợ sinh viên giải quyết các bài tập lập trình một cách sư phạm.

VỀ NGÔN NGỮ:
- Bạn phải trả lời bằng cùng ngôn ngữ mà người dùng đang sử dụng để đặt câu hỏi (Ưu tiên hàng đầu).

VỀ NGỮ CẢNH BÀI TẬP:
- Đề bài: ${JSON.stringify(problemContext?.title || 'Chưa rõ')}
- Mô tả: ${JSON.stringify(problemContext?.description || 'Chưa rõ')}
- Code hiện tại của sinh viên:
\`\`\`
${codeContext || 'Chưa có code'}
\`\`\`

VỀ PHONG CÁCH HỖ TRỢ:
- Đừng bao giờ cung cấp lời giải hoàn chỉnh ngay lập tức trừ khi được yêu cầu rõ ràng.
- Hãy gợi ý, giải thích lỗi, và hướng dẫn từng bước để sinh viên tự tư duy.
- Phân tích lỗi logic hoặc lỗi cú pháp nếu có trong code của họ.
- Nếu sinh viên hỏi ngoài lề không liên quan đến lập trình hoặc bài tập, hãy nhắc nhở họ tập trung vào việc học.
`;

      // Chuyển đổi lịch sử chat sang định dạng Gemini
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [
            {
              text: 'Tôi đã hiểu ngữ cảnh và phong cách hỗ trợ. Tôi đã sẵn sàng trợ giúp bạn!',
            },
          ],
        },
        ...messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.msg || m.content || '' }],
        })),
      ];

      const result = await this.model.generateContent({
        contents: contents as any,
      });

      const response = await result.response;
      const text = response.text();

      return { text };
    } catch (error) {
      this.logger.error('--- AI Service Error ---', error);
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi kết nối với dịch vụ AI',
      );
    }
  }

  async generateLearningPath(userContext: {
    solvedTags: string[];
    preferredLanguages: string[];
    currentLevel: number;
    fullName: string;
  }) {
    const prompt = `
      Bạn là một chuyên gia giáo dục lập trình. Hãy thiết kế một lộ trình học tập cá nhân hóa (Skill Tree) cho sinh viên ${userContext.fullName}.
      Thông tin sinh viên:
      - Các mảng kiến thức đã giải: ${userContext.solvedTags.join(', ') || 'Chưa có'}
      - Ngôn ngữ yêu thích: ${userContext.preferredLanguages.join(', ')}
      - Trình độ hiện tại: ${userContext.currentLevel} (1: Bắt đầu, 5: Chuyên gia)

      Yêu cầu:
      - Đề xuất từ 5 đến 15 node (kỹ năng) theo cấu trúc cây (parent-child).
      - Mỗi node cần có: title, tag (tiếng Anh, viết thường, vd: arrays, linked-list), difficulty (EASY, MEDIUM, HARD), position (x, y coordinates từ 0 đến 500).
      - Trả về kết quả DƯỚI DẠNG JSON MẢNG DUY NHẤT.

      Cấu trúc JSON mong muốn:
      [
        {
          "tempId": "node-1",
          "parentId": null,
          "title": "Cấu trúc dữ liệu mảng",
          "tag": "arrays",
          "difficulty": "EASY",
          "position": { "x": 250, "y": 50 }
        },
        ...
      ]
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse AI response as JSON');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error('Error generating learning path', error);
      throw error;
    }
  }

  async getSuggestions(userContext: { solvedTags: string[] }) {
    const prompt = `Dựa trên các kỹ năng sinh viên đang học: ${userContext.solvedTags.join(', ')}. Hãy gợi ý 3 mảng kiến thức tiếp theo sinh viên nên luyện tập. Trả về mảng string JSON.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
      this.logger.error('Error getting suggestions', error);
      return [];
    }
  }

  async getAiHint(dto: {
    userCode: string;
    question: string;
    language: string;
    exerciseTitle?: string;
  }) {
    const prompt = `
      Bạn là một trợ lý giảng dạy lập trình thông minh. 
      Sinh viên đang gặp khó khăn khi làm bài "${dto.exerciseTitle || 'Bài tập lập trình'}".
      
      Yêu cầu của đề bài: ${dto.question}
      Ngôn ngữ: ${dto.language}
      Mã nguồn hiện tại của sinh viên:
      \`\`\`${dto.language}
      ${dto.userCode}
      \`\`\`

      Hãy đưa ra 3 phần hỗ trợ:
      1. Phân tích vấn đề: Giải thích ngắn gọn tại sao code của sinh viên chưa hoạt động hoặc có thể cải thiện ở đâu.
      2. Gợi ý hướng giải (Hint): Đưa ra các bước tư duy hoặc gợi ý thuật toán, KHÔNG ĐƯA RA CODE GIẢI CHI TIẾT.
      3. Câu hỏi gợi mở: Đặt một câu hỏi giúp sinh viên tự tìm ra lời giải.

      Trả về kết quả dưới định dạng JSON:
      {
        "analysis": "...",
        "hint": "...",
        "followUp": "..."
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { analysis: text, hint: '', followUp: '' };
    } catch (error) {
      this.logger.error('Error getting AI hint', error);
      return { hint: 'Không thể kết nối với AI vào lúc này.' };
    }
  }
}
