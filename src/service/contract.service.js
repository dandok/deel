const { Contract, Job, Profile } = require('../model');
const Sequelize = require('sequelize');
const sequelize = require('../model').sequelize;
const { Op } = require('sequelize');
const {
  HttpStatusCode,
  status,
  MAX_ALLOWED_PERCENTAGE,
} = require('../helper/constants');
const {
  generateActiveContractsQuery,
} = require('../repository/contract.repository');

class ContractService {
  async fetchClientsContract(id, profile) {
    const contract = await Contract.findOne({ where: { id } });

    if (!contract) {
      const error = new Error(`No contracts found`);
      error.statusCode = HttpStatusCode.NOT_FOUND;
      throw error;
    }

    if (contract.clientId !== profile.id) {
      const error = new Error(`client - contract mismatch`);
      error.statusCode = HttpStatusCode.FORBIDDEN;
      throw error;
    }

    return contract;
  }

  async fetchAllContracts(id, type) {
    const contracts = await Contract.findAll({
      where: {
        [type === 'client' ? 'clientId' : 'contractorId']: id,
        status: {
          [Op.ne]: status.TERMINATED,
        },
      },
    });

    if (contracts.length === 0) {
      const error = new Error(`No contracts found for ${type}`);
      error.statusCode = HttpStatusCode.NOT_FOUND;
      throw error;
    }

    return contracts;
  }

  async unpaidJobs(id, type) {
    const activeContractsPromise = Contract.findAll({
      where: {
        [type === 'client' ? 'clientId' : 'contractorId']: id,
        status: status.IN_PROGRESS,
      },
    });

    const unpaidJobsPromise = Job.findAll({
      where: {
        contractId: {
          [Op.in]: Sequelize.literal(
            generateActiveContractsQuery(id, type, status.IN_PROGRESS)
          ),
        },
        paid: false,
      },
    });

    const [activeContracts, unpaidJobs] = await Promise.all([
      activeContractsPromise,
      unpaidJobsPromise,
    ]);

    if (unpaidJobs.length === 0) {
      const error = new Error(`No unpaid jobs found for ${type}`);
      error.statusCode = HttpStatusCode.NOT_FOUND;
      throw error;
    }

    return unpaidJobs;
  }

  async highestEarningProfession(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const professionEarnings = {};
    let bestProfession = null;
    let maxEarnings = 0;

    const jobs = await Job.findAll({
      where: {
        paymentDate: {
          [Op.between]: [startDate, endDate],
        },
        paid: true,
      },
      include: {
        model: Contract,
        include: {
          model: Profile,
          as: 'Contractor',
        },
      },
    });

    jobs.forEach((job) => {
      const profession = job.Contract.Contractor.profession;
      const earnings = job.price;
      professionEarnings[profession] =
        (professionEarnings[profession] || 0) + earnings;
    });

    for (const profession in professionEarnings) {
      if (professionEarnings[profession] > maxEarnings) {
        maxEarnings = professionEarnings[profession];
        bestProfession = profession;
      }
    }

    return { profession: bestProfession, earnings: maxEarnings };
  }

  async payForJob(jobId, amount, profile) {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      const job = await this.findJobByIdWithContractAndContractor(
        jobId,
        transaction
      );

      this.validateJob(job, profile);
      const [clientProfile, contractorProfile] = await this.findProfiles(
        job,
        profile,
        transaction
      );

      this.checkBalance(clientProfile, amount);
      await this.updateBalances(
        clientProfile,
        contractorProfile,
        job,
        transaction,
        amount
      );

      await transaction.commit();
      return { message: 'Payment made successfully' };
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }

      throw error;
    }
  }

  async findJobByIdWithContractAndContractor(jobId, transaction) {
    const job = await Job.findOne({
      where: { id: jobId },
      include: {
        model: Contract,
        include: {
          model: Profile,
          as: 'Contractor',
        },
      },
      transaction,
    });

    if (!job || !job.Contract || !job.Contract.Contractor) {
      const error = new Error(
        'Job not found, or associated contract or contractor not found'
      );
      error.statusCode = HttpStatusCode.NOT_FOUND;
      throw error;
    }

    return job;
  }

  validateJob(job, profile) {
    if (job.Contract.clientId !== profile.id) {
      const error = new Error('You are not authorized to pay for this job');
      error.statusCode = HttpStatusCode.FORBIDDEN;
      throw error;
    }
  }

  async findProfiles(job, profile, transaction) {
    const clientProfilePromise = Profile.findOne({
      where: { id: profile.id },
      transaction,
    });

    const contractorProfilePromise = Profile.findOne({
      where: { id: job.Contract.Contractor.id },
      transaction,
    });

    const [clientProfile, contractorProfile] = await Promise.all([
      clientProfilePromise,
      contractorProfilePromise,
    ]);

    return [clientProfile, contractorProfile];
  }

  checkBalance(clientProfile, amount) {
    if (clientProfile.balance < amount) {
      const error = new Error('Insufficient balance');
      error.statusCode = HttpStatusCode.BAD_REQUEST;
      throw error;
    }
  }

  async updateBalances(
    clientProfile,
    contractorProfile,
    job,
    transaction,
    amount
  ) {
    const updatedClientBalance = clientProfile.balance - amount;
    const updatedContractorBalance = contractorProfile.balance + amount;

    const [updatedClient, updatedContractor] = await Promise.all([
      clientProfile.update({ balance: updatedClientBalance }, { transaction }),
      contractorProfile.update(
        { balance: updatedContractorBalance },
        { transaction }
      ),
    ]);

    job.paid = true;
    await job.save({ transaction });

    return { message: 'Balances updated successfully' };
  }

  async depositFunds(userId, amount) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const [user, activeJobs] = await Promise.all([
        this.fetchUser(userId, transaction),
        this.fetchActiveJobsOfuser(userId, transaction),
      ]);

      const totalOwedAmount = activeJobs[0]?.dataValues.totalAmount || 0;
      const maxAllowedDeposit = totalOwedAmount * MAX_ALLOWED_PERCENTAGE;

      if (amount > maxAllowedDeposit) {
        const error = new Error('Deposit amount exceeds the maximum allowed.');
        error.statusCode = HttpStatusCode.BAD_REQUEST;
        throw error;
      }

      const updatedBalance = user.balance + amount;
      await user.update({ balance: updatedBalance }, { transaction });

      await transaction.commit();

      return user;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async fetchUser(userId, transaction) {
    const user = await Profile.findByPk(userId, { transaction });

    if (!user) {
      const error = new Error('No user found');
      error.statusCode = HttpStatusCode.NOT_FOUND;
      throw error;
    }

    return user;
  }

  async fetchActiveJobsOfuser(userId, transaction) {
    return await Job.findAll({
      where: {
        paid: false,
      },
      include: {
        model: Contract,
        where: {
          clientId: userId,
        },
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('price')), 'totalAmount'],
      ],
      transaction,
    });
  }

  async bestClients(start, end, limit) {
    const clientsPayments = await Job.findAll({
      where: {
        paymentDate: {
          [Op.between]: [start, end],
        },
        paid: true,
      },
      attributes: [
        [sequelize.literal('Contract.clientId'), 'clientId'],
        [sequelize.fn('SUM', sequelize.col('price')), 'totalPayment'],
      ],
      group: ['Contract.clientId'],
      include: [
        {
          model: Contract,
          attributes: [],
        },
      ],
      order: [[sequelize.literal('totalPayment'), 'DESC']],
      limit: limit,
    });

    return clientsPayments.map((clientPayment) => ({
      id: clientPayment.dataValues.clientId,
      paid: clientPayment.dataValues.totalPayment,
    }));
  }
}

module.exports = ContractService;
