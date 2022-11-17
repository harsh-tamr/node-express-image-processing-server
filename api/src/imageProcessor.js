const { resolve } = require('path');
const { isMainThread } = require('worker_threads');
const pathToResizeWorker = resolve(__dirname, 'resizeWorker.js');
const pathToMonochromeWorker = resolve(__dirname, 'monochromeWorker.js');

function uploadPathResolver(filename) {
  return resolve(__dirname, '../uploads', filename);
}

function imageProcessor(filename) {
  const sourcePath = uploadPathResolver(filename);
  const resizeDestination = uploadPathResolver('resized-' + filename);
  const monochromeDestination = uploadPathResolver('monochrome-' + filename);
  let resizeWorkerFinished = false;
  let monochromeWorkerFinished = false;
  return new Promise((resolve, reject) => {
    if (!isMainThread) {
      reject(new Error('not on main thread'));
    } else {
      try {
        const monochromeWorker = new Worker(pathToMonochromeWorker, {
          workerData: { source: sourcePath, destination: resizeDestination },
        });
        const resizeWorker = new Worker(pathToResizeWorker, {
          workerData: {
            source: sourcePath,
            destination: monochromeDestination,
          },
        });
        monochromeWorker.on('message', (message) => {
          monochromeWorkerFinished = true;
          resolve('monochromeWorker finished processing');
        });
        monochromeWorker.on('error', (error) => {
          resizeWorkerFinished = true;
          reject(new Error(error.message));
        });
        monochromeWorker.on('exit', (code) => {
          if (code != 0) {
            reject(new Error(`Exited with status code ${code}`));
          }
        });

        resizeWorker.on('message', (message) => {
          resizeWorkerFinished = true;
          resolve('resizeWorker finished processing');
        });
        resizeWorker.on('error', (error) => {
          resizeWorkerFinished = true;
          reject(new Error(error.message));
        });
        resizeWorker.on('exit', (code) => {
          if (code != 0) {
            reject(new Error(`Exited with status code ${code}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    }
  });
}

module.exports = imageProcessor;
