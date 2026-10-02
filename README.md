# Smart Classroom Finder

Find available free rooms in your college based on the timetable and time slot you provide.

## Live Demo

[Live Demo Link](#)

## Screenshots

### Landing Page
![Landing Page](./assets/1.png)

### Find Available Rooms
![Find Available Rooms](./assets/2.png)

### Admin Portal
![Admin Portal](./assets/3.png)

### Timetable View
![Timetable View](./assets/4.png)

## System Architecture

```mermaid
graph TD
    Client[Web Browser] --> Frontend[React Application]
    Frontend --> API[FastAPI Backend]
    API --> PDFParser[PDF Parser Service]
    API --> DB[(SQLite Database)]
    PDFParser --> DB
```

## System Workflow

```mermaid
flowchart TD
    UserUpload[User Uploads Timetable PDF] --> BackendUpload[Backend receives PDF]
    BackendUpload --> ParsePDF[Parse PDF using pdfplumber]
    ParsePDF --> ExtractData[Extract schedule entries and rooms]
    ExtractData --> DatabaseStore[Save to Database]
    DatabaseStore --> SystemReady[System Ready]
    SystemReady --> UserQuery[User requests free rooms for a time slot]
    UserQuery --> DBCheck[Database checks occupied rooms]
    DBCheck --> ReturnResult[Return available rooms to Frontend]
```

## Technologies Used

* Frontend
  * React
  * TypeScript
  * Vite
  * Tailwind CSS
* Backend
  * FastAPI
  * Python
  * SQLAlchemy
  * pdfplumber

## Setup Instructions

### Backend Setup

1. Open a terminal and navigate to the backend directory
2. Create a virtual environment
3. Install the required dependencies from the requirements file
4. Start the FastAPI development server

### Frontend Setup

1. Open a terminal and navigate to the frontend directory
2. Install the required dependencies using your package manager
3. Start the development server
