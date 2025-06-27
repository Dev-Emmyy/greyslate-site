require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.headers['content-type']);
  next();
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GM_USER,
    pass: process.env.GM_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Email config error:', error);
  } else {
    console.log('Email server is ready');
  }
});

// Google Sheets setup
const credentials = require("./google-credentials.json");
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function appendToSheet({ name, email, phone, address, message }) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Sheet1!A:F", // Change sheet name or range if needed
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        new Date().toLocaleString(),
        name,
        phone,
        email,
        address || 'Not provided',
        message || 'No reason provided',
      ]],
    },
  });

  console.log("Spreadsheet updated:", response.statusText);
}

// Form submission route
app.post("/submit-form", async (req, res) => {
  try {
    const name = req.body["contact-name-2"];
    const email = req.body["contact-email-2"];
    const phone = req.body["contact-phone-2"];
    const address = req.body["geocoder-contact-address-2"];
    const message = req.body["contact-message-2"];

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields."
      });
    }

    const mailOptions = {
      from: process.env.GM_USER,
      replyTo: email,
      to: "office@clearskyservices.co",
      subject: `🚨 New Seller Lead Submitted – [${name}, ${address || 'Location Not Provided'}]`,
      html: `
        <h3>🚨 New Seller Lead Submitted</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Property Address:</strong> ${address || 'Not provided'}</p>
        <p><strong>Reason for Selling:</strong> "${message || 'No reason provided'}"</p>
      `,
      text: `
        🚨 New Seller Lead Submitted – [${name}, ${address || 'Location Not Provided'}]
        Name: ${name}
        Phone: ${phone}
        Email: ${email}
        Property Address: ${address || 'Not provided'}
        Reason for Selling: "${message || 'No reason provided'}"
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);

    // Append to spreadsheet
    await appendToSheet({ name, email, phone, address, message });

    res.status(200).json({
      success: true,
      message: "Thank you! Your submission has been received!"
    });

  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
