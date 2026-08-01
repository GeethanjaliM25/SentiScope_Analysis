# Sentient Insights

Build a professional, production-ready AI-powered Twitter Sentiment Analysis Platform using React, TypeScript, Tailwind CSS, Supabase, and Python FastAPI.

Project Name:
SentiScope AI – Enterprise Sentiment Intelligence Platform

Objective:
Develop an end-to-end web application that enables businesses, marketing teams, customer support teams, and analysts to perform real-time sentiment analysis on social media and uploaded datasets using a trained machine learning model.

Authentication Module:

Secure Login Page

User Registration

Forgot Password

Remember Me

Role-based access (Admin, Analyst, Viewer)

User Profile Management

Session Management

Dashboard Module:
Create a modern enterprise dashboard displaying:

Total Analyses Performed

Positive Sentiment Count

Negative Sentiment Count

Neutral Sentiment Count

Irrelevant Sentiment Count

Sentiment Distribution Pie Chart

Sentiment Trend Graph

Recent Analysis History

Dataset Upload Statistics

Model Performance Metrics

Accuracy Card (81.26%)

Most Active Topics

Real-Time Text Analysis:
Provide a text input area where users can:

Enter tweets

Enter customer reviews

Enter social media comments

Enter product feedback

Output should include:

Predicted Sentiment

Confidence Score

Sentiment Category

Topic Extraction

Keyword Extraction

Risk Indicator

Business Insight Summary

CSV Dataset Analysis:
Allow users to upload CSV files.

Requirements:

Auto-detect text column

Preview uploaded dataset

Perform sentiment prediction on all records

Store results in database

Export analyzed dataset

Download results as CSV

Generated columns:

Original Text

Predicted Sentiment

Confidence Score

Category

Keywords

Word Cloud Module:
Generate:

Overall Word Cloud

Positive Word Cloud

Negative Word Cloud

Neutral Word Cloud

Most Frequent Keywords

Top 20 Trending Words

Visualization Module:
Provide:

Pie Charts

Bar Charts

Line Charts

Sentiment Distribution Graphs

Topic Frequency Charts

Word Frequency Charts

Trend Analytics Dashboard

Business Intelligence Features:

Identify customer pain points

Detect brand reputation issues

Highlight trending topics

Detect emerging complaints

Identify positive customer feedback

Generate business recommendations automatically

Model Integration:
Backend must load:

final_sentiment_model.pkl

tfidf.pkl

label_encoder.pkl

Prediction Flow:
User Input
→ Text Cleaning
→ TF-IDF Transformation
→ Logistic Regression Model
→ Sentiment Prediction
→ Dashboard Visualization

Admin Panel:

Manage Users

View Uploaded Datasets

View Analysis Reports

Delete Records

Monitor System Usage

Download Reports

Reports Module:
Generate downloadable:

PDF Reports

CSV Reports

Executive Summary Reports

Monthly Analytics Reports

UI Requirements:

Modern SaaS Design

Professional Sidebar Navigation

Responsive Layout

Dark Mode

Light Mode

Mobile Friendly

Industry Standard Design

Attractive Analytics Cards

Professional Charts and Graphs

Navigation Menu:
Dashboard
Real-Time Analysis
Dataset Analysis
Word Cloud
Reports
Analytics
Model Information
Settings
Profile

Model Information Page:
Display:

Dataset Size

Preprocessing Steps

TF-IDF Feature Extraction

Logistic Regression Model

Hyperparameter Tuning Results

Final Accuracy: 81.26%

Confusion Matrix

Classification Report

Future Scope Section:

Live Twitter API Integration

Multi-language Sentiment Analysis

Deep Learning Models (BERT)

Real-Time Monitoring Dashboard

Customer Feedback Intelligence

Deployment Requirements:

Frontend: Lovable React Application

Backend: FastAPI

Database: Supabase

Authentication: Supabase Auth

Charts: Recharts

Word Cloud: React WordCloud

File Storage: Supabase Storage

Deployment: Vercel

The final application should look like a professional enterprise SaaS platform used by marketing teams, customer support teams, brand analysts, and business intelligence professionals.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sentiment-whisperer-73.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2dec647b-04a5-4b38-b0dd-b5d9ef8e2ed4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
