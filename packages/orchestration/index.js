import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
console.log('Orchestration process env', process.env);
import express from 'express';
import cors from 'cors';
import { connect } from '@packages/database/lib/connection.js';
import { publicUserRoutes, securedUserRoutes } from './controllers/user.controller.js';
console.log(process.env);

const app = express();

connect();

const whitelist = [
  'https://peachhealth.ai',
];
const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      // console.log('Development, pass cors preflight check');
      callback(null, {
        origin: true,
      });
    } else if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,PUT,POST,DELETE',
};

app.use(cors(corsOptions));
const router = express.Router();
const { PORT } = process.env;
router.use('/public/user', publicUserRoutes);
router.use('/user', securedUserRoutes);
app.use('/peachapi', router);

app.use((req, res, next) => {
  // console.log('REQUEST RECEIVED:', req.method, req.url);
  res.on('finish', () => {
    console.log(
      res.statusCode,
      res.statusMessage,
      res.req.method,
      res.req.originalUrl,
    );
  });
  next();
});

app.listen(PORT, (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.log('NODE_ENV is production. Running the prod configuration');
  }
  if (err) throw err;
  console.log(`> Ready on port ${PORT}!`);
});

app.get('/', (req, res) => {
  let endpoints = recurse('', app._router);
  res.json([`hello world\n${process.env.SALT_ROUNDS}\n`, endpoints]);
});

const gracefulShutdown = async () => {
  try {
    //await database.close();
    //await nodeApp.close();
    await database.connection.close();
  } catch (error) {
    console.log('error shutting down gracefully: ', error);
  }
};

// ctrl+c exit
process.on('SIGINT', async () => {
  console.log('ctrl c !');
  await gracefulShutdown();
  process.exit();
});

// nodemon restarts
process.on('SIGHUP', async () => {
  console.log('sighup signal!!');
  await gracefulShutdown();
  process.exit();
});