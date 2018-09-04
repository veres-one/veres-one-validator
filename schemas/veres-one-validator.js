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
    '@context': schemas.jsonldContext(
      constants.VERES_ONE_CONTEXT, {required: false}),
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
    capabilityDelegation: {
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
    capabilityInvocation: {
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
    service: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true
          },
          type: {
            type: 'string',
            required: true
          },
          serviceEndpoint: {
            type: 'string',
            required: true
          }
        }
      },
      required: false
    }
  },
  additionalProperties: false
};

const didDocumentPatch = {
  title: 'DID Document Patch',
  required: true,
  type: 'object',
  properties: {
    target: did(),
    // FIXME: also support `frame` property later
    patch: {
      type: 'array',
      required: true,
      minItems: 1,
      items: {
        type: 'object',
        required: true,
        // FIXME: more strictly validate properties based on value of `op`
        properties: {
          op: {
            type: 'string',
            required: true,
            enum: ['add', 'copy', 'move', 'remove', 'replace', 'test']
          },
          from: {
            type: 'string',
            required: false
          },
          path: {
            type: 'string',
            required: true
          },
          value: {
            //type: ['number', 'string', 'boolean', 'object', 'array'],
            required: false
          }
        },
        additionalProperties: false
      }
    },
    sequence: {
      type: 'integer',
      required: true,
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER
    }
  },
  additionalProperties: false
};

const createOperation = {
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

const updateOperation = {
  title: 'UpdateWebLedgerRecord',
  required: true,
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT),
    type: {
      type: 'string',
      enum: ['UpdateWebLedgerRecord'],
      required: true
    },
    recordPatch: didDocumentPatch,
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
module.exports.didDocumentPatch = () => didDocumentPatch;
module.exports.operation = () => ({
  title: 'WebLedgerOperation',
  required: true,
  type: [createOperation, updateOperation]
});
