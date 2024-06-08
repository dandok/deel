const { HttpStatusCode, type } = require('../helper/constants');

const getProfile = async (req, res, next) => {
  const { Profile, Contract } = req.app.get('models');

  const profile = await Profile.findOne({
    where: { id: req.get('profile_id') || 0 },
    include: [
      { model: Contract, as: 'Contractor' },
      { model: Contract, as: 'Client' },
    ],
  });

  if (!profile)
    return res
      .status(HttpStatusCode.UNAUTHORIZED)
      .json({ message: 'unauthorized' });

  req.profile = profile;

  next();
};

const isClient = async (req, res, next) => {
  const profile = req.profile;

  if (profile.type !== type.client)
    return res
      .status(HttpStatusCode.FORBIDDEN)
      .json({ message: 'for clients only' });

  next();
};

const isContractor = async (req, res, next) => {
  const profile = req.profile;

  if (profile.type !== type.contractor)
    return res
      .status(HttpStatusCode.FORBIDDEN)
      .json({ message: 'for contractors only' });

  next();
};

module.exports = { getProfile, isClient, isContractor };
