/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {validate} = require('bedrock-validation');

module.exports = async ({ledgerNode, validatorInput}) => {
  // TODO: configuration will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now
  return validate('veres-one-validator.ledgerConfiguration', validatorInput);

  // FIXME: what sort of keys will be used to sign the initial ledger
  // configuration?  Will it be signed by a DID that will be uploaded to the
  // ledger later or something along those lines? Otherwise, where does the
  // public key live?  Exactly what sort of signature are we talking about here?

  // await _validateConfigurationProofs({ledgerNode, validatorInput});
};
