const Sequelize = require('sequelize');
const { status } = require('../helper/constants');

function generateActiveContractsQuery(id, type, status) {
  const query = `(SELECT id FROM Contracts WHERE ${
    type === 'client' ? 'clientId' : 'contractorId'
  } = ${id} AND status = '${status}')`;

  return query;
}

module.exports = { generateActiveContractsQuery };
