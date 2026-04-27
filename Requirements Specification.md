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

The app should be able to allow users to specify a range around them to show other users with similiar interest on map.
The app should be able to allow users to define their own tags under preset blocks of interest.
The app should be able to allow users to create personal bio.
The app should be able to allow users to be anonymous or having real name.
The app should be able to allow users to block other users they don't want to see.
The app should be able to allow users to create chat chat for matching users within range.
The app should be able to allow users to searching other users with certain tags, icon of other users will show the tags that the user have searched on the map.
The app should be able to allow users to use gps tracking to route other users with shared interests.
The app should be able to allow users to move their chat to external app like instagram or wechat.
  
