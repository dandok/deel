const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const {
  getProfile,
  isClient,
  isContractor,
} = require('./middleware/getProfile');
const ContractController = require('./controller/contract.controller');
const ContractService = require('./service/contract.service');
const errorHandler = require('../src/helper/error');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

const contractService = new ContractService();
const contractController = new ContractController(contractService);
/**
 * FIX ME!
 * @returns contract by id
 */

app.get(
  '/contracts/:id',
  getProfile,
  isClient,
  contractController.fetchClientsContractById
);
app.get('/contracts', getProfile, contractController.fetchContracts);
app.get('/jobs/unpaid', getProfile, contractController.fetchUnpaidJobs);
app.get(
  '/admin/best-profession',
  getProfile,
  isContractor,
  contractController.bestProfession
);
app.get('/admin/best-clients', contractController.getBestClients);
app.post(
  '/jobs/:job_id/pay',
  getProfile,
  isClient,
  contractController.payForAJob
);
app.post(
  '/balances/deposit/:userId',
  getProfile,
  isClient,
  contractController.deposit
);

app.use(errorHandler);

module.exports = app;
