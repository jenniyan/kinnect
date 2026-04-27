# Kinnect: The Geolocator for Finding Friends
## Team Members
- Jennifer Yan (jenniy16@uci.edu)
- Zhengyu Dong (zhengyd6@uci.edu)
- Niharika Yalla (yallan@uci.edu)
- Yuxuan Huang (yuxuah27@uci.edu)
- Xinlei Liang (xinleil2@uci.edu)

## Executive Summary

Kinnect is a mobile application designed to connect people in real life through shared interests using live geolocation. Unlike traditional friend-finding apps that rely on existing contacts, Kinnect enables users to discover and interact with nearby individuals based on hobbies, activities, or custom-defined tags (e.g., programming, pickleball, biking, photography).

The app targets socially active individuals, students, hobbyists, and newcomers to a community who want to meet like-minded people nearby. By displaying nearby users on a map in real time, Kinnect encourages spontaneous, in-person social interactions.

### Core features include:
- Real-time map displaying nearby users with shared interests
- Customizable tags and personal bios
- Anonymous or real-name profiles
- In-app messaging and group chats
- GPS-based routing to meetups
- Ability to transition conversations to external apps (e.g., Instagram, WeChat)
- User safety features such as blocking

### Assumptions:
- Users are willing to share their live location within a configurable radius
- Users have smartphones with GPS capabilities
- Internet connectivity is available for real-time updates

## Application Context

### Platform
#### Mobile application for:
- IOS
- Android
#### Hardware Requirements
- Smartphone with:
  - GPS/location services
  - Internet connectivity (Wi-Fi or cellular)
#### External Dependencies
Integration with:
- For chat transfer:
  - Instagram
  - Wechat
  - WhatsApp
  - Messages
  - Discord
  - Telegram
- Map services:
  - Google Maps API
  - Apple Maps API
#### Environmental Constraints
- Requires user permission for:
  - Location tracking
  - Notifications
- Performance depends on:
  - Network latency
  - GPS accuracy
- Privacy regulations (e.g., location data handling) must be respected

### Functional Requirements

#### 1. User Account Management
- Users shall be able to:
  - Create an account (email or phone-based)
  - Log in and log out
  - Edit profile information
  - Block other users (this entails your profile not being locatable/viewable/message-able by a blocked user)
  - Toggle between anonymous or display name
- Thus user accounts should have:
  - Phone Number or Email
  - Password
  - User ID (unique)
  - Display name (which is optional if anonymous)
  - Bio

#### 2. Interest Tags
- Users shall be able to:
  - Select predefined interest categories (e.g guitar, crocheting)
  - Create custom tags under predefined interest categories
  - Add and remove tags from their profile
- Thus iinterest tags should be:
  - Searchable
  - Instantiable/customizable

#### 3. Real-time Geolocation Map
- This system shall:
  - Display users on a map within a user-defined radius
    - If any user would like to disable location sharing, they location will be hidden. However, those with hidden locations will not have access to those with visible locations
  - Update user positions in real time
- To support this system, we will need:
  - User location
  - Visibility radius

#### 4. User Discovery
- Users shall be able to search for pre-defined interest tags or specific tags
- Users with shared interest tags shall be displayed on the map, with an indication of which tag(s) they have in common

#### 5. Messaging System
- Users shall be able to:
  - Initiate chats with users within range
  - Create group chats based on shared interests
- The system shall:
  - Support real-time messaging

#### 6. GPS Routing Feature (Custom Feature #1)
- The system shall:
  - Provide navigation routes between users with shared interests
- Users shall be able to:
  - Accept or decline routing requests
 
#### 7. External Chat Transfer (Custom Feature #2)
- Users shall be able to:
  - Export conversations to external apps (Instagram, WeChat)
- The system shall:
  - Provide links or handles for transition
  
### Use Cases

#### Use Case 1 (User Account Management):
- Basic Flow:
    1.
    2.
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 2 (Interest Tags):
- Basic Flow:
    1.
    2.
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 3 (Real-time Geolocation Map):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 4 (User Discovery):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 5 (Messaging System):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 6 (GPS Routing Feature):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 7 (External Chat Transfer):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 
