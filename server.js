import express from 'express';

// Initialize Express app
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});


// Error Handler

// Initialize server - Use PORT from environment (Hostinger/Passenger sets this)
const PORT =  8080;

app.listen(PORT ?? 8000, () => {
console.log(`Server running on port ${PORT}`)
});
