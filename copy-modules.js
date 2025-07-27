const fs = require('fs-extra');
const path = require('path');

const copyModules = async () => {
  const dest = path.join(__dirname, 'dist', 'node_modules');
  await fs.ensureDir(dest);
  
  // Copy required TensorFlow modules
  await fs.copy(
    path.join(__dirname, 'node_modules', '@tensorflow'),
    path.join(dest, '@tensorflow')
  );
  
  console.log('TensorFlow modules copied successfully');
};

copyModules().catch(console.error);