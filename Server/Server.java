import java.io.*;
import java.net.InetSocketAddress;
import java.net.UnknownHostException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.ArrayList;
import java.util.concurrent.Semaphore;
import java.util.Iterator;

import org.java_websocket.WebSocket;
import org.java_websocket.WebSocketImpl;
import org.java_websocket.drafts.Draft;
import org.java_websocket.drafts.Draft_17;
import org.java_websocket.framing.FrameBuilder;
import org.java_websocket.framing.Framedata;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;




public class Server extends WebSocketServer 
{
	private class Conn
	{
		public WebSocket socket;
		public String id;
		public String username;

		public Conn(String i, String name, WebSocket s)
		{
			socket = s;
			id = i;
			username = name;
		}

		public void setUsername(String newName) { username = newName; }
	}
	
	//number of connections
	private static int connectionCounter = 0; 
	private static int idCounter = 0; 
	private static final int MAX_GROUP_CLIENTS = 4;
	private static ArrayList<Conn> connections;
	private static Semaphore semaphore;
	private static Semaphore addSem;

	public Server( int port) throws UnknownHostException 
	{
		super( new InetSocketAddress(port));
		connections = new ArrayList<Conn>(MAX_GROUP_CLIENTS); //maximum MAX_GROUP_CLIENTS users in group chat (could pass with constructor)
		semaphore = new Semaphore(1, true);
		addSem = new Semaphore(1, true);
	}


	@Override
	public void onOpen(WebSocket conn, ClientHandshake handshake )  
	{		
		String id = findAvailableId();
 		
		try
		{
			addSem.acquire(); //block so that one user gets in at a time
			if(connections.size() == MAX_GROUP_CLIENTS) //if max users have been reached
			{
				removeConnection(conn);
				return;
			}			
			connections.add(new Conn(id, id, conn));
			addSem.release();

			conn.send("id" + id.length() + "-" + id + id.length() + "-" + id); //send back id with username (same with id at first)
			conn.send("admid5-Admin3-ADMYour username is " + id + ". Type /help to get the command list."); //send back id in chat	
			sendToAll("admid5-Admin3-ADMUser " + id + " has entered the room.", conn);
		}
		catch(InterruptedException e)
		{
			System.out.println("Exception : " + e.toString());
		}		
		catch(Exception e)
		{
			System.out.println("Exception : " + e.toString());
		}		
		

		connectionCounter++;
		System.out.println( "///////////Opened connection number" + connectionCounter);	
	
	
		
	}

	@Override
	public void onClose(WebSocket conn, int code, String reason, boolean remote ) 
	{
			 
		try
		{
			String username = getConnection(conn).username;
			String id = removeFromList(conn); //remove connection from array list ;
			sendCloseToAll(id);	
			sendToAll("admid5-Admin3-ADMUser " + username + " has left the room.", conn);
			System.out.println( "closed" );
		}
		catch(InterruptedException e)
		{
			System.out.println("Exception : " + e.toString());
		}		
	
	}



	@Override
	public void onError(WebSocket conn, Exception ex ) 
	{
		String id = removeFromList(conn); //remove connection from array list ;
		sendCloseToAll(id);
		System.out.println( "Error:" );
		ex.printStackTrace();



	}

	@Override
	public void onMessage(WebSocket conn, String message ) 
	{
		try
		{
			sendToAll(message,conn);
		}
		catch(InterruptedException e)
		{
			System.out.println("Exception : " + e.toString());
		}

	}

 
	//broadcast to all clients 
	public void sendToAll(String text, WebSocket sender) throws InterruptedException
	{	
		boolean sendToSender = false; 
		int idLength = Integer.parseInt(text.charAt(5) + ""); //extract number of id digits
		int usernameLength = Integer.parseInt(text.charAt(7 + idLength) + "");
		String id = text.substring(7,7 + idLength); //extract id
		

		if(text.substring(0,3).equals("req")) //if it is a rename request
		{ 
			//handle request
			String newName = text.substring(17 + idLength + usernameLength); //extract new username
			boolean exists = false;
			int i,index;
			

			i = index = 0;
			for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
			{
				Conn c = iterator.next();
				 
				if(c.username.equals(newName))
				{
					exists = true;
					break;
				}  	
		
				if(c.id.equals(id))
					index = i;

				i++;	
			}


			if(exists || newName.equals("Admin"))
			{
				//tell the sender that his request is rejected
				sender.send("admid5-Admin3-ADMRequest rejected. Username unavailable."); //send back id in chat	
				return;
			}
			 
			//replace previous username with new one			 
			connections.get(index).setUsername(newName);
  

			sendToSender = true; // the message will be forwarded to the sender as well
		}

 	 	
		for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
		{
			Conn c = iterator.next();
			
			//send message to anyone but the sender
			if(!c.id.equals(id) || sendToSender)
				c.socket.send(text);   
		}

	}
	
	public void sendCloseToAll(String id)
	{
		for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
		{
			Conn c = iterator.next();
			c.socket.send("close-" + id);   
		}
		
	}


	public synchronized String removeFromList(WebSocket conn)
	{
		for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
		{
			Conn c = iterator.next();

			if(c.socket == conn)
			{
				iterator.remove();
				return c.id;
		 	}
		}

		return null;
	}


	private String findAvailableId()
	{
		String id = String.valueOf(idCounter++);	

		//O(n^2) to find the next available id number if someone has taken it as a username
		for(int i = 0; i < connections.size(); i++)
		{
			for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
			{
					Conn c = iterator.next();

					if(c.username.equals(id))
					{
						id = String.valueOf(idCounter++); 	
					}
			}	
		}

		return id;
	}

	private Conn getConnection(WebSocket conn)
	{
		for( Iterator<Conn> iterator = connections.iterator(); iterator.hasNext();)
		{
			Conn c = iterator.next();

			if(c.socket == conn)
				return c;

		}

		return null;
	}


	public static void main( String[] args ) throws  UnknownHostException 
	{
		WebSocketImpl.DEBUG = false;
		int port;
		
		try 
		{
			port = new Integer( args[ 0 ] );

		}
		catch ( Exception e ) 
		{
			System.out.println( "No port specified. Defaulting to 3000" );
			port = 3000;
		}

		new Server(port).start();
	}

	

}
