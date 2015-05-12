#Mars Terrain Flyover
##An experiment with WebGL, AWS and Spacecraft Data.

###Questions:

*Can I stream geometry out of a NoSQL database? Yes.
*Can I attach metadata to geometry after the fact in a NoSQL database? Yes.
*Can I track anonymous users? Yes.
*Can I layer UI elements over the WebGL renderer? Yes.
*Can I have multiple renderers? Yes.
*Does it work on mobile? Yes.
*Can I do stereoscopic on mobile (google cardboard)? Yes.
*Can I access the accelerometers and integrate them into the mobile version? Yes. 

Terrain data came from The Mars Orbiter Laser Altimeter, or MOLA. http://mola.gsfc.nasa.gov/
The data was massaged, tiled and then imported into AWS DynamoDB.

On page load, the user gets authenticated with AWS Cognito, obtains read-only access to the geometry data, and then starts to asynchronously download 100-144 tiles of terrain data. These get rendered using GLSL vertex and fragment shaders embedded as script tags. 

The UI readouts are kept updated in the render loop. Some UI elements are updated via DOM manipulation, others contain their own WebGL context.

On the desktop, you can look around with the mouse, left button moves forward, right button moves backward.

On mobile, the accelerometers kick in and will orient the scene based on orientation of the phone. Touch the screen to move forward. 

### Demo
[Desktop Version](http://noojo.com/labs/git/mars/mars_aws.html)
[Mobile Version)(http://noojo.com/labs/git/mars/mars_mobile.html)
[Google Cardboard Version/Stereoscopic](http://noojo.com/labs/git/mars/mars_stereo.html)

###Next:

*See if I can use Cognito to store data for anonymous users.
*Add user-defined models to the scene.
*More mobile features.
 

