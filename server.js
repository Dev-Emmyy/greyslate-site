require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

// Body parser middleware - increased limit and better configuration
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Add middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.headers['content-type']);
    next();
});

// Email transporter (CORRECTED: createTransport, not createTransporter)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GM_USER,
    pass: process.env.GM_PASS,
  },
});

// Test email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Form submission endpoint
app.post("/submit-form", async (req, res) => {
  try {
    console.log('Request Content-Type:', req.headers['content-type']);
    console.log('Raw form data received:', req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    // Handle case where req.body might be undefined
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('No form data received');
      return res.status(400).json({
        success: false,
        message: "No form data received."
      });
    }
    
    const name = req.body["contact-name-2"];
    const email = req.body["contact-email-2"];
    const phone = req.body["contact-phone-2"];
    const address = req.body["geocoder-contact-address-2"];
    const message = req.body["contact-message-2"];
    
    console.log('Parsed form data:', { name, email, phone, address, message });

    // Validate required fields
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
    console.log("Email sent successfully:", info.response);
    
    res.status(200).json({
      success: true,
      message: "Thank you! Your submission has been received!"
    });

  } catch (error) {
    console.error("Error processing form submission:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});