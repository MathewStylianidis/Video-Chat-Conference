
	var bStop = true;
	var bOldBrowser = false;
	var video;
	var streamRecorder;
	var webcamstream;
	var clientSocket; 
	var socketOpen = false;
	var bSendData1 = false;
	var bSendData2 = false;
	var userCanvas = new Array(); //associative array with the canvas of every user ------- KEY = USER ID
	var video;
	var clientId;
	var clientUsername;
	var idHeader; //id header that accompanies the frames sent to the server 
	var bCameraVisible; //set true if video component is visible
	var videoAccepted = false; //set true if user has accepted to share his camera media
	var closed = false;	

	video = document.getElementById("myVideo");

	video.style.display = "none";
	bCameraVisible = false;
	//black out camera outputs since there is no input/output 
	makeCameraBlack("blackCanvas");


	//make sendButton get clicked when enter button is pressed
	document.getElementById("textField")
	    .addEventListener("keyup", function(event) 
					{
						event.preventDefault();
						if (event.keyCode == 13) 
							document.getElementById("sendButton").click();
						
					});

	//establish connection with server
	establishSocketConnection("ws://192.168.1.64:3000/Server.java");

	// We set an empty object because old browsers might not implement media devices
	if (navigator.mediaDevices === undefined) 
		bOldBrowser = true;

	//check if getusermedia is supported
	if (!hasGetUserMedia()) 
		alert("getUserMedia is not implemented in this browser")


	//get objects to handle urls and user media
	window.URL = window.URL || window.webkitURL;


	navigator.getUserMedia = navigator.mediaDevices.getUserMedia ||  navigator.getUserMedia ||          
									 navigator.webkitGetUserMedia ||
									 navigator.mozGetUserMedia || 
									 navigator.msGetUserMedia;


	if (navigator.getUserMedia) 
	{
		if(bOldBrowser) //if browser is old and doesn't support mediaDevices.getUserMedia but only getUserMedia
			navigator.getUserMedia({audio: true, video: true}, setupVideo, onVideoFail);
		else
			navigator.mediaDevices.getUserMedia({ audio: true, video: true })
								.then(setupVideo)
								.catch(onVideoFail);
	}
	else
		alert ('failed to use video/audio source');




	//////////////////////////////////////FUNCTION DEFINITIONS//////////////////////////////////////




	//called when navigato.getUserMedia() fails to access the webcamera
	function onVideoFail(e) 
	{
		alert ('Webcam video loading failure.');
		bCameraVisible = false;
	}



	//return true if getusermedia is supported by browser. Otherwise return false
	function hasGetUserMedia() 
	{
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia 
			|| navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}





	function setupVideo(stream) 
	{
		videoAccepted = true;
		video.src = window.URL.createObjectURL(stream);
		video.width = window.screen.availWidth / 3;
		video.height = window.screen.availHeight / 3;
		webcamstream = stream;
		video.play();  

		setTimeout(function ()	{
						document.getElementById("blackCanvas").style.display = "none";
						video.style.display = "inline"; 
					} , 1500);

		bCameraVisible = true;
		bSendData2 = true;
	}


	function sendText()
	{ 			
		var textField = document.getElementById("textField");
		var text = textField.value;
		textField.value = "";
		
		if(text.trim() == "") //if string empty
			return;
		
		if(!socketOpen) //if there is no connection
		{
			alert("Failed to connect to server...Please try again later.");
			return;
		}
 
		
		var pastMessages = document.getElementById("pastMessages");
			
		if(text.charAt(0) == '/') //if the message is a special command (for example renaming a client)
		{
			var messageHeader = "req" + idHeader;

			if(text.substring(1) == "help")
			{		
				pastMessages.innerHTML += "<br><br>Command list<br>Change username: /rename=newName (maximum length 9 characters)<br>Clear chat: /clear";
				pastMessages.scrollTop = pastMessages.scrollHeight;
				return;
			}
			else if(text == "/clear")
			{
				pastMessages.innerHTML += "<br><br><br><br><br><br><br><br><br><br><br><br><br><br><br>";
				pastMessages.scrollTop = pastMessages.scrollHeight;
				return;
			}
			
			if(text.substring(1,7) == "rename")
			{	
				if(text.substring(8).length > 9)
				{
					pastMessages.innerHTML += "<br>System: maximum username length is 9 characters.";
					pastMessages.scrollTop = pastMessages.scrollHeight;
				}
				else
					clientSocket.send(messageHeader.concat(text)); //send text along with a "txt" header and your id

				return;
			}
			
			pastMessages.innerHTML += "<br>System: There is no such command. Type /help to get the command list.";
			pastMessages.scrollTop = pastMessages.scrollHeight; 
			
			return;
		}


		try
		{
			var messageHeader = "txt" + idHeader;
			pastMessages.innerHTML += "<br>You: " + text;
			pastMessages.scrollTop = pastMessages.scrollHeight;
			clientSocket.send(messageHeader.concat(text)); //send text along with a "txt" header and your id
		}
		catch(Exception)
		{
			console.log("Exception : " + Exception + "\n\n");
		}
	}

	//send a frame to the server
	function postVideoToServer(frame) 
	{ 
		try
		{
			var messageHeader = "img" + idHeader;
			clientSocket.send(messageHeader.concat(frame)); //send frame along with a "img" header and your id
		}
		catch(Exception)
		{
			console.log("Exception : " + Exception + "\n\n");
		}
	}


	function draw(v, cc, w, h, c, blackCanvas) 
	{
		cc.drawImage(v, 0, 0, w, h);  
	 
		if(bCameraVisible)
			postVideoToServer(c.toDataURL("image/jpeg"));
		else
			postVideoToServer(blackCanvas.toDataURL("image/jpeg"));
	 
		if(!bStop) 
			setTimeout( function() { draw(v, cc, w, h, c, blackCanvas) }, 50);   //50 * 20 = 1000 ==> draw canvas every 50 ms to have 20FPS
	}







	function startRecording()
	{      
		if(!socketOpen) //if there is no connection
		{
			alert("Failed to connect to server...Please try again later.");
			return;
		}

  		if(!bSendData2)// camera has not been accepted from user
			return; 

		while(!bSendData1); //wait until you receive id from the server

		//change the start button description to on/off 
		initSwitchButton();
 
		//remove b&w filter and blur
		video.style.filter = "grayscale(0%)";
		video.style.filter = "blur(0px)";
 

		var canvas = document.getElementById('hiddenCanvas');
		var canvasContext = canvas.getContext('2d');
		var width = video.videoWidth;
		var height = video.videoHeight;
		var blackCanvas = document.getElementById('blackCanvas');
 

		canvas.width = width;
		canvas.height = height; 

		bStop = false;
 
		draw(video, canvasContext, width, height, canvas, blackCanvas);   
	}


	function stopRecording()
	{
		bStop = true;
  
		setTimeout(function()	{
						var blackCanvas = document.getElementById('blackCanvas');
						postVideoToServer(blackCanvas.toDataURL("image/jpeg"));//send black frame after 1 second
						location.href = "../index.html";//redirect
					},1000); 
	}


	function establishSocketConnection(URL)
	{
		clientSocket = new WebSocket(URL); //create socket to server

		clientSocket.onopen = function (e) 
		{
			console.log("socket open");
			socketOpen = true;
		}

		clientSocket.onclose = function (e) 
		{
			socketOpen = false;
			alert ("You got disconnected from the server. ");
		}

		clientSocket.onerror = function(error) 
		{
			socketOpen = false;
			alert ("Error with connection with the server. ");
		};  	

		clientSocket.onmessage = function(e) 
		{	

			if(e.data.substring(0,2) === "id") //user was found . You can now send and receive data
			{
				var idLength =  Number(e.data.charAt(2)); //get id length
				var usernameLength = e.data.charAt(4 + idLength);

				if(idLength == 0)	
				{
					alert("Error during communication with server");
					return;							
				}

				clientId = e.data.substring(4, 4 + idLength); 
				clientUsername = e.data.substring(6 + idLength, 6 + idLength + usernameLength)
				//build header
				idHeader = "id" + idLength + "-" + clientId + usernameLength + "-" + clientUsername;
 
				bSendData1 = true;
			}
			else if(e.data.substring(0,5) == "close")
			{
				//user disconnected - remove his canvas
				var id = Number(e.data.substring(6));

				if(userCanvas[id] != undefined)
				{ 
					remove(userCanvas[id].getAttribute("id"));
					delete userCanvas[id];						
				}
			} 
			else  //if the message is a media
			{
				if(closed) return; 

				var mediaType = e.data.substring(0,3);
				var idLength = Number(e.data.charAt(5)); //get id length
				var usernameLength = Number(e.data.charAt(7 + idLength));
				var senderId;
				var senderUsername;

				senderId =  e.data.substring(7,7 + idLength);  //get id
				senderUsername = e.data.substring(9 + idLength, 9 + idLength + usernameLength); //get username
	 			
				if(mediaType == "img") 
				{
					var img = new Image();
					var senderExists = false;
					var senderCanvas;

					if(idLength == 0)
					{
						alert("Error during communication with server");
						return;							
					}	


					if((senderId in userCanvas) && (userCanvas[senderId] != undefined))
					{ 
						senderCanvas = userCanvas[senderId]; 				
					}
					else //if sender sends for the first time assign a new canvas for him
					{
						var div = document.getElementById("users"); //get the div element with the multiple canvas
						var canvas = document.createElement('canvas'); //create new canvas
						var ctx; //canvas context

						userCanvas[senderId] = canvas;
						div.appendChild(canvas);
						canvas.setAttribute("id", senderId);
						canvas.setAttribute("class", "vid");
						senderCanvas = canvas;	
					}							

					img.onload = function() 
					{	
						var initialRatio = this.width / this.height ;
						var height = video.height; //take the same height your own video has for the image received
						var width = height * initialRatio; //keep the width to height ratio the same as the initial image but resize it	
						strangerContext = senderCanvas.getContext('2d');
						senderCanvas.width = width;
						senderCanvas.height = height;

						// round the image corners - remove if this makes app too slow in frame processing
						roundedImage(strangerContext , 0,0,width,height,40);
						strangerContext.clip(); 

						strangerContext.drawImage(this, 0, 0, width, height);
						strangerContext.font = "15px serif";
						strangerContext.fillStyle = "#fff";
						strangerContext.fillText("User " + senderUsername, 25, 25);

					}


					img.src = e.data.substring(9 + idLength + usernameLength);
				}
				else if(mediaType == "txt")
				{
					var pastMessages = document.getElementById("pastMessages");
					pastMessages.innerHTML += "<br>" + senderUsername + ": " + e.data.substring(9 + idLength + usernameLength);
					pastMessages.scrollTop = pastMessages.scrollHeight;
				
				}
				else if(mediaType == "adm") //if it is a message from admin post it on the chat
				{ 
					var pastMessages = document.getElementById("pastMessages");
					pastMessages.innerHTML += "<br>System: " + e.data.substring(9 + idLength + usernameLength);
					pastMessages.scrollTop = pastMessages.scrollHeight;
				}
				else if(mediaType == "req") //a rename request was accepted. Change the id of the user.
				{
					closed = true; //do not receive data until you have changed the username so that you do not create a new canvas
					var newName = e.data.substring(17 + idLength + usernameLength);					
				
	
					if(clientId == senderId)
					{
						//rebuild id header
						clientUsername = newName;
						idHeader = "id" + idLength + "-" + clientId + clientUsername.length + "-" + clientUsername;					
					}
					 
					var pastMessages = document.getElementById("pastMessages");
					pastMessages.innerHTML += "<br>System: " + senderUsername + " changed his nickname to \"" + newName + "\"";
					pastMessages.scrollTop = pastMessages.scrollHeight;
					closed = false;
				}
			}
			
		}		 
	}						


	function makeCameraBlack(id)
	{
		var img = new Image();

		img.onload = function() 
		{	
			var canvas = document.getElementById(id);
			var canvasContext = canvas.getContext('2d');
			var width = window.screen.availWidth / 3;
			var height = window.screen.availHeight / 3;
			canvas.height = height;
			canvas.width = width;
			canvasContext.drawImage(this, 0, 0, width, height);
		}

		img.src = "../images/black.bmp";
	}


	function switchCamera()
	{
		if(!videoAccepted) return;

		if(document.getElementById("myVideo").style.display == "none")
		{
			document.getElementById("myVideo").style.display = "inline";
			document.getElementById("blackCanvas").style.display = "none"; 
			bCameraVisible = true;
		}
		else
		{
			document.getElementById("myVideo").style.display = "none"; 
			document.getElementById("blackCanvas").style.display = "inline";
			bCameraVisible = false;
		}
	}


	//draw rectangle with rounded corners so that the "Videos" (images in reality) are not square-ish
	function roundedImage(ctx,x,y,width,height,radius)
	{
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}


	function initSwitchButton()
	{
		var button = document.getElementById("on/off");
		button.setAttribute("onclick", "switchCamera()"); 
		button.innerHTML = "Camera on/off";			
	}

	//remove html element
	function remove(id) 
	{
		var elem = document.getElementById(id);
		return elem.parentNode.removeChild(elem);
	}

	


	function draw(v, cc, w, h, c, blackCanvas) 
	{
		cc.drawImage(v, 0, 0, w, h);  

		if(bCameraVisible)
			postVideoToServer(c.toDataURL("image/jpeg"));
		else
			postVideoToServer(blackCanvas.toDataURL("image/jpeg"));

		if(!bStop) 
			setTimeout( function() { draw(v, cc, w, h, c, blackCanvas) }, 50);   //50 * 20 = 1000 ==> draw canvas every 50 ms to have 20FPS
	}


