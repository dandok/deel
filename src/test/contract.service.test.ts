const ContractService  = require('../service/contract.service');
const { Contract, Profile } = require('../model');

jest.mock('../model', () => ({
  Contract: {
    findOne: jest.fn(),
  },
  Profile: {
    findByPk: jest.fn(),
  },
}));

describe('ContractService', () => {
  let contractService;

  beforeAll(() => {
    contractService = new ContractService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchClientsContract', () => {
    it('should return the contract if found', async () => {
      const contractData = { id: 1, clientId: 1 };
      Contract.findOne.mockResolvedValue(contractData);

      const profileData = { id: 1 };
      Profile.findByPk.mockResolvedValue(profileData);

      const result = await contractService.fetchClientsContract(1, profileData);

      expect(result).toEqual(contractData);
      expect(Contract.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(Profile.findByPk).not.toHaveBeenCalled();
    });

    it('should throw an error if the contract is not found', async () => {
      Contract.findOne.mockResolvedValue(null);

      const profileData = { id: 1 };

      await expect(
        contractService.fetchClientsContract(1, profileData)
      ).rejects.toThrow('No contracts found');
    });

    it('should throw an error if the client ID does not match', async () => {
      const contractData = { id: 1, clientId: 2 };
      Contract.findOne.mockResolvedValue(contractData);

      const profileData = { id: 1 };

      await expect(
        contractService.fetchClientsContract(1, profileData)
      ).rejects.toThrow('client - contract mismatch');
    });
  });
});
