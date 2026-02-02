import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Test server on port ${PORT}`);
});

export default app;
