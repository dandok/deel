const ContractService = require('../service/contract.service');

class ContractController {
  constructor(contractService) {
    this.contractService = contractService;

    this.fetchClientsContractById = this.fetchClientsContractById.bind(this);
    this.fetchContracts = this.fetchContracts.bind(this);
    this.fetchUnpaidJobs = this.fetchUnpaidJobs.bind(this);
    this.bestProfession = this.bestProfession.bind(this);
    this.payForAJob = this.payForAJob.bind(this);
    this.deposit = this.deposit.bind(this);
    this.getBestClients = this.getBestClients.bind(this);
  }

  async fetchClientsContractById(req, res, next) {
    const { id } = req.params;
    const { profile } = req;

    try {
      const contract = await this.contractService.fetchClientsContract(
        id,
        profile
      );
      res.json({
        message: 'contracts fetched successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async fetchContracts(req, res, next) {
    const { profile } = req;
    const { id, type } = profile;

    try {
      res.json({
        message: 'contracts fetched successfully',
        data: await this.contractService.fetchAllContracts(id, type),
      });
    } catch (error) {
      next(error);
    }
  }

  async fetchUnpaidJobs(req, res, next) {
    const { profile } = req;
    const { id, type } = profile;

    try {
      res.json({
        message: 'Unpaid jobs fetched successfully',
        data: await this.contractService.unpaidJobs(id, type),
      });
    } catch (error) {
      next(error);
    }
  }

  async bestProfession(req, res, next) {
    const { start, end } = req.query;
    try {
      res.json({
        message: 'Best profession fetched successfully',
        data: await this.contractService.highestEarningProfession(start, end),
      });
    } catch (error) {
      next(error);
    }
  }

  async payForAJob(req, res, next) {
    const { job_id } = req.params;
    const { amount } = req.body;
    const { profile } = req;

    try {
      res.json({
        message: 'payment successfull',
        data: await this.contractService.payForJob(job_id, amount, profile),
      });
    } catch (error) {
      next(error);
    }
  }

  async deposit(req, res, next) {
    const { userId } = req.params;
    const { amount } = req.body;

    try {
      res.json({
        message: 'deposit made successfully',
        data: await this.contractService.depositFunds(userId, amount),
      });
    } catch (error) {
      next(error);
    }
  }

  async getBestClients(req, res, next) {
    const { start, end, limit = 2 } = req.query;

    try {
      res.json({
        message: 'best clients fetched successfully',
        data: await this.contractService.bestClients(start, end, limit),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ContractController;
