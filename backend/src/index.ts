import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/at-command', (req, res) => {
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ success: false, message: 'Command is required' });
  }

  const scriptPath = `${__dirname}/../scripts/send_at.sh`;
  exec(`${scriptPath} "${command}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error}`);
      return res.json({ success: false, message: stderr || error.message });
    }
    const output = stdout || stderr;
    res.json({
      success: !error && !stderr,
      message: output.trim()
    });
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});