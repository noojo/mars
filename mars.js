var first_time = true;

var aws_dynamo = document.querySelector('#aws_dynamo');
var aws_cognito = document.querySelector('#aws_cognito');
var altimeter = document.querySelector('#altimeter');
var hud_bar = document.querySelector('#barr');
var hud_blank = document.querySelector('#blank');


// mobile things
//var motion_obj = [0,0,0,0,0];
function deviceMotionHandler(e) {
	motion_obj.shift();
	motion_obj.push(e.acceleration.y);
	var v = motion_obj[0] * .1 + motion_obj[1] * .1 + motion_obj[2] * .2 + motion_obj[3] * .4 + motion_obj[4] * .2;
}

var isMobile = { 
	Android: function() { return navigator.userAgent.match(/Android/i); }, 
	BlackBerry: function() { return navigator.userAgent.match(/BlackBerry/i); }, 
	iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); }, 
	Opera: function() { return navigator.userAgent.match(/Opera Mini/i); }, 
	Windows: function() { return navigator.userAgent.match(/IEMobile/i); }, 
	any: function() { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); } 
};
// end mobile

// AWS
var cog_params = {
	AccountId: "795449910740",
	RoleArn: "arn:aws:iam::795449910740:role/Cognito_mars_poolUnauth_DefaultRole",
	IdentityPoolId: "us-east-1:0b580464-322a-4807-9a11-d5c86cd9ad3f"
};
// set the Amazon Cognito region
AWS.config.region = 'us-east-1';
// initialize the Credentials object with our parameters
AWS.config.credentials = new AWS.CognitoIdentityCredentials(cog_params);		
// We can set the get method of the Credentials object to retrieve
// the unique identifier for the end user (identityId) once the provider
// has refreshed itself
var cog_now = Date.now();

AWS.config.credentials.get(function(err) {
    if (!err) {
        console.log("Cognito Identity Id: " + AWS.config.credentials.identityId);
        addline("Identity Id: " + AWS.config.credentials.identityId + ' ' + (Date.now() - cog_now) + ' ms', aws_cognito);
        // Other service clients will automatically use the Cognito Credentials provider
		// configured in the JavaScript SDK.
		var cognitoSyncClient = new AWS.CognitoSync();

		cognitoSyncClient.listDatasets(
			{
			    IdentityId: AWS.config.credentials.identityId,
			    IdentityPoolId: "us-east-1:0b580464-322a-4807-9a11-d5c86cd9ad3f"
			}, 
			function(err, data) {
			    if ( data) {
			    	addline('listDatasets: ' + data.Count, aws_cognito);
			        console.log(data);
			       	var x = document.querySelector('#cogmeter');
					x.classList.remove('hudoff');
			    }
			    if ( err ) {
			    	console.log(err);
			    	addline('Sync listDatasets ERROR: ' + err, aws_cognito);
			    }
		    }
		);
    } 
    else {
    	console.log(err);
    	addline('FAIL.' + err, aws_cognito);
    }
});

var dynamodb = new AWS.DynamoDB({region: 'us-west-2', TableName: 'mars_test'});

// WEBGL

if ( ! Detector.webgl ) {
	Detector.addGetWebGLMessage();
	document.getElementById( 'container' ).innerHTML = "";
}

var container, stats;
var camera, controls, scene, renderer;
var dev_orient;
var mesh, texture;
var clock = new THREE.Clock();
var mesh_geom = {};
var target_sight;
var pw = 90;
var ph = 88;
var start_row = 9;
var start_col = 9;
var tiles = 10;
var tiles_dl = 0;

var sky, sunSphere;
var distance = 400000;
var hud_sphere, hud_sphere_y, hud_sphere_z; 

var globe_renderer, globe_scene, globe_camera, globe_container;

var attributes = {
	displacement: {
		type: 'f', // a float
		value: [] // an empty array
	}
};
var uniforms = {
	amplitude: {
		type: 'f', // a float
		value: 0
	}
};

init();
animate();

function reverse(event) {
	event.preventDefault();
}

function stop(event) {
	event.preventDefault();
}

function init() {

	var parameters = {
		width: 2000,
		height: 2000,
		widthSegments: 250,
		heightSegments: 250,
		depth: 1500,
		param: 4,
		filterparam: 1
	};

	container = document.getElementById( 'container' );
	target_sight = document.getElementById( 'targetsight' );
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000000 );
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0x000000 );
	renderer.setSize( window.innerWidth, window.innerHeight );

	sky = new THREE.Sky();
	scene.add( sky.mesh );

	sunSphere = new THREE.Mesh( new THREE.SphereGeometry( 200000, 30, 30 ),
		new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: false }));
	sunSphere.position.y = -700000;
	sunSphere.visible = true;
	scene.add( sunSphere );

	updateSky();

	var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
	light.position.set( - 1, 1, - 1 );
	scene.add( light );

	waterNormalz = new THREE.ImageUtils.loadTexture( 'textures/dunes.jpg' );
	waterNormalz.wrapS = waterNormalz.wrapT = THREE.RepeatWrapping; 

	water = new THREE.Water( renderer, camera, scene, {
		textureWidth: 512, 
		textureHeight: 512,
		waterNormals: waterNormalz,
		alpha: 	0.9,
		sunDirection: light.position.clone().normalize(),
		sunColor: 0xffa030,
		waterColor: 0xf0af90,
		distortionScale: 20.0,
	} );

	mirrorMesh = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( parameters.width * 500, parameters.height * 500 ),
		water.material
	);

	mirrorMesh.add( water );
	mirrorMesh.rotation.x = - Math.PI * 0.5;
	mirrorMesh.translateZ(-150);
	scene.add( mirrorMesh );

	controls = new THREE.FirstPersonControls( camera );
	controls.movementSpeed = 80;
	controls.lookSpeed = 0.050;

	dev_orient = new THREE.DeviceOrientationControls(camera);
	
	camera.position.x = tiles/2 * pw + start_row * pw;
	camera.position.z = tiles/2 * ph + start_col * ph;
	camera.position.y = 400.0;
	camera.rotation.x = -1.0;

	var now = Date.now();
	var ddb_now = {};
	
	for (var r = start_row; r < tiles + start_row; r++) {
		for (var c = start_col; c < tiles + start_col; c++) {
			var key = pad(r,4) + '.' + pad(c, 4);
			
			ddb_now[key] = Date.now();

			dynamodb.getItem({'TableName': 'mars_test', Key: {'grid': {S: key}}}, function(err, data) {
				addline('getItem: ' + data.Item.grid.S  + ' ' + 
						(Date.now() - ddb_now[data.Item.grid.S]) + 'ms', aws_dynamo);
				
				if ( err ) {
					addline('ERROR: ' + err, aws_dynamo);
					console.log(err);
				}

				var g_now = Date.now();
				var coord = data.Item.grid.S.split('.');

				var geom = new THREE.PlaneBufferGeometry( pw, ph, pw - 1, ph - 1 );
				mesh_geom[data.Item.grid.S] = data.Item.depth.L;
		
				geom.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
				var vtz = geom.attributes.position.array;

				for ( var i = 0, j = 0, l = data.Item.depth.L.length; i < l; i ++, j += 3 ) {
					if (data.Item.depth.L[ i ]) {
						vtz[  j + 1 ] = parseFloat(data.Item.depth.L[ i ].N) * .033;// * h_scale;
					}
				}
		
				geom.applyMatrix( new THREE.Matrix4().makeTranslation( 
					(pw-1.0) * parseFloat(coord[0]), 
					-90.0, 
					(ph-1.0) * parseFloat(coord[1]))
				);
				geom.computeFaceNormals()
				geom.computeVertexNormals()

				var shaderMaterial = new THREE.ShaderMaterial({
					uniforms:     	uniforms,
					attributes:     attributes,
					vertexShader:   document.getElementById('scarybumpy').innerHTML,
					fragmentShader: document.getElementById('scaryfragment').innerHTML
				});				

				var msh = new THREE.Mesh( geom, shaderMaterial );
				scene.add( msh );
				tiles_dl++;
		
			});
		}	

	}


	container.innerHTML = "";
	container.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );


	// gl hud element
	var hud_material = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, color: 0x8888ff, 
							wireframe: true, transparent: true, opacity: .1, wireframeLinewidth: 2.0 });
	var hud_material_y = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, color: 0x88ff88, 
							wireframe: true, transparent: true, opacity: .1, wireframeLinewidth: 2.0 });
	
	var hud_material_z = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, color: 0xff8888, 
							wireframe: true, transparent: true, opacity: .1, wireframeLinewidth: 2.0 });
	
	hud_sphere = new THREE.Mesh( new THREE.SphereGeometry(14, 10, 10 ), hud_material );
	hud_sphere_y = new THREE.Mesh( new THREE.SphereGeometry(10, 6, 6 ), hud_material_y );
	hud_sphere_z = new THREE.Mesh( new THREE.SphereGeometry(6, 6, 6 ), hud_material_z );

	globe_container = document.getElementById( 'globe' );
	globe_camera = new THREE.PerspectiveCamera( 60, 1, 1, 10000 );
	globe_scene = new THREE.Scene();

	globe_renderer = new THREE.WebGLRenderer({alpha: true});
	globe_renderer.setClearColor( 0x000000, .2 );
	globe_renderer.setSize( 80,80 );

	globe_scene.add( hud_sphere );
	globe_scene.add( hud_sphere_y );
	globe_scene.add( hud_sphere_z );
	
	globe_container.appendChild(globe_renderer.domElement);

	setTimeout(watchTiles, 2000);

}



function watchTiles(e) {
	var d = document.querySelector('#hudmsg');
	console.log(tiles_dl);
	if ( tiles_dl !== tiles * tiles) {
		addline('Terrain still loading.', d);
		setTimeout(watchTiles, 1000);
	}
	else {	
		addline('Ready now for Mars exploration.', d);
		var x = document.querySelector('#ddbmeter');
		x.classList.remove('hudoff');
		
		x = document.querySelector('#opsmeter');
		x.classList.remove('hudoff');	}
}

function addline(e, d) {
  var list = d.querySelectorAll('li');
  var x = document.createElement('li');
  x.innerHTML = e;
  d.appendChild(x);
  
  for (var n=0; n < list.length; n++) {
    list[n].style.color = '#d1c4bb';
  }
  d.scrollTop = d.scrollHeight;

}

function updateSky() {
	// http://stackoverflow.com/questions/27348125/colors-output-from-webgl-fragment-shader-differ-significantly-across-platforms
	var uniforms = sky.uniforms;
	uniforms.turbidity.value = 2.0;
	uniforms.reileigh.value = 4;
	uniforms.luminance.value = 1;
	uniforms.mieCoefficient.value = .0043;
	uniforms.mieDirectionalG.value = .92;

	var inclination = .49;
	var azimuth = .40;
	var theta = Math.PI * (inclination - 0.5);
	var phi = 2 * Math.PI * (azimuth - 0.5);

	sunSphere.position.x = distance * Math.cos(phi);
	sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta); 
	sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta); 

	sunSphere.visible = false;

	sky.uniforms.sunPosition.value.copy(sunSphere.position);
}


function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	controls.handleResize();

}


function animate() {

	requestAnimationFrame( animate );

	render();
	//stats.update();

}

var frame = 0.0;

function render() {
	
	if ( first_time ) { //decent
		camera.position.y -= 1.0;
		globe_camera.position.z += 0.0625;
	}
	else {
		controls.update( clock.getDelta() );
		 hud_sphere.rotation.x = camera.rotation.x;
		 hud_sphere_y.rotation.y = camera.rotation.y;
		 hud_sphere_z.rotation.z = camera.rotation.z;
		 globe_camera.position = camera.position;
		 globe_camera.position.z = 24.0;
	}

	if ( camera.position.y < 21.0) {
		first_time = false;
	}

	if (camera.position.y < 20.0) {
		camera.position.y = 20.0;
	}
	
	if ( isMobile.any() ) {
		dev_orient.update();
	}
	
	water.material.uniforms.time.value += .0022251;
	water.render();

	uniforms.amplitude.value = Math.sin(frame);// * 1.2;
	barr.style.height = Math.abs((uniforms.amplitude.value * 2.0)) + 'em';
	hud_blank.style.height = 1.5 - (camera.position.y/500.0 * 1.2) + 'em';
	frame += 0.01;

	renderer.render( scene, camera );
	globe_renderer.render(globe_scene, globe_camera);

	altimeter.innerHTML = parseInt(camera.position.y);

}
