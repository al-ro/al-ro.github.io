// Fetch a json or binary (image or buffer) file and return a promise
// Data URI can also be passed to the Fetch library

let downloadingCount = 0;

function pushDownload(){
  downloadingCount++;
}

function popDownload(){
  downloadingCount = Math.max(0, downloadingCount - 1);
}

function getDownloadingCount(){
  return downloadingCount;
}

function download(url, type){
  pushDownload();
  return fetch(url).then(response => {
    popDownload();
    if(response.ok){
      switch(type){
        case "gltf":
        case "json":
        return response.json();
      case "arrayBuffer":
        return response.arrayBuffer();
      case "blob":
        return response.blob();
      default:
        console.log("Unknown file type: ", url, type);
        return null;
      }
     }else{
      console.log("Error downloading: ", url);
    }
  });
}

export {download, getDownloadingCount, pushDownload, popDownload}
