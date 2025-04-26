# WhatsApp Financial Assistant Bot

A comprehensive financial management system with WhatsApp bot integration, user dashboard, and admin panel.

## Features

### WhatsApp Bot
- Natural Language Processing (NLP) for understanding informal Bahasa Indonesia
- Transaction recording (income/expense)
- Budget management and notifications
- Financial reports generation
- Transaction history viewing
- PDF report export
- User activation system

### User Dashboard
- Real-time financial overview
- Transaction management
- Budget setting and tracking
- Detailed financial reports
- PDF export functionality
- Mobile-responsive design

### Admin Panel
- User management
- Activation code generation
- Subscription management
- WhatsApp bot status monitoring
- System backup/restore
- Transaction monitoring
- Two-factor authentication

## Tech Stack

- **Backend**
  - Node.js + Express.js
  - MongoDB + Mongoose
  - WhatsApp Web.js
  - Natural NLP
  - JWT Authentication
  - Socket.io

- **Frontend & Admin Panel**
  - React.js
  - Tailwind CSS
  - Chart.js
  - React Router
  - Axios
  - React Toastify

## Setup Instructions

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd whatsapp-financial-bot
\`\`\`

2. Install dependencies:
\`\`\`bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install admin panel dependencies
cd ../admin
npm install
\`\`\`

3. Configure environment variables:
\`\`\`bash
# Backend (.env)
PORT=3000
MONGODB_URI=mongodb://localhost:27017/whatsapp-financial-bot
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3000

# Admin (.env)
REACT_APP_API_URL=http://localhost:3000
\`\`\`

4. Start the development servers:
\`\`\`bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm start

# Start admin panel
cd admin
npm start
\`\`\`

## Project Structure

\`\`\`
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── utils/
└── admin/
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        ├── services/
        └── utils/
\`\`\`

## API Documentation

### Authentication
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/admin/auth/login
- POST /api/admin/auth/verify-2fa

### User Management
- GET /api/admin/users
- POST /api/admin/users
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- POST /api/admin/users/generate-activation

### Transactions
- GET /api/transactions
- POST /api/transactions
- PUT /api/transactions/:id
- DELETE /api/transactions/:id

### Budget
- GET /api/budgets
- POST /api/budgets
- PUT /api/budgets/:id
- DELETE /api/budgets/:id

### Reports
- GET /api/reports
- GET /api/reports/export

## Security Features

- JWT Authentication
- Two-Factor Authentication
- Password Hashing
- Rate Limiting
- Input Validation
- XSS Protection
- CSRF Protection
- Session Management

## WhatsApp Bot Commands

1. Transaction Recording:
   - "catat pengeluaran 50rb makan siang"
   - "catat pemasukan 5jt gaji"

2. View Reports:
   - "lihat laporan"
   - "laporan bulanan"
   - "laporan minggu ini"

3. Check Budget:
   - "cek budget"
   - "sisa anggaran"

4. Transaction History:
   - "riwayat transaksi"
   - "transaksi terakhir"

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- WhatsApp Web.js for WhatsApp integration
- Natural NLP for language processing
- Chart.js for beautiful charts
- Tailwind CSS for styling
