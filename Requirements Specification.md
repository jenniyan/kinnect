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
 
#### 8. Location-Triggered Video Posts (Custom Feature #3)
- Users shall be able to:
  - Record or upload a short video at their current location
  - Attach the video to a precise GPS coordinate
  - Add an optional tag or caption
  - Choose visibility settings(public, interest-based, friends-only)
  - Delete or edit their posted videos
- The system shall:
  - Detect when a user enters the radius of a location-anchored video
  - Display a pop-up preview
  - Allow users to view, like, or start a chat with the video creater
  - prevent video triggering if the viewer has blocked the creator
  - Prevent triggering for users who disabled location sharing
  
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
    3. System revert Profile to its original state without updates.
  - E2: Session Time-out
    1. System terminates session during editing due to inactivity.
    2. System asks user to re-authenticate before saving, optionally saving input locally.

#### Use Case 4 (Block Other Users):
- Basic Flow:
    1. User open their friend list.
    2. User select the friend they want to block.
    3. User select "Block the User".
    4. System shows a confirmation dialog.
    5. User select "Yes".
    6. System validates the blocking status of user.
    7. Use case end.
- Alternative Flow:
  - A1: Multiple Blocking
    1. At step 2 of basic flow, user select "Block Users".
    2. User select friends in the list that they want to block.
    3. System shows a confirmation dialog.
    4. User select "Yes".
    5. System validates the block list of user.
- Exceptional Flow:
  - E1: Not Confirm the Blocking
    1. At step 5 of basic flow, user instead select "No". 
    3. System revert blocking status to its original state without updates.

#### Use Case 5 (Add Interest Tags):
- Basic Flow:
    1. User open their profile page.
    2. User select "Edit Interest Tags"
    3. User types a keyword into the search bar to find an existing interest tag.
    4. User select desired tagsfrom search result.
    5. System validates the selection, adds tags to the profile, refresh the display.
    6. Use case end.
- Alternative Flow:
  - A1: Create Non-existing Tag
    1. At step 4 of the basic flow, user searches for a tag that does not exist.
    2. System presents a "Create New" option.
    3. User clicks "Create New," enters the new tag name and chooses a category, then clicks Save.
    4. System creates the new tag and assigns it.
  - A2: Select from Suggested Categories
    1. At step 3 of basic flow, user clicks into the tag component to view all available tags.
    2. User selects a specific Tag Category (e.g., "Sports") to filter tags.
    3. User selects a tag from the filtered list.
    4. System continues to step 5 of basic flow.
  - A3: Multi-Select Tags
    1. At step 4 of basic flow and step 3 of A2, user searches and selects one tag.
    2. The component remains open, allowing the user to search and select multiple tags before closing.
- Exceptional Flow:
  - E1: User Cancel Assignment
    1. User clicks "Edit Interesting Tag," but decides not to select one.
    2. User clicks "Cancel" or clicks outside the component, abandoning the addition.
  - E2: Tag Limit Exceeded
    1. User tries to add a new tag.
    2. System identifies that the profile already has the maximum allowable tags
    3. System displays an error message: "Max tags exceeded".
    4. User must delete an existing tag first.
  - E3: Tag Name Conflict
    1. User attempts to create a new tag with repeated name.
    2. System stops the creation and notifies the user of the naming conflict.
  - E4: Duplicate Tag Assignment
    1. User selects a tag already added in the profile.
    2. System displays an error: "Tag already added".

#### Use Case 6 (Real-time Geolocation Map):
- Basic Flow:
  1. User selects "Map" or opens the home screen map view.
  2. System requests and verifies the user's location permissions.
  3. System retrieves the user's current GPS location.
  4. System displays a real-time map centered on the user's location.
  5. System displays nearby users within the user-defined radius.
  6. System continuously updates user positions in real time.
  7. User views nearby users and optionally selects one for more details.
  8. Use case end.
 

- Alternative Flow:
  - A1: Adjust Visibility Radius
    1. At step 5 of basic flow, user adjusts their visibility radius.
    2. System updates the map to reflect the new radius and refreshes displayed users.
    3. System continues to step 6 of basic flow.

  - A2: Hide Location
    1. At step 2 of basic flow, user has disabled location sharing.
    2. System hides the user's location from others.
    3. System prevents the user from viewing nearby users.
    4. Use case ends.
   
  - A3: Manual Refresh
    1. At step 6 of basic flow, user selects "Refresh map".
    2. System re-fetches nearby users and updates their positions.
    3. System continues to step 6 of basic flow.
   
- Exceptional Flow:
-  E1: Location Permission Denied
  1. At step 2 of basic flow, detects that location permission is denied.
  2. System displays "Location permission required to use map".
  3. System prompts the user to enable location services or terminate the session.
  - E2: GPS Unavailable
    1. At step 3 of basic flow, systems canonot retrieve accurate GPS data.
    2. System displays "Unable to determine location".
    3. System allows the user to retry or terminate the session.
  - E3: No nearby Users
    1. At step 5 of basic flow, system determines there are no users within the radius.
    2. System displays "No nearby users found".
    3. System allows user to adjust radius, refresh, or terminate the session.

#### Use Case 7 (User Discovery):
- Basic Flow:
  1. User selects "User Discovery".
  2. System displays nearby users based on the user’s current location and interests.
  3. User browses the list or map of discovered users.
  4. User selects one discovered user to view more details.
  5. System displays the selected user’s public profile information.
  6. Use case end.
- Alternative Flow:
  - A1: Filter Discovery Results
    1. At step 3 of basic flow, user applies filters such as distance, shared interests, or age range.
    2. System updates the discovery results according to the selected filters.
    3. System continues to step 3 of basic flow.

  - A2: Search by Specific Interest
    1. At step 2 of basic flow, user enters or selects a specific interest.
    2. System displays only users matching that interest.
    3. System continues to step 3 of basic flow.
- Exceptional Flow:
  - E1: No Users Found
    1. At step 2 of basic flow, system determines that there are no nearby users matching the current location or interests.
    2. System shows a "No users found" message.
    3. System allows the user to refresh, adjust filters, or terminate the session.

  - E2: Location Unavailable
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
  - A1: Start a New Chat
    1. At step 3 of basic flow, user selects a new user instead of an existing chat.
    2. System creates a new conversation window.
    3. System continues to step 4 of basic flow.
  - A2: Group Messaging
    1. At step 3 of basic flow, user selects a group chat.
    2. System opens the selected group conversation.
    3. System continues to step 5 of basic flow.
- Exceptional Flow: 
  - E1: Message Send Failure
    1. At step 6 of basic flow, system fails to send the message because of network or server issues.
    2. System shows a "Message failed to send" message.
    3. System allows the user to retry sending the message or terminate the session.
  - E2: Empty Message
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

#### Use Case 11 (Create Location‑Bound Video):
- Basic Flow:
  1. User selects “Create Location Video”.
  2. System opens camera or video upload interface.
  3. User records or uploads a short video.
  4. System retrieves the user’s current GPS location.
  5. User optionally adds a caption or interest tag.
  6. User selects visibility settings.
  7. User confirms and publishes the video.
  8. System stores the video with its location metadata.
  9. Use case ends.
- Alternative Flow:
  - A1: Upload Existing Video
    1. At step 2, user chooses “Upload from gallery”.
    2. System continues from step 4.
- Exceptional Flow:
  - E1: Location Permission Denied
    1. At step 4, system cannot access GPS.
    2. System shows “Location required to post video”.
    3. User may enable location or cancel.
  - E2: Transfer declined by other user
    1. At step 3, system fails to process the video.
    2. System shows “Upload failed”.
    3. User may retry or cancel.
