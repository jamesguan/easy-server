require('dotenv').config();
const { Sequelize } = require('sequelize');

const connection =  new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Remove this when proper TLS  is setup
    },
  },
});

const connect = async () => {
  if (connection) {

  } else {
    
  }
  try {
    await connection.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = {
  connect,
  connection,
};
