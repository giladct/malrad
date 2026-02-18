# מלר״ד – אתר מובייל לפרוטוקולים

אתר מובייל (SPA/PWA) שמציג את הפרוטוקולים מתוך הקובץ `פנקס מלרד חדש.pdf` בצורה נוחה לחיפוש ולניווט, כולל כלים מהירים לחישוב מינונים/אינפוזיה.

## מה יש כאן

- `tools/extract_malrad.py`: חילוץ טקסט מה־PDF ובניית JSON של פרוטוקולים לפי תוכן העניינים.
- `data/malrad_protocols.json`: תוצר החילוץ (פרוטוקולים מפולחים לפי עמודים).
- `site/`: האתר עצמו (HTML/CSS/JS + Service Worker).

## הפעלה מקומית

האתר חייב לרוץ דרך שרת (לא לפתוח את `index.html` כקובץ מקומי), כדי ש-`fetch` יעבוד.

```bash
cd "site"
python3 -m http.server 8080
```

ואז לפתוח בדפדפן בטלפון/מחשב את `http://localhost:8080`.

## עדכון נתונים מה־PDF

אם ה־PDF השתנה, מריצים מחדש חילוץ (דורש `pypdf` ב־venv):

```bash
source ".venv/bin/activate"
python tools/extract_malrad.py
cp data/malrad_protocols.json site/assets/malrad_protocols.json
```

## אזהרה

התוכן מיועד לסיוע בלבד ואינו תחליף לשיקול דעת קליני. יש לוודא מינונים/עדכונים לפני כל החלטה רפואית.

