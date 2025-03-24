# MusiQuiz: Interactive Multiplayer Music Quiz
## Project Overview
MusiQuiz is an interactive web application that allows users to test their music knowledge through engaging quiz gameplay. Built with a modern tech stack and real-time multiplayer functionality, it delivers a dynamic and social quiz experience.

## Key Features

* **User Authentication:** Secure login and registration system
* **Admin Dashboard:** Comprehensive management of users, questions, and rooms
* **Quiz Rooms:** Users can join existing rooms (created by an admin) to play with others
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
3. When at least two players have joined a room, the host (first player) can start the game
4. Players take turns answering music trivia questions
5. Correct answers earn points; incorrect answers yield no points
6. After all rounds, final scores are displayed and a winner is declared

## User Roles

* **Regular Users:** Can join rooms and participate in quizzes
* **Administrators:** Can manage all aspects of the application including users, questions, and rooms

## Future Enhancement ideas

* Leaderboards for tracking top players
