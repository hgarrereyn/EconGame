# Specification for client - server communication

# Initiating the connection
1. Client opens a WebSocket connection to the server.
2. Server immediately sends a `REQUEST_NICK` frame and provides the id it will use to track the client:
        {
			type: 'REQUEST_NICK',
			data: {
				id: '<id assigned to client>'
			}
		}
3. Client responds with a `PROVIDE_NICK` frame and provides it's nick (which does not need to be mutually exclusive in the player pool):
        {
			type: 'PROVIDE_NICK',
			data: {
				nick: '<nick>'
			}
		}
4. Once the server receives the `PROVIDE_NICK` frame it will begin sending game states and listening for client controls.

# Initial Game State

The server will broadcast a frame containing the entire game state after the handshake completes.

    [00000001] [num p] [num i]-[num i] [pInitial] ... [iInitial] ...

## pInitial

A player initial packet

    [id] [nick_length] [nick]-...-[nick] [posX]-[posX] [posY]-[posY]

## iInitial

An item initial packet

    [id]-[id] [posX]-[posX] [posY]-[posY] [type]

* `id`: the id of the item (unique in this case)

* `posX`: the item X coordinate

* `posY`: the item Y coordinate

* `type`: the type of item or resource:


000000xx

00: resource 0
01: resource 1
10: resource 2
11: resource 3

# Delta Game State

After the initial game state, the server will broadcast changes to the game state at ~20Hz. These messages can be of varying length but must begin with the following header: `00000000`. Any number of delta packets can be chained after the header in the following format:

    [00000000] [num p] [num i] [pDelta] ... [iDelta] ...

## pDelta

A player delta packet.

    [id] [contents] [posX]-[posX]? [posY]-[posY]? [action bar]? [animation]?

* `id`: the player's id (in range 0-255 inclusive)

* `contents`: describes the packet contents in this format:


    x000xxxx
	|   ||||
	|   |||Contains posX (2 bytes)
	|   ||Contains posY (2 bytes)
	|   |Contains action bar (1 byte)
	|   Contains at least one animation (1 byte)
	Player was killed (pDelta == 2 bytes)

* `posX`: the player X coordinate (as a part of the total width)

* `posY`: the player Y coordinate (as a part of the total height)

* `action bar`: a player's action bar, percent complete out of total possible

* `animation`: client should display some animation to indicate task completion:


    0000000x
	       |
           resource acquired


## iDelta

An item delta packet.

**Format for a new item (same as an iInitial packet):**

    [id]-[id] [posX]-[posX] [posY]-[posY] [type]

* `id`: the id of the item (unique in this case)

* `posX`: the item X coordinate

* `posY`: the item Y coordinate

* `type`: the type of item or resource:


    000000xx

	00: resource 0
	01: resource 1
	10: resource 2
	11: resource 3


**Format for an existing item:**

    [id]-[id]

* `id`: the item id (recognized)

*This packet indicates that the item has been acquired (removed)*

# Server limits

* The maximum player count may not exceed 256

* The maximum item count may not exceed 65554

* No more than 256 items may be created/destroyed per tick

# Client Control - Movement

There are five control signals (4 movement and one action). On the keyboard they should be represented by WASD + Space. The client should send the current state at a rate of ~20Hz. This should be sent in a single byte (converted to a character):

    000xxxxx
	   |||||
	   ||||Up
	   |||Left
	   ||Right
	   |Down
	   Action
