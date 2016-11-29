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

# Resource types

* 0: red triangle - `#C2412D`

* 1: yellow square - `#D1AA34`

* 2: green circle - `#81A844`

* 3: purple plus - `#A46583`

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

* `type`: the type of item or resource (0-3)

# Delta Game State

After the initial game state, the server will broadcast changes to the game state at ~20Hz. These messages can be of varying length but must begin with the following header: `00000000`. Any number of delta packets can be chained after the header in the following format:

    [00000000] [num p] [num i] [pDelta] ... [iDelta] ... [round_progress]

## pDelta

A player delta packet.

    [id] [contents] [posX]-[posX]? [posY]-[posY]? [action bar]? [animation]? [nick_length]? [nick]...[nick]

* `id`: the player's id (in range 0-255 inclusive)

* `contents`: describes the packet contents in this format:


    xx00xxxx
	||  ||||
	||  |||Contains posX (2 bytes)
	||  ||Contains posY (2 bytes)
	||  |Contains action bar (1 byte)
	||  Contains at least one animation (1 byte)
	|Player just joined (contains nick as well)
	Player was killed (pDelta == 2 bytes)

* `posX`: the player X coordinate (as a part of the total width)

* `posY`: the player Y coordinate (as a part of the total height)

* `action bar`: a player's action bar, percent complete out of total possible

* `animation`: client should display some animation to indicate task completion: (*not implemented yet*)


    0000000x
	       |
           resource acquired

* `nick_length`/`nick`: if the player just joined, this packet will contain the new nick


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

# Secret packets

These are packets that are sent to individual players and contain any information that should only be seen by the individual.

The format is the following:

    [00000010] [points]x4 [inv res0]-[inv res0] ... [inv res3]-[inv res3] [technology] [workers]


# Server limits

* The maximum player count may not exceed 256

* The maximum item count may not exceed 65554

* No more than 256 items may be created/destroyed per tick

* Technology level / worker count can not exceed 256

# Client Control - Movement

There are five control signals (4 movement and one action). On the keyboard they should be represented by WASD + Space. The client should send the current state at a rate of ~20Hz. This should be sent in a single byte (converted to a character):

    000xxxxx
	   |||||
	   ||||Up
	   |||Left
	   ||Right
	   |Down
	   Action

# Client Control - Investing

After a client receives a new round packet, the client should refrain from sending movement packets until this packet has been sent. The user must select which investments to make and then click 'ok' in order to send the packet. The format is as follows:

    10000000 [technology] [workers]

`technology` and `workers` represent the level of investment in each category. Both of these values are validated server-side.
