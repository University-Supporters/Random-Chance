# 혜윰 인권 서포터즈 축제 부스 상품권 추첨 시스템

인권 서포터즈 축제 부스 방문자를 대상으로 학번, 이름, 전화번호를 접수받아 추후 50명을 추첨하여 GS25 1만원권 모바일 상품권을 증정하는 이벤트 웹 애플리케이션입니다.

---

## 📌 주요 기능

### 1. 사용자 페이지 (`/`)
- **야외 시인성 극대화 UI**: 고대비, 큼직한 폰트 및 모바일 최적화 레이아웃
- **학번 / 이름 / 전화번호 입력**
- **입력 정보 2차 확인 팝업**: 
  - ⚠️ *"당첨 이후 정보가 맞지 않으면 취소될 수 있습니다"* 강조 경고 문구
- **접수 완료 화면**: 접수 번호 및 부스 안내

### 2. 관리자 페이지 (`/admin`)
- **관리자 인증 보호**: 보안 비밀번호 인증
- **실시간 참여자 통계 & 목록 관리**:
  - 총 참여자 수 및 목록 (학번, 이름, 전화번호, 참여 시간, 접속 IP)
  - 검색 및 필터링, 수동 추가 및 삭제 기능
- **관리자 감사 로그 (Audit Logs)**:
  - 데이터 추가, 삭제, 추첨 등 주요 작업의 시간 및 접속 IP 기록
- **50명 랜덤 추첨기 (Raffle Drawer)**:
  - 축제 분위기 애니메이션 (셔플 & Confetti 효과)
  - 50명 당첨자 즉시 선발 및 명단 확인
  - 전체 목록 및 당첨자 명단 CSV(엑셀) 다운로드

---

## 🛠 기술 스택

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti
- **Backend**: Node.js, Express (로컬/Docker) / Vercel Serverless Functions (`/api`)
- **Database**: SQLite (로컬/Docker 기본) / PostgreSQL / Supabase 지원
- **DevOps**: Docker, Docker Compose, Vercel

---

## 🚀 실행 방법

### 1. 로컬 개발 환경
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트엔드 + 백엔드)
npm run dev
```

### 2. Docker 실행
```bash
docker-compose up --build -d
```

### 3. Vercel 배포
- 본 레포지토리를 GitHub에 연결 후 Vercel에 임포트
- 필요 시 환경변수 설정 (`DATABASE_URL`, `ADMIN_PASSWORD` 등)
