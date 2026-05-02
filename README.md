# Team Task Manager (Full-Stack)

React + Express + Prisma + PostgreSQL with JWT auth and role-based access (Admin/Member).

## Local run 

1) Install Node.js 20+ and PostgreSQL (or use a hosted Postgres URL).  
2) In repo root: `npm install`  
3) Copy `server/.env.example` → `server/.env` and set `DATABASE_URL` and `JWT_SECRET`  
4) Create tables: `npm run db:migrate --prefix ./server`  
5) Run dev:
   - Terminal A: `npm run dev:server`
   - Terminal B: `npm run dev:client`
6) Open `http://localhost:5173`

## Railway deploy 

1) Push this repo to GitHub  
2) Railway → New Project → Deploy from GitHub  
3) Add PostgreSQL plugin  
4) Variables on app service:
   - `DATABASE_URL` (reference Railway Postgres)
   - `JWT_SECRET` (random string)
   - `NODE_ENV=production`
5) Build: `npm run build`  Start: `npm run start`
6) Create domain; test `/api/health` and the UI

## Demo checklist 

- Signup/login
- Create project (Admin)
- Add member by email (Member must signup first)
- Create tasks, set status, set overdue due date
- Show Dashboard counts and overdue
