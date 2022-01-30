// Fetch a json or binary (image or buffer) file and return a promise
// Data URI can also be passed to the Fetch library

function download(url, type){
  return fetch(url).then(response => {
    if(response.ok){
      switch(type){
        case "gltf":
        case "json":
        return response.json();
      case "blob":
        return response.blob();
      case "arrayBuffer":
        return response.arrayBuffer();
      default:
        console.log("Unknown file type: ", url, type);
        return null;
      }
     }else{
      console.log("Error downloading: ", url);
    }
  });
}

export {download}
