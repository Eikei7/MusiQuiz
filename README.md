# MusiQuiz: Interactive Multiplayer Music Quiz
## Project Overview
MusiQuiz is an interactive web application that allows users to test their music knowledge through engaging quiz gameplay. Built with a modern tech stack and real-time multiplayer functionality, it delivers a dynamic and social quiz experience.

## Instructions

1. To run locally, simply clone project to your computer.
2. Open shell, type cd frontend.
3. type npm run dev.
4. Open link in a browser.

## Key Features

* **User Authentication:** Secure login and registration system
* **Admin Dashboard:** Comprehensive management of users, questions, and rooms
* **Quiz Rooms:** Users can join existing rooms (created by an admin) to play a quiz by themselves or against others
* **Chat:** Users who have joined a room can chat while waiting for a game to start.
* ~~**Turn-Based Gameplay:** Players take turns answering music questions~~ ⬅️ WORK IN PROGRESS
* ~~**Real-Time Updates:** See other players' actions instantly~~⬅️ WORK IN PROGRESS
* **Score Tracking:** Track performance across games

## Technical Architecture
### Frontend

* **React:** Component-based UI with hooks for state management
* **CSS:** Custom styling for an engaging user experience
* **JWT:** Token-based authentication for secure user sessions

### Backend

* **AWS Lambda:** Serverless functions for API endpoints
* **DynamoDB:** NoSQL database for storing users, questions, and game states
* **API Gateway:** RESTful API routing and management
* **WebSockets:** Real-time communication between players

## Game Flow

1. Users log in to their accounts
2. Players browse and join available quiz rooms
3. Either the player choose to play a single player game, or waits for a second player to join the room
5. Players take turns answering music trivia questions
6. Correct answers earn points; incorrect answers yield no points
7. After all rounds, final scores are displayed and a winner is declared

## User Roles

* **Regular Users:** Can join rooms, participate in quizzes and view stats
* **Administrators:** Can manage all aspects of the application including users, questions, and rooms

## Future Enhancement ideas

* Leaderboards for tracking top players

## Screenshots
![screenshot_5](https://github.com/user-attachments/assets/00c39c50-6956-4b54-9a25-a195b459e23f)
![screenshot_1](https://github.com/user-attachments/assets/7115ec0c-dee2-4ffa-8f8b-86075339b89a)
![screenshot_2](https://github.com/user-attachments/assets/e4896ec0-eb1d-4305-90a3-d62158d5098c)
![screenshot_3](https://github.com/user-attachments/assets/ef4cbcd7-da0a-4334-9510-9ba41f21eef4)
![screenshot_4](https://github.com/user-attachments/assets/c37007ab-0690-49be-aeb6-a4dc9c042aef)
![screenshot_6](https://github.com/user-attachments/assets/70a3768b-6ddf-4b8a-baeb-39ee0fa34548)
![screenshot_7](https://github.com/user-attachments/assets/05dd8f82-2259-4723-9949-e196319b1bd2)



