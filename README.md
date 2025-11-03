# MusiQuiz: Interactive Multiplayer Music Quiz
[![Netlify Status](https://api.netlify.com/api/v1/badges/1ea640ec-3e15-480f-b0ad-5af0cae19ecb/deploy-status)](https://app.netlify.com/sites/musi-quiz/deploys)
## Project Overview
MusiQuiz is an interactive web application that allows users to test their music knowledge through engaging quiz gameplay. Built with a modern tech stack and real-time multiplayer functionality, it delivers a dynamic and social quiz experience.

## Instructions

1. To run locally, simply clone project to your computer.
2. Open shell/terminal, type ```cd frontend``` and press ENTER
3. type ```npm install``` and press ENTER
4. type ```npm run dev``` and press ENTER
5. Open link in a browser.

## Key Features

* **User Authentication:** Secure login and registration system
* **Admin Dashboard:** Comprehensive management of users, questions, and rooms
* **Quiz Rooms:** Users can join existing rooms (created by an admin) to play a quiz by themselves or against others
* **Chat:** Users who have joined a room can chat while waiting for a game to start.
* **Turn-Based Gameplay:** Players take turns answering music questions
* **Real-Time Updates:** See other players' actions instantly
* **Score Tracking:** Track performance across games

## Technical Architecture
### Frontend

* **React:** Component-based UI with hooks for state management
* **CSS:** Custom styling for an engaging user experience
* **JWT:** Token-based authentication for secure user sessions

### Backend

* **Supabase:** Functions for endpoints, PostgreSQL database for storing users, questions, and game states, real-time updates and more.

## Game Flow

1. Users create and/or log in to their accounts
2. Players browse and join a quiz room
3. The player chooses to either play a single player game, or waits for a second player to join the room
5. Players take turns answering music trivia questions
6. Correct answers earn points; incorrect answers yield no points
7. After all rounds, final scores are displayed and a winner is declared

## User Roles

* **Regular Users:** Can join rooms, participate in quizzes and view stats
* **Administrators:** Can manage all aspects of the application including users, questions, and rooms

## Future Enhancement ideas

* Leaderboards for tracking top players

## Screenshots
![screenshot_5](https://github.com/user-attachments/assets/c79aa2c3-48b4-4eb2-aabe-394201c55131)
![screenshot_1](https://github.com/user-attachments/assets/2cc24c3d-91e7-405a-b686-37f4f07ad2c0)
![screenshot_2](https://github.com/user-attachments/assets/3e2a3c29-9d0b-48be-a59e-82d4c3d5377c)
![screenshot_3](https://github.com/user-attachments/assets/446258bf-b4cb-415c-891a-32db043bf796)
![screenshot_4](https://github.com/user-attachments/assets/a2ebcb81-4d6b-4d83-b6d2-cb0e1f16a958)
![screenshot_6](https://github.com/user-attachments/assets/0f6ca5eb-3dac-4b99-9a58-3225cdb3f3ea)
![screenshot_7](https://github.com/user-attachments/assets/34a5a67d-b05a-467b-a146-8416978637b2)

