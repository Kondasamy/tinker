// How many seeded rollouts train_world.py trained on, pinned here so the registry need not bundle meta.json (28 KB)
// for one number; tests/unit/video-models-engine.test.ts fails if it drifts from meta.json.
export const TRAIN_ROLLOUTS = 1500;
