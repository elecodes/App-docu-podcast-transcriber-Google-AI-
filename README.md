<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Docu-Podcast & Transcriber

This is an AI-powered web application that brings your text and voice to life. It leverages the power of the Gemini API to provide two core features: a **Podcast Generator** and a **Live Transcriber**.

View your app in AI Studio: https://ai.studio/apps/drive/1DZuwIsaObk-p9lc8XEx0WbJBWumGZwSq

## Features

### 🎙️ Podcast Generator

-   **Text-to-Podcast:** Transform any text into a two-person podcast dialogue.
-   **File Upload:** Supports various file formats, including `.txt`, `.pdf`, and `.docx`. You can also paste text directly.
-   **Audio Generation:** Generates a high-quality audio file of the podcast dialogue.
-   **Playback & Download:** Listen to the generated podcast directly in the app and download it as a `.wav` file.

### ✍️ Live Transcriber

-   **Real-time Transcription:** Transcribe your speech to text in real-time using your microphone.
-   **High Accuracy:** Powered by the latest Gemini model for fast and accurate transcription.
-   **Save Transcript:** Download the full transcript as a `.txt` file.

## Tech Stack

-   **Frontend:** React, Vite, TypeScript, Tailwind CSS
-   **AI:** Google Gemini API (`@google/genai`)
-   **Audio Processing:** Web Audio API

## Getting Started

### Prerequisites

-   Node.js (v18 or higher recommended)
-   A Gemini API key. You can get one from [Google AI Studio](https://ai.studio.google.com/).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your API key:**
    Create a file named `.env.local` in the root of the project and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```

### Running the Application

Once the setup is complete, you can run the development server:

```bash
npm run dev
```

This will start the application on a local server (usually `http://localhost:5173`).

## Usage

### Generating a Podcast

1.  Navigate to the **Podcast Generator** tab.
2.  Either drag and drop a `.txt`, `.pdf`, or `.docx` file into the upload area, or paste your text directly into the text area.
3.  Click the **Generate Podcast** button.
4.  The app will first generate a dialogue script and then synthesize the audio.
5.  Once complete, you can play the audio and download the `.wav` file.

### Transcribing Live Audio

1.  Navigate to the **Live Transcriber** tab.
2.  Click the **Start Listening** button. Your browser will ask for microphone permission.
3.  Start speaking, and you will see the transcript appear in real-time.
4.  Click **Stop Listening** when you are finished.
5.  You can then save the transcript to a `.txt` file using the **Save Transcript** button.