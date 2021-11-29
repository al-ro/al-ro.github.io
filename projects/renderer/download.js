// Fetch a json or binary (image or buffer) file and return a promise

function download(url, type){
  return fetch(url).then(response => {
    if(response.ok){
      switch(type){
        case "gltf":
        return response.json();
        break;
      case "blob":
        return response.blob();
        break;
      case "arrayBuffer":
        return response.arrayBuffer();
        break;
      default:
        console.log("Unknown file type: ", url);
        return null;
      }
     }else{
      console.log("Error downloading: ", url);
    }
  });
}

export {download}
