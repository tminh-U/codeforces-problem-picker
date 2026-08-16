# Codeforces Problem Picker

A lightweight personal utility to quickly find and filter unsolved Codeforces problems by rating and tags.

> **Note:** This is a small weekend mini-project built with AI assistance (vibe-coded using Google AI Studio / Gemini API) to streamline daily problem selection for competitive programming practice.

## Live Demo
[https://your-app.vercel.app](https://your-app.vercel.app)

## Overview
During Codeforces practice sessions, manually finding unsolved problems within a specific rating range (e.g., 1600–2100) can be tedious. This tool automates the process by querying the Codeforces public API and providing quick problem hints.

## Main Features
- User AC Filter: Fetches user submission history to exclude already-solved problems.
- Custom Filters: Query problems by rating ranges and algorithm tags (DP, Graphs, Math, etc.).
- Random Picker: Suggests random unsolved problems to simulate contest conditions.
- AI Hint Assistant: Generates short problem summaries and algorithmic hints using Gemini API.

## Tech Stack
- Next.js / React / TypeScript
- Tailwind CSS
- Codeforces REST API
- Google Gemini API
- Deployed on Vercel

## Local Setup

### Prerequisites
- Node.js
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/tminh-U/your-repo-name.git](https://github.com/tminh-U/your-repo-name.git)
   cd your-repo-name