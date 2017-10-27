# Video chat conference

This web application was developed for an academic project in the course Multimedia Technology in the Technological Educational Institute of Athens. Its purpose is to build a prototype for a website with rooms for online video chat conferences. In its current state only one room is added but adding more is trivial.

Please note:

*In the current state of the project only video and text is implemented, no audio.
*Peer-to-peer connections are not used so in order to make the application work the server's IP need to be public or the server needs to be in the same LAN with the clients joining the video chat room.
*The IP addresses in the client js file are hard coded and need to be changed in order for the web app to function properly.
*There are compatibility issues with certain browsers and their various editions.

General information about the repository structure:

*This application follows a server-client model. For the server side module, an early release of https://github.com/TooTallNate/Java-WebSocket is used, included in the server directory along with the Server.java file. The Server.java file makes use of the above-mentioned websocket repository and it the file that needs to run on the server.

*The client directory includes all the html, css and js files that the web server should have available.


 


