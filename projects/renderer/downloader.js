// This file taken from:
// https://github.com/sketchpunk/FunWithWebGL2/blob/master/lesson_041/fungi.downloader.js

/* Bare requirements for struct is file and handler type.
   Any other fields are extra for further handling 

   {file:"",type="gltf"}
 */

var workingDirectory = "./";
class Downloader{

  static start(queueItems){

    var file =  queueItems[0].file;
    workingDirectory = file.substring(0, file.lastIndexOf("/") + 1); 

    if(Downloader.isActive){
      return;
    }

    //Add Items to the queue
    if(queueItems != undefined && queueItems.length > 0){
      for(var i = 0; i < queueItems.length; i++){
        Downloader.queue.push(queueItems[i]);
      }
    }

    //Create Promise that will do the work in the background.
    if(Downloader.activePromise == null){ 
      Downloader.activePromise = new Promise(
          function(resolve, reject){
          Downloader.promiseResolve = resolve;
          Downloader.promiseReject = reject;
          Downloader.loadNext();
          }
          );
    }

    Downloader.isActive = true;
    return Downloader.activePromise; 
  }

  static finalize(isSuccess){
    Downloader.isActive = false;

    if(isSuccess){
      //Can pass data with resolve if needed later
      Downloader.promiseResolve();
    }else{
      Downloader.promiseReject(new Error("err"));
    }

    Downloader.activePromise = null;
    Downloader.promiseResolve = null;
    Downloader.promiseReject = null;
  }

  static loadNext(){
    if(Downloader.queue.length == 0){
      Downloader.finalize(true);
      return;
    }

    var itm = Downloader.queue.pop();
    Downloader.handlers[itm.type](itm);
  }

  //Functionality for actual downloading
  static onXhrcomplete(e){
    var doSave = Downloader.handlers[this.activeItem.type](this.activeItem, e.currentTarget.response);
    if(doSave){
      Downloader.complete.push(this.activeItem);
    }

    this.activeItem = null;
    Downloader.loadNext();
  }			

  static onXhrError(e){ console.log("Error: ", e); }
  static onXhrAbort(e){ console.log("Abort: ", e); }
  static onXhrTimeout(e){ console.log("Timeout: ", e); }

  static get(itm, type){
    //xhr holds the active item in case in the future the call is set
    //to handle multiple downloads at a time with some sort of threadpool.
    //This way each ajax caller holds the download info that can then
    //be sent back to the download complete handler.
    Downloader.xhr.activeItem = itm;
    Downloader.xhr.open("GET", itm.file);
    Downloader.xhr.responseType = type;
    Downloader.xhr.send();
  }
}

Downloader.isActive = false;		//Is the downloader currently downloading things
Downloader.activePromise = null;	//Reference to promise created by start
Downloader.promiseResolve = null;	//Resolve Reference for promise
Downloader.promiseReject = null;	//Reject Reference for promise
Downloader.queue = [];			//queue of items to download
Downloader.complete  = [];		//queue of completed items downloaded.

//XHR is how we can download files through javascript
Downloader.xhr = new XMLHttpRequest();
Downloader.xhr.addEventListener("load",	Downloader.onXhrcomplete,false);
Downloader.xhr.addEventListener("error", Downloader.onXhrError,false);
Downloader.xhr.addEventListener("abort", Downloader.onXhrAbort,false);
Downloader.xhr.addEventListener("timeout", Downloader.onXhrTimeout,false);

//Downloader is suppose to be expandable by adding new ways to handle
//different types of files for downloading.
Downloader.handlers = {
  //................................................
  //How to download a GLTF File
  "gltf":function(itm, dl){
    //Init Call
    if(dl == undefined){
      Downloader.get(itm, "json");
      return false; 
    }

    //Final Call - Look through the buffer for bin files to download.
    for(var i = 0; i < dl.buffers.length; i++){
      if(dl.buffers[i].uri.startsWith("data:")){
        continue;
      }

      //Push bin file to download queue.
      Downloader.queue.push({
        file: dl.buffers[i].uri,
        type: "gltf_bin",
        ref: dl.buffers[i]}
      );
    }

    itm.dl = dl; //Save the data download to the item
    return true; //Save item to complete list.
  },

  //................................................
  //How to download a bin file from gltf file
  "gltf_bin":function(itm, dl){
    //Init Call
    if(dl == undefined){
      itm.file = workingDirectory.concat(itm.file);
      Downloader.get(itm, "arraybuffer");
      return false;
    }

    //Final Call
    itm.ref.dView = new DataView(dl); //Create a dataview for arraybuffer.
    return false; //No need to save this item to complete list.
  }
};

export {Downloader}
