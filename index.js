const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Hello, Cloud Run!');
});
app.get('/hello', (req, res) => {
    res.send('Hello, Cloud Run! hello boy');
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
