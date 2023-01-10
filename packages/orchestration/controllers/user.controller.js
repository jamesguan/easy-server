import bodyParser from 'body-parser';
import express from 'express';
import { Op } from 'sequelize';

import { User } from '@packages/database/lib/models/index.js';

/*
const { authMiddleware, generateToken } = require('./auth.controller');
const { User } = require('../database/active-database/models');
const { hashPassword } = require('../utils/password');

const {
  sendResetPasswordEmail,
  sendEndgameEmail,
} = require('../services/email.service');
const {
  createStripeCustomer,
  handleEndgameEmail,
  handleVerificationEmail,
} = require('../services/orchestration.service');
const { getExistingUsers, getUser } = require('../services/user.service');

const { logger } = require('../utils/logger');
*/

export const publicUserRoutes = express.Router();
publicUserRoutes.use(bodyParser.urlencoded({ extended: false }));
publicUserRoutes.use(bodyParser.json());

export const securedUserRoutes = express.Router();
securedUserRoutes.use(bodyParser.urlencoded({ extended: false }));
securedUserRoutes.use(bodyParser.json());
//securedUserRoutes.use(authMiddleware);

publicUserRoutes.post('/login', async (req, res) => {
  const body = req.body;
  const username = body.username;

  if (username && body.password) {
    try {
      const user = await User.findOne({
        attributes: ['id', 'active', 'phone', 'email', 'password', 'role'],
        where: {
          [Op.or]: [
            { phone: username },
            { email: username },
            { gamertag: username },
          ],
        },
      });

      if (user && (await user.isValidPassword(body.password))) {
        const token = generateToken(user.id);
        return res.status(200).json({
          verified: user.active,
          token,
          role: user.role,
        });
      } else {
        console.error('Invalid password');
        return res.status(401).json({
          error: 'Invalid password',
        });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).send({
        error: 'An error occurred while logging in',
      });
    }
  } else {
    return res.status(400).json({
      error: 'Invalid input',
    });
  }
});

/*
publicUserRoutes.post('/exists', async (req, res) => {
  const { email, gamertag, phone } = req.body;
  console.log('Phone', phone);
  let exists = {
    ...(email && { email: false }),
    ...(phone && { phone: false }),
    ...(gamertag && { gamertag: false }),
  };
  try {
    const users = await getExistingUsers({ email, gamertag, phone });
    users.map((value) => {
      if (value.email === email) {
        exists.email = true;
      }

      if (value.phone === phone) {
        exists.phone = true;
      }

      if (value.gamertag === gamertag) {
        exists.gamertag = true;
      }
    });
    return res.status(200).json(exists);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: e.message,
    });
  }
});
*/
publicUserRoutes.post('/register', async (req, res) => {
  // Needs transaction
  const body = req.body;
  if (
    body.firstname &&
    body.lastname &&
    body.gamertag &&
    body.password &&
    body.phone &&
    body.email
  ) {
    try {
      const user = await User.create({
        firstname: body.firstname,
        lastname: body.lastname,
        gamertag: body.gamertag,
        password: await hashPassword(body.password),
        phone: body.phone,
        email: body.email,
      });

      // Create customer
      try {
        await createStripeCustomer({ userId: user.id });
      } catch (e) {
        console.error(e);
        console.error(
          `Unable to create stripe customer for registering user ${user.id}`,
        );
      }

      await handleVerificationEmail({ userId: user.id });
      const token = generateToken(user.id);
      return res.status(200).json({
        token,
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        email: user.email,
        gamertag: user.gamertag,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).send(e);
    }
  } else {
    return res.status(400).json({
      error: 'Bad request',
    });
  }
});

securedUserRoutes.put('/account', async (req, res) => {
  const { email, firstname, gamertag, lastname } = req.body;
  const userId = req.tokenData.id;

  try {
    const user = await User.findOne({
      attributes: [
        'id',
        'active',
        'cardOnFile',
        'coin',
        'email',
        'firstname',
        'gamertag',
        'lastname',
        'phone',
      ],
      where: {
        id: userId,
      },
    });
    if (user) {
      const thingsToUpdate = {};

      if (email) {
        thingsToUpdate.email = email;
        thingsToUpdate.active = false;
        // We need to update stripe payment info as well
      }

      try {
        await user.update({
          ...(firstname && { firstname }),
          ...(gamertag && { gamertag }),
          ...(lastname && { lastname }),
          ...thingsToUpdate,
        });
        return res.status(200).json({
          active: user.active,
          cardOnFile: user.cardOnFile,
          coin: user.coin,
          email: user.email,
          firstname: user.firstname,
          fullname: user.getFullname(),
          gamertag: user.gamertag,
          lastname: user.lastname,
          phone: user.phone,
        });
      } catch (e) {
        console.error(e);
        return res.status(400).json({
          error: 'Cannot update user',
        });
      }
    } else {
      console.error('Unable to fetch user');
      return res.status(404).json({
        error: 'Unable to find user',
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(400).json({
      error: 'Cannot update user',
    });
  }
});

publicUserRoutes.get('/verify', async (req, res) => {
  const code = req.query.verificationCode;
  const user = await User.findOne({
    attributes: ['id', 'active', 'verificationCode'],
    where: {
      verificationCode: code,
    },
  });

  if (!user) {
    return res.status(404).json({
      error: 'Not found',
    });
  }

  if (user.active) {
    return res.status(500).json({
      error: 'Account already verified',
    });
  } else {
    try {
      await user.update({
        active: true,
      });
      if (user.active) {
        return res.status(200).json({
          active: user.active,
          verifiedEmail: true,
        });
      } else {
        return res.status(500).json({
          error: 'Unabled to activate, try again',
        });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        error: 'Unabled to activate, try again',
      });
    }
  }
});

publicUserRoutes.post('/resetPassword', async (req, res) => {
  const body = req.body;
  const user = await User.findOne({
    attributes: ['id', 'email'],
    where: {
      email: body.email,
    },
  });

  try {
    await user.update({
      resetPasswordCode: user.getUUID4(),
      resetPasswordCodeLastCreated: Date.now(),
    });
    sendResetPasswordEmail(user);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: 'Something went wrong',
    });
  }

  console.log(
    'Date millis',
    user.resetPasswordCodeLastCreated.getTime() / 1000,
  );

  return res.status(200).send();
});

publicUserRoutes.put('/resetPassword', async (req, res) => {
  const body = req.body;

  if (!body.newPassword || body.newPassword !== body.confirmPassword) {
    return res.status(400).json({
      error: 'The password and confirm password does not match',
    });
  } else {
    const user = await User.findOne({
      attributes: ['id', 'resetPasswordCode', 'resetPasswordCodeLastCreated'],
      where: {
        resetPasswordCode: body.resetPasswordCode,
      },
    });

    if (
      Date.now().getTime() / 1000 -
        user.resetPasswordCodeLastCreated.getTime() / 1000 <
      1000 * 60 * 60
    ) {
      const hashedPassword = await user.hashPassword(body.newPassword);
      await user.update({
        password: hashedPassword,
      });
      res.status(202).send();
    } else {
      return res.status(401).json({
        error: 'Bad code',
      });
    }
  }
});

securedUserRoutes.get('/account', async (req, res) => {
  const userId = req.tokenData.id;

  try {
    const user = await User.findOne({
      attributes: [
        'id',
        'active',
        'cardOnFile',
        'coin',
        'email',
        'firstname',
        'gamertag',
        'lastname',
        'phone',
        'role',
      ],
      where: {
        id: userId,
      },
    });
    if (user) {
      return res.status(200).json({
        id: user.id,
        active: user.active,
        cardOnFile: user.cardOnFile,
        coin: user.coin,
        email: user.email,
        firstname: user.firstname,
        fullname: user.getFullname(),
        gamertag: user.gamertag,
        lastname: user.lastname,
        phone: user.phone,
        role: user.role,
      });
    } else {
      return res.status(404).json({
        error: 'Account not found',
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
});

securedUserRoutes.post('/resendVerify', async (req, res) => {
  const userId = req?.tokenData?.id;
  try {
    const user = await getUser({ userId });
    if (user.active) {
      logger.info('The user is already active');
      return res.status(500).json({
        error: 'User is already verified',
      });
    }
    await handleVerificationEmail({ userId });
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({
      error: 'An error occurred',
    });
  }
});

securedUserRoutes.put('/changePassword', async (req, res) => {
  const body = req.body;
  const userId = req.tokenData.id;

  if (body.newPassword === body.confirmPassword) {
    if (body.password === body.newPassword) {
      return res.status(500).json({
        error:
          'The current password and the new proposed password is the same...',
      });
    }
    const user = await User.findOne({
      attributes: ['id', 'password'],
      where: {
        id: userId,
      },
    });
    if (await user.isValidPassword(body.password)) {
      try {
        const hashedPassword = await user.hashPassword(body.newPassword);
        await user.update({
          password: hashedPassword,
        });
        return res.status(204).send();
      } catch (e) {
        console.error(e);
        return res.status(500).json({
          error: 'Unable to change password',
        });
      }
    } else {
      return res.status(401).json({
        error: 'Wrong current password',
      });
    }
  }
  return res.status(500).json({
    error: 'New password does not match',
  });
});
