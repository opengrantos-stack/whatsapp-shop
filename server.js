const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.listen(port, () => {
    console.log('Servidor a rodar em http://localhost:' + port);
});
