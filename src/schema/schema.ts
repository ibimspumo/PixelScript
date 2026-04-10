import type { PixelScriptSchemaDocument } from './types';

export const pixelScriptJsonSchema: PixelScriptSchemaDocument = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://ibimspumo.github.io/PixelScript/schema/pixelscript.schema.json',
  title: 'PixelScriptDocument',
  type: 'object',
  additionalProperties: false,
  required: ['version', 'width', 'height', 'palette', 'frames'],
  properties: {
    version: {
      const: 1
    },
    width: {
      type: 'integer',
      minimum: 1
    },
    height: {
      type: 'integer',
      minimum: 1
    },
    palette: {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: {
        kind: {
          enum: ['default64', 'custom']
        },
        name: {
          type: 'string'
        },
        colors: {
          type: 'array',
          minItems: 1,
          maxItems: 64,
          items: {
            anyOf: [
              { type: 'string' },
              { type: 'null' }
            ]
          }
        }
      }
    },
    frames: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pixels'],
        properties: {
          pixels: {
            type: 'string'
          },
          durationMs: {
            type: 'integer',
            minimum: 1
          }
        }
      }
    },
    animation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fps: {
          type: 'number',
          exclusiveMinimum: 0
        },
        loop: {
          type: 'boolean'
        }
      }
    },
    meta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        author: { type: 'string' },
        description: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};
