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

function processGLTF(json, workingDirectory){
  console.log("JSON to process:", json);
  let imagePromises = [];
  let bufferPromises = [];

  if(json.images){
    let images = [];
    for(let i = 0; i < json.images.length; i++){
      imagePromises.push(download(workingDirectory.concat(json.images[i].uri), "blob"));
    }

    Promise.all(imagePromises).then(p => {
      for(let i = 0; i < imagePromises.length; i++){
        imagePromises[i].then(data => console.log(data));
      }
    });
  }

  if(json.buffers){
    let buffers = [];
    for(let i = 0; i < json.buffers.length; i++){
      bufferPromises.push(download(workingDirectory.concat(json.buffers[i].uri), "arrayBuffer"));
    }

    Promise.all(bufferPromises).then(p => {
      for(let i = 0; i < bufferPromises.length; i++){
        bufferPromises[i].then(data => {
          console.log(data);//reader.result contains the contents of blob as a typed array
        });
      }
    });
  }
}

let p = download("./gltf/flighthelmet/FlightHelmet.gltf", "gltf");

p.then(data => processGLTF(data, "./gltf/flighthelmet/"));
