// Fetch a json or binary (image or buffer) file and return a promise
// Data URI can also be passed to the Fetch library

/** Number of objects being downloaded */
let downloadingCount = 0;

/** Increment download count */
function pushDownload() {
  downloadingCount++;
}

/** Decrement download count */
function popDownload() {
  downloadingCount = Math.max(0, downloadingCount - 1);
}

/** Return the number of active fetch requests */
function getDownloadingCount() {
  return downloadingCount;
}

/**
 * Fetch asset and return a promise to its data
 * @param {string} url asset path
 * @param {"gltf" | "json" | "arrayBuffer" | "blob"} type asset type for promise resolution
 * @param {AbortSignal} signal allows aborting the download
 * @returns Handled promise which resolves once asset fetch has completed
 */
function download(url, type, signal = null) {
  pushDownload();
  let data = null;
  return fetch(url, { signal }).then(response => {

    if (response.ok) {

      switch (type) {
        case "gltf":
        case "json":
          data = response.json();
          break;
        case "arrayBuffer":
          data = response.arrayBuffer();
          break;
        case "blob":
          data = response.blob();
          break;
        default:
          popDownload();
          console.log("Unknown file type: ", url, type);
      }

      if (!!data) {
        data.then(p => {
          popDownload();
        }).catch(e => {
          popDownload();
          handleError(e);
        });
      }
      return data;

    } else {

      console.log("Error downloading: ", url);

    }

  }).catch(e => {
    popDownload();
    handleError(e);
  });
}

function handleError(e) {
  if (!e.message == "The user aborted a request.") {
    console.log('Download error: ' + e.message);
  }
}

export { download, getDownloadingCount, pushDownload, popDownload }
