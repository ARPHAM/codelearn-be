# CodeLearn Backend

Hệ thống Backend mạnh mẽ cho nền tảng học lập trình trực tuyến **CodeLearn**, được xây dựng trên nền tảng **NestJS**.

## 🚀 Giới thiệu

CodeLearn là một nền tảng giáo dục lập trình toàn diện, hỗ trợ từ việc học cơ bản đến các cuộc thi lập trình (Code Battle) và quản lý kỳ thi. Backend cung cấp các API hiệu suất cao, khả năng xử lý mã nguồn an toàn và tích hợp trí tuệ nhân tạo.

## ✨ Tính năng chính

- **Quản lý học tập**: Khóa học (Course), Lộ trình học (Learning Path), Bài tập (Exercise) và Kỳ thi (Exam).
- **Thực thi mã nguồn (Execution)**: Hệ thống chạy code trực tuyến hỗ trợ nhiều ngôn ngữ.
- **Code Battle & Room**: Chế độ thi đấu lập trình thời gian thực giữa các người dùng qua Socket.io.
- **AI Integration**: Tích hợp Google Gemini AI để hỗ trợ giải thích code, gợi ý lời giải.
- **Plagiarism Detection**: Kiểm tra đạo văn trong các bài nộp của sinh viên.
- **Leaderboard & Analytics**: Thống kê hiệu suất và bảng xếp hạng người dùng.
- **Real-time Notifications**: Thông báo tức thời về kết quả bài nộp, lời mời thi đấu.
- **Workspace Management**: Quản lý không gian làm việc và môi trường lập trình.

## 🛠 Công nghệ sử dụng

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Database**: [PostgreSQL](https://www.postgresql.org/) với [TypeORM](https://typeorm.io/)
- **Cache & Queue**: [Redis](https://redis.io/) & [Bull](https://github.com/OptimalBits/bull)
- **Real-time**: [Socket.io](https://socket.io/)
- **Authentication**: JWT, Passport.js
- **API Documentation**: [Swagger](https://swagger.io/)
- **AI**: Google Generative AI (Gemini)

## 📋 Yêu cầu hệ thống

- Node.js (v18 trở lên)
- PostgreSQL
- Redis

## ⚙️ Cài đặt

1. Clone repository:
   ```bash
   git clone <repository-url>
   cd codelearn-be
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường:
   - Sao chép file `.env.example` thành `.env`.
   - Cập nhật các thông tin kết nối Database, Redis, và API Key (Gemini, JWT secret...).

4. Chạy Migration:
   ```bash
   npm run migration:run
   ```

## 🚀 Chạy ứng dụng

```bash
# Chế độ phát triển (Watch mode)
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

API documentation sẽ có sẵn tại: `http://localhost:3000/api/docs` (tùy thuộc vào cấu hình PORT).

## 📁 Cấu trúc thư mục

- `src/modules`: Chứa các module chức năng của hệ thống (Auth, User, Course, Exam, Battle, Execution...).
- `src/common`: Các decorator, interceptor, filter dùng chung.
- `src/config`: Cấu hình hệ thống.
- `src/migrations`: Các file migration cơ sở dữ liệu.
- `src/shared`: Các service hoặc provider dùng chung giữa các module.

## 📄 License

Project này được cấp giấy phép **UNLICENSED**.
