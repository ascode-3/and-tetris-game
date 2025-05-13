# AND Tetris Game

멀티플레이어 테트리스 게임 프로젝트

## 기술 스택

- Frontend: React
- Backend: Node.js, Express, Socket.IO
- 배포: Render

## 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/ascode-3/and-tetris-game.git
cd and-tetris-game
```

2. 의존성 설치
```bash
# 백엔드 의존성 설치
npm install

# 프론트엔드 의존성 설치
cd frontend
npm install
```

3. 환경 변수 설정
- 루트 디렉토리에 `.env` 파일 생성:
```
PORT=10000
```
- frontend 디렉토리에 `.env` 파일 생성:
```
REACT_APP_SOCKET_SERVER_URL=https://and-tetris-game.onrender.com
```

4. 실행
```bash
# 백엔드 실행
npm start

# 프론트엔드 실행 (새 터미널에서)
cd frontend
npm start
```

## 주요 기능

- 실시간 멀티플레이어 지원
- 대기실 시스템
- 방장 권한 관리 