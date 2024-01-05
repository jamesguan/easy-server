const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes, Model } = require('sequelize');
const { connection } = require('../connection');

const hashPasswordUtil = async (password) => {
  const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS));
  return bcrypt.hash(password, salt);
};

class User extends Model {
  getFullname() {
    return [this.firstname, this.lastname].join(' ');
  }
  getResetPasswordLink() {
    return `${process.env.SERVER_URL}/public/user/resetpassword/?code=${this.resetPasswordCode}`;
  }
  getVerificationLink() {
    return `${process.env.SERVER_URL}/public/user/verify?verificationCode=${this.verificationCode}`;
  }
  getUUID4() {
    return uuidv4();
  }
  async hashPassword(password) {
    return hashPasswordUtil(password);
  }
  async isValidPassword(password) {
    try {
      return bcrypt.compare(password, this.password);
    } catch (e) {
      console.error(e);
    }
    return false;
  }
  static async findById(userId) {
    return await User.findOne({
      attributes: {
        exclude: [
          'password',
          'verificationCode',
          'resetPasswordCode',
          'resetPasswordCodeLastCreated',
          'createdAt',
          'updatedAt',
        ],
      },
      where: { id: userId },
    });
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    firstname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(22),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    active: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    email: {
      type: DataTypes.STRING(320),
      allowNull: false,
      unique: true,
    },
    cardOnFile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    role: {
      type: DataTypes.STRING(10),
      defaultValue: 'customer',
    },
    verificationCode: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
    },
    resetPasswordCode: {
      type: DataTypes.UUID,
      unique: true,
    },
    resetPasswordCodeLastCreated: {
      type: DataTypes.DATE,
    },
    sawTutorial: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize: connection,
    modelName: 'user',
  },
);

module.exports = User;
