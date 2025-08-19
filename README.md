# Hivemind Project

This is the starter project for **Hivemind**, an AI model orchestrator.

## Structure
- `frontend/` → Angular frontend
- `backend/` → Go Gin backend

## Running
- Backend:
```
cd backend
go run main.go
```

- Frontend:
```
cd frontend
npm install
ng serve
```

The frontend will communicate with the backend's `/query` endpoint.
