/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {constants} = require('bedrock').config;
const {schemas} = require('bedrock-validation');
const did = require('./did');
const urnUuid = require('./urn-uuid');

const caveat = {
  additionalProperties: false,
  required: [
    'type'
  ],
  type: 'object',
  properties: {
    type: {
      type: 'string',
      // FIXME: enable when term is finalized
      // enum: ['VeresOneElectorTicketAgent']
    }
  }
};

const capability = {
  additionalProperties: false,
  type: 'object',
  required: [
    'caveat',
    'id',
    'invocationTarget',
  ],
  properties: {
    caveat: {
      type: 'array',
      minItems: 1,
      items: caveat,
    },
    id: did(),
    invocationTarget: {
      // FIXME: more specific pattern?
      type: 'string',
    }
  },
};

const config = {
  title: 'Veres One Validator Config',
  required: [
    'type',
    'validatorFilter',
  ],
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['VeresOneValidator2017'],
    },
    validatorFilter: {
      title: 'Validator Type Filter',
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        required: ['type', 'validatorFilterByType'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['ValidatorFilterByType']
          },
          validatorFilterByType: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            uniqueItems: true,
            items: {
              type: 'string',
              enum: ['CreateWebLedgerRecord', 'UpdateWebLedgerRecord']
            },
          }
        },
        additionalProperties: false
      },
    }
  },
  additionalProperties: false
};

const publicKey = {
  title: 'Public Key',
  required: [
    'id',
    'owner',
    'type'
  ],
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    // FIXME: allow other types of keys
    type: {
      type: 'string',
      enum: ['RsaVerificationKey2018', 'Ed25519VerificationKey2018'],
    },
    owner: did(),
    // FIXME: make schema require this for RsaVerificationKey2018
    publicKeyPem: schemas.publicKeyPem(),
    // FIXME: make schema require this for Ed25519VerificationKey2018
    publicKeyBase58: {
      type: 'string',
    }
  },
  additionalProperties: false
};

const service = {
  required: [
    'id',
    'serviceEndpoint',
    'type',
  ],
  type: 'object',
  properties: {
    id: urnUuid(),
    // FIXME: are other types of services allowed on V1?
    type: {
      type: 'string',
      // FIXME: this value is TBD
      enum: ['Continuity2017Peer'],
    },
    serviceEndpoint: {
      // TODO: can this be improved? pattern starting with https://?
      type: 'string',
    }
  }
};

const didDocument = {
  title: 'DID Document',
  required: [
    'id',
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT_URL),
    id: did(),
    // FIXME: be more specific with restrictions for all properties below
    invocationTarget: {
      type: 'string',
    },
    invoker: {
      type: 'string',
    },
    authentication: {
      type: 'array',
      minItems: 1,
      items: {
        required: ['type'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
    },
    capabilityDelegation: {
      type: 'array',
      minItems: 1,
      items: {
        required: ['type'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
    },
    capabilityInvocation: {
      type: 'array',
      minItems: 1,
      items: {
        required: ['type'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          publicKey: {
            type: 'array',
            minItems: 1,
            items: publicKey
          }
        }
      },
    },
    service: {
      type: 'array',
      minItems: 1,
      items: service,
    },
  },
  additionalProperties: false
};

const didDocumentPatch = {
  title: 'DID Document Patch',
  required: [
    '@context',
    'patch',
    'sequence',
    'target'
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT_URL),
    target: {
      anyOf: [did(), urnUuid()],
    },
    // FIXME: also support `frame` property later
    patch: {
      type: 'array',
      minItems: 1,
      items: {
        required: [
          'op',
          'path'
        ],
        type: 'object',
        // FIXME: more strictly validate properties based on value of `op`
        properties: {
          op: {
            type: 'string',
            enum: ['add', 'copy', 'move', 'remove', 'replace', 'test']
          },
          from: {
            type: 'string',
          },
          path: {
            type: 'string',
          },
          value: {
            //type: ['number', 'string', 'boolean', 'object', 'array'],
          }
        },
        additionalProperties: false
      }
    },
    sequence: {
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER
    }
  },
  additionalProperties: false
};

const electorPoolDocument = {
  title: 'ElectorPool Document',
  required: [
    '@context',
    'id',
    'electorPool',
    'invoker'
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT_URL),
    id: urnUuid(),
    invoker: did(),
    electorPool: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'capability',
          'elector',
          'id',
          'service',
          // FIXME: is type required?
          // 'type',
        ],
        properties: {
          elector: did(),
          id: urnUuid(),
          service: {
            anyOf: [service, urnUuid()]
          },
          // FIXME: is type required?
          type: {
            anyOf: [{
              type: 'string',
              enum: ['Elector']
            }, {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Elector', 'RecoveryElector']
              }
            }]
          },
          capability: {
            type: 'array',
            minItems: 1,
            items: capability
          }
        }
      }
    },
  },
  additionalProperties: false,
};

const createDid = {
  title: 'Create DID',
  required: [
    '@context',
    'proof',
    'record',
    'type',
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    type: {
      type: 'string',
      enum: ['CreateWebLedgerRecord'],
    },
    record: didDocument,
    proof: {
      type: 'array',
      minItems: 2,
      items: {
        required: [
          'type'
        ],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'RsaSignature2018', 'Ed25519Signature2018', 'EquihashProof2018'],
          }
        }
      }
    }
  },
  additionalProperties: false
};

const createElectorPool = {
  title: 'Create ElectorPool',
  required: [
    '@context',
    'proof',
    'record',
    'type',
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    type: {
      type: 'string',
      enum: ['CreateWebLedgerRecord'],
    },
    record: electorPoolDocument,
    proof: {
      type: 'array',
      minItems: 2,
      items: {
        required: [
          'type'
        ],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'RsaSignature2018', 'Ed25519Signature2018'],
          }
        }
      }
    }
  },
  additionalProperties: false
};

const updateDid = {
  title: 'Update DID',
  required: [
    '@context',
    'proof',
    'recordPatch',
    'type'
  ],
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.WEB_LEDGER_CONTEXT_V1_URL),
    type: {
      type: 'string',
      enum: ['UpdateWebLedgerRecord'],
    },
    recordPatch: didDocumentPatch,
    proof: {
      type: 'array',
      minItems: 2,
      items: {
        required: ['type'],
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'RsaSignature2018', 'Ed25519Signature2018', 'EquihashProof2018'],
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
module.exports.electorPoolDocument = () => electorPoolDocument;
module.exports.operation = () => ({
  title: 'WebLedgerOperation',
  anyOf: [createDid, updateDid, createElectorPool]
});
