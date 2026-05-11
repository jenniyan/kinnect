# Component Functions
# Frontend Components
## Map UI
This component generally provide functions for UI of real-time geolocation map, including live map and pins on it
## Profile UI
This component generally provide functions for UI of user profile, including interfaces to display bio, tag, and personal information; and buttons to make changes to personal information.
## Chat UI
This component generally provide functions for UI of messaging system, including interfaces of messaging groups and buttons that provide interaction of messaging with different users.
## Video UI
This component generally provide functions for UI of video, including

# Backend Components
## User service
This component generally provide functions to handle changes in user profile, such as: creating accounts, logging in, updating profiles, toggling anonymous mode, and managing block lists.
## Location service
This component generally provide functions to receives GPS coordinates from every active user's phone every few seconds, stores them in the fast location cache, shows all non-anonymous user's location with a range, and powers GPS routing.
## Tag service
This component generally provides functions to maintains the full list of predefined interest categories, allows users to create custom tags under those categories, and handles tag search. Also showing users with shared tag.
## Chat service
This component generally provides functions to delivers messages between users instantly by websocket, include 1-1 chat, group chat, and generates the external links or handles needed for the Instagram/WeChat export feature.

# Database Components
## User database
This component is the database to stores user profiles, including credentials, profile info, tag selections, block lists.
## Location cache
This component is the temporary memory that stores GPS coordinates.
## Message database
This component is the database to stores full chat history.
## Media storage
This component is the storage to store video files for Location-Triggered Video Posts.
