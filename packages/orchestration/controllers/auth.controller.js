const jwt = require('jsonwebtoken');

const { logger } = require('../utils/logger');
const { User } = require('../database/active-database/models');

const decodeToken = async (token) => {
  return await jwt.verify(token, process.env.TOKEN_SECRET);
};

const generateToken = (userId) => {
  return jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      data: {
        id: userId,
      },
    },
    process.env.TOKEN_SECRET,
  );
};

const authMiddleware = async (req, res, next) => {
  //logger.info(`In VerifyApiToken middleware: req.url: ${req.originalUrl}`);

  try {
    const tokenData = await decodeToken(
      req.headers.authorization.split(' ')[1],
    );
    //logger.info(`tokenData: ${JSON.stringify(tokenData.data.id)}`);
    req.tokenData = tokenData.data;
    if (req.tokenData) {
      next();
    } else {
      return res.status(401).json({ msg: 'forbidden' });
    }
  } catch (e) {
    console.error(e);
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }
};

const isAdmin = async (req, res, next) => {
  if (!req.tokenData.id) {
    return res.status(401).json({ error: 'forbidden - no id' });
  }
  try {
    const user = await User.findOne({
      attributes: [
        'id',
        'role',
        'firstname',
        'lastname',
        'active',
        'verificationCode',
      ],
      where: {
        id: req.tokenData.id,
      },
    });
    if (user && user.role === 'admin') {
      logger.info(`${req.tokenData.id} is an admin`);
      next();
    } else {
      return res.status(401).json({ error: 'forbidden' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'unable to check role' });
  }
};

module.exports = {
  authMiddleware,
  generateToken,
  isAdmin,
};
