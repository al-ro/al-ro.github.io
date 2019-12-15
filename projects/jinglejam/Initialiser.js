function populateWorld(level){
  for(var i = 0; i < level.map.length; i++){
    let posX = level.map[i][0];
    let posY = 0;
    let posZ = level.map[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);
    var tileMesh = new THREE.Mesh( tileGeometry, tileMaterial );
    tileMesh.receiveShadow = true;
    tileMesh.position.set(pos.x, pos.y, pos.z);
    var tile = new Tile(pos, tileMesh);
    tiles.push(tile);
  }

  for(var i = 0; i < tiles.length; i++){
    scene.add(tiles[i].mesh);
  }

  setGlobalMap(level.map);
  setObstacleMap(level.obstacleMap);

  for(var i = 0; i < level.obstacleMap.length; i++){
    let posX = level.obstacleMap[i][0];
    let posY = 0;
    let posZ = level.obstacleMap[i][1];
    var type = level.obstacleMap[i][2];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    switch(type) {
      case ObstacleType.SPINNER:
	var glowMesh = new THREE.Mesh( cylinderGeometry, glowMaterial );
	break;
      case ObstacleType.TRAVELLER:
	var glowMesh = new THREE.Mesh( sphereGeometry, glowMaterial );
	break;
    }

    switch(type) {
      case ObstacleType.SPINNER:
	var obstacleMesh = new THREE.Mesh( cylinderGeometry, whiteMaterial );
	break;
      case ObstacleType.TRAVELLER:
	var obstacleMesh = new THREE.Mesh( sphereGeometry, whiteMaterial );
	break;
    }
    obstacleMesh.scale.set(1.01, 1.01, 1.01);
    obstacleMesh.position.set(pos.x, 1.0, pos.z);


    glowMesh.layers.enable(BLOOM);
    glowMesh.position.set(pos.x, 1.0, pos.z);

    var translation = new THREE.Vector3(0.1, 0, 0);
    var rotation = new THREE.Vector3(0.0, 0.05, 0);

    var movement = new Movement(translation, rotation);
    //constructor (type, pos, meshCore, meshGlow, color, movement)
    var rotation = new THREE.Vector3(0,0,0);
    var obstacle = new Obstacle(type, pos, obstacleMesh, glowMesh, glowMaterial, movement, rotation);
    obstacles.push(obstacle);
  }

  for(var i = 0; i < obstacles.length; i++){
    scene.add(obstacles[i].meshGlow);
    scene.add(obstacles[i].meshCore);
  }

  for(var i = 0; i < level.giftMap.length; i++){
    let posX = level.giftMap[i][0];
    let posY = 0;
    let posZ = level.giftMap[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    pos.set(pos.x + posDelta * 0.8 * (Math.random() - 0.5), 0.0 , pos.z + posDelta * 0.8 * (Math.random() - 0.5));  

    let type = level.giftMap[i][2];

    switch(type){
      case GiftType.ALPHA:
	giftGeometry = giftAlphaGeometry;
	giftMaterial = giftAlphaMaterial;
	break;
      case GiftType.BETA:
	giftGeometry = giftBetaGeometry;
	giftMaterial = giftBetaMaterial;
	break;
      case GiftType.GAMMA:
	giftGeometry = giftGammaGeometry;
	giftMaterial = giftGammaMaterial;
	break;
    }

    var giftMesh = new THREE.Mesh( giftGeometry, giftMaterial );
    giftMesh.position.copy(pos);
    var gift = new Gift( type, pos, giftMesh, giftMaterial );
    giftMesh.layers.enable(BLOOM);
    gifts.push(gift);
  }
  for(var i = 0; i < gifts.length; i++){
    scene.add(gifts[i].mesh);
  }

  for(var i = 0; i < level.npcMap.length; i++){
    let posX = level.npcMap[i][0];
    let posY = 0;
    let posZ = level.npcMap[i][1];
    var pos = new THREE.Vector3(posX, posY, posZ);
    pos.multiplyScalar(posDelta);

    pos.set(pos.x + posDelta * 0.8 * (Math.random() - 0.5), 0.0 , pos.z + posDelta * 0.8 * (Math.random() - 0.5));  

    let type = level.npcMap[i][2];

    switch(type){
      case GiftType.ALPHA:
	npcGeometry = npcAlphaGeometry;
	npcMaterial = npcAlphaMaterial;
	break;
      case GiftType.BETA:
	npcGeometry = npcBetaGeometry;
	npcMaterial = npcBetaMaterial;
	break;
      case GiftType.GAMMA:
	npcGeometry = npcGammaGeometry;
	npcMaterial = npcGammaMaterial;
	break;
    }

    var npcMesh = new THREE.Mesh( npcGeometry, npcMaterial );
    npcMesh.position.copy(pos);
    var npc = new NPC( type, pos, npcMesh, npcMaterial );
    //npcMesh.layers.enable(BLOOM);
    npcs.push(npc);
  }

  for(var i = 0; i < npcs.length; i++){
    scene.add(npcs[i].mesh);
  }

  setGiftMap(level.giftMap);
  setNPCMap(level.npcMap);
}
