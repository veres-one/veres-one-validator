/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
const constants = require('bedrock').config.constants;
const schemas = require('bedrock-validation').schemas;
const did = require('./did');

const config = {
  title: 'Veres One Validator Config',
  required: true,
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['VeresOneValidator2017'],
      required: true
    },
    validatorFilter: {
      title: 'Validator Type Filter',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            required: true
          },
          validatorFilterByType: {
            type: 'array',
            items: {
              type: 'string'
            },
            required: true
          }
        },
        additionalProperties: false
      },
      required: true
    }
  },
  additionalProperties: false
};

const publicKey = {
  title: 'Public Key',
  type: 'object',
  items: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        required: true
      },
      // FIXME: allow other types of keys
      type: {
        type: 'string',
        required: true,
        enum: ['RsaVerificationKey2018', 'Ed25519VerificationKey2018'],
      },
      owner: did(),
      // FIXME: make schema require this for RsaVerificationKey2018
      publicKeyPem: schemas.publicKeyPem({required: false}),
      // FIXME: make schema require this for Ed25519VerificationKey2018
      publicKeyBase58: {
        type: 'string',
        required: false
      }
    },
    additionalProperties: false
  }
};

const didDocument = {
  title: 'DID Document',
  required: true,
  type: 'object',
  properties: {
    id: did(),
    // FIXME: be more specific with restrictions for all properties below
    invocationTarget: {
      type: 'string',
      required: false
    },
    invoker: {
      type: 'string',
      required: false
    },
    authentication: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            required: true
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
      required: false
    },
    grantCapability: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            required: true
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
      required: false
    },
    invokeCapability: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            required: true
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
      required: false
    }
  },
  additionalProperties: false
};

const operation = {
  // FIXME: support `UpdateWebLedgerRecord` as well
  title: 'CreateWebLedgerRecord',
  required: true,
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT),
    type: {
      type: 'string',
      enum: ['CreateWebLedgerRecord'],
      required: true
    },
    record: didDocument,
    proof: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'RsaSignature2018', 'Ed25519Signature2018', 'EquihashProof2018'],
            required: true
          }
        }
      }
    }
  },
  additionalProperties: false
};

module.exports.config = () => config;
module.exports.didDocument = () => didDocument;
module.exports.operation = () => operation;
