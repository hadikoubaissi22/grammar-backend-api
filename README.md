# Grammar Backend API

A robust Node.js backend API designed for teachers to manage educational content. This system allows instructors to organize courses, upload course imagery, manage classes, and administer quizzes (questions & answers) within a secure environment.

## 🚀 Features

### 🔐 Authentication & Security
* **Secure Teacher Login:** JWT-based authentication for stateless and secure sessions.
* **Account Verification:** Email verification flow to ensure valid user registration.
* **Password Hashing:** Uses bcrypt to securely hash passwords before storage.

### 📚 Course Management
* **CRUD Operations:** Create, Read, Update, and Delete courses.
* **Media Support:** Upload and associate thumbnail images with courses.
* **Content Organization:** Structure educational material efficiently.

### 🏫 Class Management
* **Class Grouping:** Create and manage distinct classes or student groups.
* **Course Assignment:** Assign specific courses to relevant classes.

### ❓ Quiz System (Q&A)
* **Question Bank:** Add multiple-choice or text-based questions to courses.
* **Answer Management:** Define correct answers and feedback logic.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose)
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs
* **File Uploads:** Multer
* **Validation:** Joi / express-validator
* **Environment:** Dotenv

---

## ⚙️ Installation & Setup

Follow these steps to set up the project locally.

### 1. Clone the Repository

git clone https://github.com/hadikoubaissi22/grammar-backend-api.git
cd grammar-backend-api

### 2. Install Dependencies
npm install

### 3. Start the Server
npm run dev
