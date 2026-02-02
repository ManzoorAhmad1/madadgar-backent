import dotenv from 'dotenv';
import express from 'express';


dotenv.config();


const app = express();

app.listen(8000, () => {
  const serverMessage = `Server started on port ${PORT}`;
  const separator = '-'.repeat(serverMessage.length);

  console.log(`${blueBg}${separator}${reset}`);
  console.log(`${greenBg}${serverMessage}${reset}`);
  console.log(`${blueBg}${separator}${reset}`);
});
// یہ بھی شامل کریں
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});



