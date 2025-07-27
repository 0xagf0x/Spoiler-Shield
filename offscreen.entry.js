// Use the all-in-one TFJS bundle to avoid backend issues
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Set wasm path and backend BEFORE loading models
tf.setWasmPaths('lib/');
await tf.setBackend('wasm');
await tf.ready();

window.tf = tf;
window.cocoSsd = cocoSsd;

// Load rest of your logic after TF is ready
import './offscreen.js';