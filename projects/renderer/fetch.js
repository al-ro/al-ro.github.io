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
  console.log(json);

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
}

let p = download("./gltf/boombox/BoomBox.gltf", "gltf");

p.then(data => processGLTF(data, "./gltf/boombox/"));
