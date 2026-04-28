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
  - Bio (optional)
  - External application account information (optional)
    - This feature is used for external app chat transfer

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
    7. Use case end.
- Alternative Flow:
  - A1: Optional Bio
      1. At step 3 of basic flow, user didn't enter personal bio.
      2. System continues to step 4 of basic flow.
  - A2: Anonymous Option
      1. At step 2 of basic flow, user select "anonymous" instead of "display name".
      2. System continues to step 3 of basic flow.
- Exceptional Flow: 
  - E1: Repeated Information
      1. At step 4 of basic flow, system verified that at least one of the Phone number, Email, Password, User ID is repeated with other users.
      2. System returns to step 2 and shows "repeated" message near the repeated information.
      3. System allows a re-entry of profile information or terminate the session.
  - E2: Missing Information
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
    5. Use case end.
- Alternative Flow:
  - A1: Login by Email
    1. At step 2 of basic flow, user enter the Email in first box and Password in second box.
    2. System verifies the Email and Password are belongs to an existing account.
    3. System continues to step 4 of basic flow.
- Exceptional Flow:
  - E1: Invalid Password
    1. At step 3 of basic flow, system determines that the Password didn't match the Phone number or Email
    2. System returns to step 2 and shows "Invalid account or password" message.
    3. System allows a re-entry of information or terminate the session.
  - E2: Invalid Account
    1. At step 3 of basic flow, system determines that the Phone number or Email didn't correspond to an existing account.
    2. System returns to step 2 and shows "Invalid account or password" message.
    3. System allows a re-entry of information or terminate the session.

#### Use Case 3 (Edit Profile):
- Basic Flow:
    1. User open their profile page.
    2. User select "Edit Profile".
    3. User could change at least one of the Phone number, Email, Password, User ID, and Anonymous option.
    4. User select "Save".
    5. System validates the new information.
    6. System redirect the page to the profile page.
    7. Use case end.
- Alternative Flow:
  - A1: Invalid Input
    1. At step 3 of basic flow, user entered information with invalid format, leave it empty, or repeated with other user.
    2. System highlight error and prevent submission.
    3. User correct the information and submit again.
- Exceptional Flow:
  - E1: Cancel Editing
    1. At step 4 of basic flow, user click "Cancel" instead of "Save".
    2. System prompt to confirm the discard of change.
    3. Profile revert to its original state without updates.
  - E2: Session Time-out
    1. System terminates session during editing due to inactivity.
    2. System asks user to re-authenticate before saving, optionally saving input locally.

#### Use Case 4 (Block Other Users):
- Basic Flow:
    1. 
    2. 
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 5 (Interest Tags):
- Basic Flow:
    1. 
    2. 
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 6 (Real-time Geolocation Map):
- Basic Flow:
- Alternative Flow:
- Exceptional Flow: 

#### Use Case 7 (User Discovery):
- Basic Flow:
  1. User selects "User Discovery".
  2. System displays nearby users based on the user’s current location and interests.
  3. User browses the list or map of discovered users.
  4. User selects one discovered user to view more details.
  5. System displays the selected user’s public profile information.
  6. Use case end.
- Alternative Flow:
  A1: Filter Discovery Results
    1. At step 3 of basic flow, user applies filters such as distance, shared interests, or age range.
    2. System updates the discovery results according to the selected filters.
    3. System continues to step 3 of basic flow.

  A2: Search by Specific Interest
    1. At step 2 of basic flow, user enters or selects a specific interest.
    2. System displays only users matching that interest.
    3. System continues to step 3 of basic flow.
- Exceptional Flow:
  E1: No Users Found
    1. At step 2 of basic flow, system determines that there are no nearby users matching the current location or interests.
    2. System shows a "No users found" message.
    3. System allows the user to refresh, adjust filters, or terminate the session.

  E2: Location Unavailable
    1. At step 2 of basic flow, system determines that the user’s current location is unavailable or location permission is denied.
    2. System shows a "Location unavailable" message.
    3. System allows the user to enable location service, retry, or terminate the session.

#### Use Case 8 (Messaging System):
- Basic Flow:
  1. User selects "Messaging System".
  2. System displays the user’s existing chats or available contacts.
  3. User selects a chat or another user to start a conversation.
  4. System opens the chat window.
  5. User enters a message and selects "Send".
  6. System sends the message to the selected user or group.
  7. System displays the new message in the conversation.
  8. Use case end.
- Alternative Flow:
  A1: Start a New Chat
    1. At step 3 of basic flow, user selects a new user instead of an existing chat.
    2. System creates a new conversation window.
    3. System continues to step 4 of basic flow.
  A2: Group Messaging
    1. At step 3 of basic flow, user selects a group chat.
    2. System opens the selected group conversation.
    3. System continues to step 5 of basic flow.
- Exceptional Flow: 
  E1: Message Send Failure
    1. At step 6 of basic flow, system fails to send the message because of network or server issues.
    2. System shows a "Message failed to send" message.
    3. System allows the user to retry sending the message or terminate the session.
  E2: Empty Message
    1. At step 5 of basic flow, system determines that the message input is empty.
    2. System shows a "Message cannot be empty" message.
    3. System returns to step 5 and allows the user to re-enter the message.
#### Use Case 9 (GPS Routing Feature):
- Basic Flow:
  1. User selects another user from the map or chat who shares interests.
  2. User selects “Request Route” or “Navigate”.
  3. System sends a routing request to the selected user.
  4. The selected user receives a notification with options to accept or decline.
  5. Selected user accepts the routing request.
  6. System retrieves both users’ locations.
  7. System generates a navigation route using map services.
  8. System displays the route on the map for the requesting user.
  9. Use case end.
- Alternative Flow:
  - A1: Receiver initiates routing
    1. At step 2, instead of the first user initiating, the second user selects “Request Route”.
    2. System continues from step 3 of the basic flow.
  - A2: Continuous route updates
    1. After step 8, system continuously updates the route as users move in real time.
    2. Use case continues until navigation is stopped.
- Exceptional Flow:
  - E1: Routing request declined
    1. At step 4, selected user declines the request.
    2. System notifies the requesting user that the request was declined.
    3. Use case ends.
  - E2: Location unavailable
    1. At step 6, system detects that one or both users have disabled location services.
    2. System displays an error message: “Location unavailable for routing.”
    3. System cancels routing request.
    4. Use case ends.
  - E3: Network or API failure
    1. At step 7, system fails to retrieve route due to network or map API issue.
    2. System displays “Unable to generate route. Try again later.”
    3. Use case ends.

#### Use Case 10 (External Chat Transfer):
- Basic Flow:
  1. User opens an existing chat with another user.
  2. User selects “Transfer Chat” or “Move to External App”.
  3. System displays a list of supported external apps (e.g., Instagram, WeChat, WhatsApp, Messages, Discord, Telegram).
  4. User selects a preferred external platform.
  5. System generates or retrieves the user’s external contact information (e.g., username, link).
  6. System shares this information with the other user in chat.
  7. Users continue conversation on the selected external platform.
  8. Use case end.
- Alternative Flow:
  - A1: Manual handle entry
    1. At step 5, if external account is not linked, system prompts user to manually enter their handle.
    2. User enters their external account information.
    3. System continues to step 6.
  - A2: Both users agree before transfer
    1. After step 4, system requests confirmation from the other user.
    2. Other user accepts transfer.
    3. System continues to step 5.
- Exceptional Flow:
  - E1: Missing external account info
    1. At step 5, user does not provide required contact information.
    2. System displays “External account information required.”
    3. System allows re-entry or cancellation.
  - E2: Transfer declined by other user
    1. At step 6, the other user declines to move to an external platform.
    2. System notifies initiating user.
    3. Conversation continues within the app.
    4. Use case ends.
