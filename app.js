// const express = require('express')
// const app = express()
// const routes = require('./routes/routes')

// app.use(express.json())

// app.use(routes)

// app.listen(8000,()=>console.log('started on 8000'))

import express from 'express';
import routes from './routes/routes.js'; // note the .js extension in ESM

const app = express();

app.use(express.json());
app.use(routes);

app.listen(8000, () => console.log('Server started on port 8000'));