import type H from '@vladmandic/human';

export const humanConfig: Partial<H['config']> = {
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
  backend: 'webgl',
  async: true,
  warmup: 'face',
  cacheSensitivity: 0.75,
  filter: {
    enabled: true,
    equalization: true,
    flip: false,
  },
  face: {
    enabled: true,
    detector: {
      enabled: true,
      rotation: false,
      maxDetected: 1,
      minConfidence: 0.5,
      modelPath: 'blazeface-back.json',
    },
    mesh: {
      enabled: true,
      modelPath: 'facemesh.json',
    },
    iris: {
      enabled: true,
      modelPath: 'iris.json',
    },
    description: {
      enabled: true,
      modelPath: 'faceres.json',
      minConfidence: 0.1,
    },
    emotion: {
      enabled: false,
    },
    antispoof: {
      enabled: true,
      modelPath: 'antispoof.json',
    },
    liveness: {
      enabled: true,
      modelPath: 'liveness.json',
    },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: true },
  segmentation: { enabled: false },
};

export const FACE_MATCH_THRESHOLD = 0.6;
export const MIN_FACE_CONFIDENCE = 0.7;
export const LIVENESS_THRESHOLD = 0.5;
export const ANTISPOOF_THRESHOLD = 0.5;
export const DESCRIPTOR_SIZE = 128;
