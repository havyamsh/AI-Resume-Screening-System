# TalentSift — AI Resume Screening

## Overview

A Flask web app that ranks candidate resumes against a job description using NLP
(TF-IDF + cosine similarity from scikit-learn) plus a curated skill dictionary
for explicit keyword matching. Built with Python, Flask, scikit-learn,
pdfplumber, and python-docx on the backend, and HTML/CSS/vanilla JS on the
frontend.

## Stack

- **Backend**: Python 3.11, Flask
- **NLP/ML**: scikit-learn (TfidfVectorizer, cosine_similarity), numpy
- **Parsing**: pdfplumber (PDF), python-docx (DOCX)
- **Frontend**: HTML, CSS, vanilla JavaScript

## Structure

```
resume_screener/
├── app.py                 # Flask app, parsing & ranking logic
├── templates/index.html   # Single-page UI
├── static/css/styles.css  # Styling
├── static/js/app.js       # Upload, drag-drop, results rendering
└── uploads/               # Reserved (currently unused; files processed in-memory)
```

## Routes

- `GET  /`         — main UI
- `POST /api/rank` — multipart form: `job_description` (str), `resumes` (files)
                     returns ranked candidates JSON

## How ranking works

1. Extract text from each PDF/DOCX in memory.
2. Compute TF-IDF vectors (1–2 grams, English stopwords, sublinear TF) over the
   JD + resumes corpus and take cosine similarity.
3. Match a curated skill dictionary against both JD and resumes for explicit
   coverage.
4. Final score = 0.65 * similarity + 0.35 * skill coverage. Sorted desc.
5. Also extracts name, email, phone, and rough years of experience.

## Run

Workflow `Start application` runs `python resume_screener/app.py` on port 5000.

## Notes

This project also contains pre-existing TypeScript/pnpm artifact scaffolding
(`artifacts/api-server`, `artifacts/mockup-sandbox`) from the workspace template.
The active product is the Flask app in `resume_screener/`.
