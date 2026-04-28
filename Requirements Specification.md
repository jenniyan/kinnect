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

#### Use Case 1 (Create User Account):
- Basic Flow:
    1. User select "Create Account".
    2. User enter the Phone number, Email, Password, User ID, and select "display name".
    3. User enter personal bio.
    4. System verifies the Phone Number, Email and User ID are not repeat with other user, and none of the Phone number, Email, Password, User ID are empty.
    5. System shows account successfully created.
    6. User select "return to homepage".
    7. Use case end
- Alternative Flow:
  - A1: Optional bio
      1. At step 3 of basic flow, user didn't enter personal bio.
      2. System continues to step 4 of basic flow.
  - A2: Anonymous
      1. At step 2 of basic flow, user select "anonymous" instead of "display name".
      2. System continues to step 3 of basic flow.
- Exceptional Flow: 
  - E1: Repeated information
      1. At step 4 of basic flow, system verified that at least one of the Phone number, Email, Password, User ID is repeated with other users.
      2. System returns to step 2 and shows "repeated" message near the repeated information.
      3. System allows a re-entry of profile information or terminate the session.
  - E2: Missing information
      1. At step 2 of basic flow, user leave at least one of the Phone number or Email, Password, User ID blank.
      2. System verified that at least one of these information are blank
      3. System returns to step 2 and shows "can't be empty" message near the emmpty information.
      4. System allows a re-entry of profile information or terminate the session.

#### Use Case 2 (Login Account):
- Basic Flow:
    1. User select "Login Account".
    2. User enter the Phone number in first box and Password in second box.
    3. System verifies the Phone number and Password are belongs to an existing account.
    4. System redirect the page to the homepage after login.
    5. Use case end
- Alternative Flow:
  - A1: Login by Email
    1. At step 2 of basic flow, user enter the Email in first box and Password in second box.
    2. System verifies the Email and Password are belongs to an existing account.
    3. System continues to step 4 of basic flow.
- Exceptional Flow:
  - E1: Invalid password
    1. At step 3 of basic flow, system determines that the Password didn't match the Phone number or Email
    2. System returns to step 2 and shows "Invalid account or password" message.
    3. System allows a re-entry of information or terminate the session.
  - E2: Invalid Account
    1. At step 3 of basic flow, system determines that the Phone number or Email didn't correspond to an existing account.
    2. System returns to step 2 and shows "Invalid account or password" message.
    3. System allows a re-entry of information or terminate the session.

#### Use Case 3 (Edit Profile):
- Basic Flow:
    1. 
    2. 
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 4 (Interest Tags):
- Basic Flow:
    1. 
    2. 
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 5 (Real-time Geolocation Map):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 6 (User Discovery):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 7 (Messaging System):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 8 (GPS Routing Feature):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 7 (External Chat Transfer):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 
