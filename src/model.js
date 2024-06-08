const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite3',
});

class Profile extends Sequelize.Model {}
Profile.init(
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    profession: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    balance: {
      type: Sequelize.DECIMAL(12, 2),
    },
    type: {
      type: Sequelize.ENUM('client', 'contractor'),
    },
  },
  {
    sequelize,
    modelName: 'Profile',
  }
);

class Contract extends Sequelize.Model {}
Contract.init(
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    terms: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('new', 'in_progress', 'terminated'),
    },
  },
  {
    sequelize,
    modelName: 'Contract',
  }
);

class Job extends Sequelize.Model {}
Job.init(
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    },
    paid: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    paymentDate: {
      type: Sequelize.DATE,
    },
  },
  {
    sequelize,
    modelName: 'Job',
  }
);

Profile.hasMany(Contract, { as: 'Contractor', foreignKey: 'contractorId' });
Contract.belongsTo(Profile, { as: 'Contractor', foreignKey: 'contractorId' });

Profile.hasMany(Contract, { as: 'Client', foreignKey: 'clientId' });
Contract.belongsTo(Profile, { as: 'Client', foreignKey: 'clientId' });

Contract.hasMany(Job, { foreignKey: 'contractId' });
Job.belongsTo(Contract, { foreignKey: 'contractId' });

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job,
};
