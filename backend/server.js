const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
    .connect('mongodb://127.0.0.1:27017/userDB', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Could not connect to MongoDB:', err);
        process.exit(1);  // Exit process if MongoDB connection fails
    });

// Mongoose Schema and Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fileData: { type: Object, required: true },
    filePath: { type: String, required: true }, // Store the path of the uploaded file
});

const User = mongoose.model('User', userSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.access(uploadDir, fs.constants.F_OK, (err) => {
            if (err) {
                fs.mkdir(uploadDir, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating uploads folder:', err);
                    }
                });
            }
        });
        cb(null, uploadDir);  // Save to the uploads folder
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Generate a unique filename
    },
});

const upload = multer({ storage });

// Helper function to calculate CIBIL score
const calculateCibilScore = (fileData) => {
    let score = 650; // Default score
    if (fileData && fileData.loanHistory) {
        fileData.loanHistory.forEach((loan) => {
            if (loan.status === 'paid') {
                score += 5; // Add points for paid loans
            }
        });
    }
    return Math.min(score, 850); // Ensure the score does not exceed 850
};

// Helper function to delete files
const removeFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        console.log(`File removed: ${filePath}`);
    } catch (err) {
        console.error(`Error deleting file: ${filePath}`, err);
    }
};

// Register endpoint
app.post('/register', upload.single('file'), async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password || !req.file) {
        return res.status(400).json({ message: 'All fields and a file are required.' });
    }

    try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Extract JSON data from the uploaded file
        const filePath = req.file.path;
        const fileData = await fs.readFile(filePath, 'utf8');
        let jsonData;

        try {
            jsonData = JSON.parse(fileData); // Assuming file contains valid JSON data
        } catch (err) {
            return res.status(400).json({ message: 'Invalid file format. Please upload a valid JSON file.' });
        }

        // Make a copy of the uploaded file
        const copiedFilePath = path.join(__dirname, 'uploads', `copy-${req.file.filename}`);
        await fs.copyFile(filePath, copiedFilePath); // Copy the file

        // Save user to the database
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            fileData: jsonData, // Store the relevant file data (loan history, etc.)
            filePath: copiedFilePath, // Store the path of the copied file
        });

        await newUser.save();

        // Remove the original file after processing
        await removeFile(filePath);

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error during registration:', err);

        // Remove the file if an error occurs during processing
        if (req.file && req.file.path) {
            await removeFile(req.file.path);
        }

        // Handle duplicate key error
        if (err.code === 11000) { // Duplicate key error (for username or email)
            return res.status(400).json({ message: 'Username or email already exists.' });
        }

        res.status(500).json({ message: 'Error registering user' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
      const user = await User.findOne({ username });
      if (!user) {
          return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // Extract financial info and loan history
      const fileData = user.fileData;

      const financialInfo = {
          MonthlyIncome: fileData.MonthlyIncome,
          MonthlyExpend: fileData.MonthlyExpend,
          LoanRequest: fileData.LoanRequest,
          OutstandingDebt: fileData.outstandingDebt,
          TotalAssets: fileData.totalAssets,
          TotalLiabilities: fileData.totalLiabilities,
      };

      const loanHistory = fileData.loanHistory;

      res.status(200).json({
          message: 'Login successful!',
          user: {
              username: user.username,
              email: user.email,
              financialInfo,
              loanHistory,
          },
      });
  } catch (err) {
      console.error('Error logging in:', err);
      res.status(500).json({ message: 'Error logging in.' });
  }
});

// Get user data along with calculated CIBIL score
app.get('/api/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate CIBIL score from the user's file data
        const cibilScore = calculateCibilScore(user.fileData);

        res.json({
            username: user.username,
            email: user.email,
            fileData: user.fileData,  // Send the relevant data (loan history, etc.)
            cibilScore,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
