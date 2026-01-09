# GitHub Actions 워크플로우 매뉴얼

## 개요

이 문서는 `sync-notion.yml` GitHub Actions 워크플로우의 작동 원리를 상세히 설명합니다.

## 워크플로우 이름
**Sync Notion to Blog** - Notion 데이터베이스의 콘텐츠를 블로그와 동기화하는 자동화 워크플로우

---

## 트리거 조건 (Triggers)

워크플로우는 세 가지 방식으로 실행됩니다:

### 1. 스케줄 실행 (Schedule)
```yaml
on:
  schedule:
    - cron: '0 4 * * *'  # 매일 오후 1시 (KST)
    - cron: '0 9 * * *'  # 매일 오후 6시 (KST)
```

- **실행 시간**: 하루에 2번 자동 실행
  - 오후 1시 (KST) = 04:00 UTC
  - 오후 6시 (KST) = 09:00 UTC
- **목적**: 정기적으로 Notion의 변경 사항을 블로그에 반영

### 2. 수동 실행 (Workflow Dispatch)
```yaml
workflow_dispatch:
```

- **실행 방법**: GitHub Actions 탭에서 "Run workflow" 버튼 클릭
- **목적**: 필요할 때 즉시 동기화 실행
- **사용 시나리오**:
  - 스케줄 외 즉시 동기화가 필요할 때
  - 테스트 및 디버깅 시

### 3. 외부 웹훅 (Repository Dispatch)
```yaml
repository_dispatch:
  types: [notion-webhook]
```

- **실행 방법**: 외부 시스템(Make.com 등)에서 GitHub API로 이벤트 전송
- **목적**: Notion에서 실시간 변경 감지 시 즉시 동기화
- **payload 구조**:
  ```json
  {
    "event_type": "notion-webhook",
    "client_payload": {
      "action": "create|update|delete",
      "page_id": "notion-page-id"
    }
  }
  ```

---

## 권한 설정 (Permissions)

```yaml
permissions:
  contents: write
```

- **contents: write**: 리포지토리의 파일을 수정하고 커밋할 수 있는 권한 부여

---

## 작업 정의 (Jobs)

### Job: sync

**실행 환경**: `ubuntu-latest` (최신 Ubuntu Linux)

---

## 단계별 실행 프로세스 (Steps)

### Step 1: 리포지토리 체크아웃
```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

**목적**: GitHub 리포지토리의 코드를 워크플로우 환경으로 가져옴

**주요 설정**:
- `actions/checkout@v4`: GitHub 공식 체크아웃 액션 v4
- `fetch-depth: 0`: 전체 Git 히스토리를 가져옴 (rebase 작업에 필요)

---

### Step 2: Node.js 설정
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
```

**목적**: Node.js 실행 환경 설정

**주요 설정**:
- Node.js 버전 20 설치
- npm 및 관련 도구 자동 설치

---

### Step 3: 의존성 설치
```yaml
- name: Install dependencies
  run: |
    npm ci
    echo "Installed packages:"
    npm list --depth=0
```

**목적**: 프로젝트 의존성 패키지 설치

**명령어 설명**:
- `npm ci`: package-lock.json 기반 클린 설치 (빠르고 안정적)
- `npm list --depth=0`: 설치된 최상위 패키지 목록 출력 (디버깅용)

**npm ci vs npm install**:
- `npm ci`는 CI/CD 환경에 최적화
- package-lock.json을 엄격하게 따름
- node_modules를 완전히 삭제 후 재설치

---

### Step 4: Notion 동기화 실행
```yaml
- name: Sync from Notion
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
    NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
    SYNC_ACTION: ${{ github.event.client_payload.action }}
    SYNC_PAGE_ID: ${{ github.event.client_payload.page_id }}
    TRIGGER_TYPE: ${{ github.event_name }}
  run: node scripts/sync-notion.js
```

**목적**: Notion API를 통해 콘텐츠를 가져와 블로그 형식으로 변환

**환경 변수**:
1. `NOTION_API_KEY`: Notion API 인증 키 (필수)
2. `NOTION_DATABASE_ID`: Notion 데이터베이스 ID (필수)
3. `SYNC_ACTION`: 동기화 작업 유형 (create/update/delete)
   - repository_dispatch로 실행 시에만 값이 있음
4. `SYNC_PAGE_ID`: 동기화할 특정 페이지 ID
   - repository_dispatch로 실행 시에만 값이 있음
5. `TRIGGER_TYPE`: 트리거 유형 (schedule/workflow_dispatch/repository_dispatch)

**처리 과정**:
1. Notion API로 데이터베이스 쿼리
2. 발행된(published) 페이지만 필터링
3. 마크다운 형식으로 변환
4. `content/posts/` 디렉토리에 저장
5. 이미지를 `public/notion-images/`에 다운로드

---

### Step 5: 변경 사항 확인
```yaml
- name: Check for changes
  id: check_changes
  run: |
    if [ -z "$(git status --porcelain)" ]; then
      echo "has_changes=false" >> $GITHUB_OUTPUT
      echo "No changes detected"
    else
      echo "has_changes=true" >> $GITHUB_OUTPUT
      echo "Changes detected"
    fi
```

**목적**: Git 상태를 확인하여 변경 사항 존재 여부 판단

**동작 원리**:
- `git status --porcelain`: 짧은 형식의 Git 상태 출력
- `-z` 테스트: 출력이 비어있으면 변경 사항 없음
- `GITHUB_OUTPUT`에 결과 저장: 후속 스텝에서 조건부 실행에 사용

**출력 변수**:
- `has_changes=true`: 변경 사항 있음
- `has_changes=false`: 변경 사항 없음

---

### Step 6: Git 설정
```yaml
- name: Configure Git
  if: steps.check_changes.outputs.has_changes == 'true'
  run: |
    git config --global user.name "Notion Sync Bot"
    git config --global user.email "notion-sync[bot]@users.noreply.github.com"
```

**실행 조건**: 변경 사항이 있을 때만 실행

**목적**: Git 커밋에 사용할 사용자 정보 설정

**설정 값**:
- 이름: "Notion Sync Bot"
- 이메일: "notion-sync[bot]@users.noreply.github.com" (봇 계정 표준 형식)

---

### Step 7: 변경 사항 커밋 및 푸시
```yaml
- name: Commit and push changes
  if: steps.check_changes.outputs.has_changes == 'true'
  run: |
    git add -A content/posts/
    git add -A public/notion-images/

    git commit -m "Sync blog posts from Notion"

    git pull --rebase origin main
    git push origin main
```

**실행 조건**: 변경 사항이 있을 때만 실행

**목적**: 변경된 파일을 커밋하고 GitHub에 푸시

**단계별 동작**:
1. **파일 추가**:
   - `content/posts/`: 블로그 포스트 마크다운 파일
   - `public/notion-images/`: Notion 이미지 파일
   - `-A` 플래그: 신규, 수정, 삭제된 모든 파일 포함

2. **커밋 생성**:
   - 메시지: "Sync blog posts from Notion"

3. **Pull Rebase**:
   - `git pull --rebase origin main`: 최신 변경사항을 가져와 리베이스
   - 충돌 방지 및 깔끔한 커밋 히스토리 유지

4. **Push**:
   - `git push origin main`: main 브랜치에 변경사항 푸시

---

### Step 8: 발행된 slug 확인
```yaml
- name: Check for published slug
  if: steps.check_changes.outputs.has_changes == 'true'
  id: check_slug
  run: |
    if [ -f ".published-slug" ]; then
      SLUG=$(cat .published-slug)
      echo "published_slug=$SLUG" >> $GITHUB_OUTPUT
      echo "has_slug=true" >> $GITHUB_OUTPUT
      echo "📌 발행된 slug: $SLUG"
    else
      echo "has_slug=false" >> $GITHUB_OUTPUT
      echo "ℹ️ 발행된 slug 없음"
    fi
```

**실행 조건**: 변경 사항이 있을 때만 실행

**목적**: 새로 발행된 포스트의 slug(URL 경로)를 확인

**동작 원리**:
- `.published-slug` 파일 존재 확인 (sync-notion.js가 생성)
- 파일이 있으면 내용을 읽어 `published_slug` 출력 변수에 저장
- Google Search Console 제출에 사용

**출력 변수**:
- `published_slug`: 발행된 포스트의 slug
- `has_slug`: slug 존재 여부 (true/false)

---

### Step 9: Vercel 배포 대기
```yaml
- name: Wait for Vercel deployment
  if: steps.check_slug.outputs.has_slug == 'true'
  run: |
    echo "⏳ Vercel 배포 대기 중 (3분)..."
    sleep 180
    echo "✅ 대기 완료"
```

**실행 조건**: 발행된 slug가 있을 때만 실행

**목적**: Vercel 자동 배포가 완료될 때까지 대기

**이유**:
- GitHub에 푸시하면 Vercel이 자동으로 배포 시작
- 배포가 완료되어야 URL이 실제로 접근 가능
- Google Search Console에 제출하기 전에 URL이 활성화되어야 함

**대기 시간**: 180초 (3분)

---

### Step 10: Google Search Console 제출
```yaml
- name: Submit to Google Search Console
  if: steps.check_slug.outputs.has_slug == 'true'
  env:
    SITE_URL: ${{ secrets.SITE_URL }}
    PUBLISHED_SLUG: ${{ steps.check_slug.outputs.published_slug }}
    GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
  run: |
    echo "🔍 Google Search Console에 URL 제출 중..."
    node scripts/google-indexing.js
```

**실행 조건**: 발행된 slug가 있을 때만 실행

**목적**: 새 포스트 URL을 Google Search Console에 자동 제출하여 빠른 인덱싱 요청

**환경 변수**:
1. `SITE_URL`: 블로그 사이트 URL (예: https://example.com)
2. `PUBLISHED_SLUG`: 발행된 포스트의 slug
3. `GOOGLE_SERVICE_ACCOUNT_JSON`: Google API 서비스 계정 인증 정보

**처리 과정**:
1. Google Indexing API 인증
2. `{SITE_URL}/{PUBLISHED_SLUG}` 형식의 URL 생성
3. Google에 URL 업데이트 요청 전송
4. 검색 결과에 빠르게 반영

---

### Step 11: 완료 보고 (변경 있음)
```yaml
- name: Report completion
  if: steps.check_changes.outputs.has_changes == 'true'
  run: |
    echo "✅ Notion sync completed!"
    if [ -f ".published-slug" ]; then
      echo "📌 발행된 글: $(cat .published-slug)"
      echo "🔍 Google 인덱싱 요청 완료"
    fi
```

**실행 조건**: 변경 사항이 있을 때만 실행

**목적**: 동기화 성공 및 세부 정보 출력

---

### Step 12: 변경 없음 보고
```yaml
- name: No changes
  if: steps.check_changes.outputs.has_changes == 'false'
  run: |
    echo "ℹ️ No new or updated posts found in Notion"
    echo "All published posts are already synced"
```

**실행 조건**: 변경 사항이 없을 때만 실행

**목적**: 동기화할 내용이 없음을 명시적으로 표시

---

## 워크플로우 실행 흐름도

```
시작
  ↓
트리거 발생 (스케줄/수동/웹훅)
  ↓
리포지토리 체크아웃
  ↓
Node.js 환경 설정
  ↓
의존성 설치
  ↓
Notion 동기화 스크립트 실행
  ↓
변경 사항 확인
  ├─ 변경 없음 → 완료 메시지 → 종료
  └─ 변경 있음
       ↓
     Git 설정
       ↓
     커밋 & 푸시
       ↓
     발행된 slug 확인
       ├─ slug 없음 → 완료 메시지 → 종료
       └─ slug 있음
            ↓
          Vercel 배포 대기 (3분)
            ↓
          Google Search Console 제출
            ↓
          완료 메시지
            ↓
          종료
```

---

## 필요한 GitHub Secrets

워크플로우가 정상 작동하려면 다음 시크릿을 GitHub 리포지토리에 설정해야 합니다:

### 1. NOTION_API_KEY
- **설명**: Notion API 통합 토큰
- **획득 방법**:
  1. Notion → Settings & Members → Integrations
  2. "New integration" 생성
  3. API 키 복사

### 2. NOTION_DATABASE_ID
- **설명**: 블로그 포스트가 저장된 Notion 데이터베이스 ID
- **획득 방법**:
  - Notion 데이터베이스 URL에서 추출
  - 형식: `https://notion.so/{workspace}/{database_id}?v=...`

### 3. SITE_URL
- **설명**: 블로그 사이트의 기본 URL
- **예시**: `https://yourblog.vercel.app`

### 4. GOOGLE_SERVICE_ACCOUNT_JSON
- **설명**: Google Indexing API용 서비스 계정 인증 정보 (JSON)
- **획득 방법**:
  1. Google Cloud Console → IAM & Admin → Service Accounts
  2. 서비스 계정 생성
  3. Google Search Console API 활성화
  4. 키 생성 (JSON 형식)
  5. 전체 JSON 내용을 시크릿에 저장

---

## 외부 웹훅 호출 방법

Make.com이나 다른 자동화 도구에서 워크플로우를 트리거하려면:

### API 엔드포인트
```
POST https://api.github.com/repos/{owner}/{repo}/dispatches
```

### Headers
```
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

### Body
```json
{
  "event_type": "notion-webhook",
  "client_payload": {
    "action": "create",
    "page_id": "notion-page-id-here"
  }
}
```

### 필요한 권한
- GitHub Personal Access Token에 `repo` 권한 필요

---

## 문제 해결 (Troubleshooting)

### 워크플로우가 실행되지 않음
1. **스케줄 실행 실패**:
   - Actions가 활성화되어 있는지 확인
   - 리포지토리에 최근 활동이 있는지 확인 (60일 이상 비활성 시 스케줄 중지)

2. **웹훅 실행 실패**:
   - GitHub Token 권한 확인
   - API 호출 형식 확인

### 동기화는 되지만 커밋되지 않음
- Git 설정 확인
- `contents: write` 권한 확인
- 브랜치 보호 규칙 확인

### Google Search Console 제출 실패
- `GOOGLE_SERVICE_ACCOUNT_JSON` 형식 확인 (유효한 JSON인지)
- Google Indexing API 활성화 확인
- 서비스 계정이 Search Console에 추가되었는지 확인

### Vercel 배포 대기 시간 부족
- 3분으로 설정되어 있으나, 빌드가 느리면 증가 필요
- `sleep 180`을 `sleep 300` (5분) 등으로 조정

---

## 최적화 팁

### 1. 조건부 실행 활용
- 모든 후속 단계가 `if` 조건으로 불필요한 실행 방지
- Actions 실행 시간 및 비용 절약

### 2. 캐싱 추가 (선택적)
```yaml
- name: Cache Node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```
- npm 패키지 설치 속도 향상

### 3. 병렬 실행 (선택적)
- 독립적인 작업은 별도 job으로 분리 가능
- 예: 동기화와 Google 제출을 별도 job으로

---

## 보안 고려사항

1. **시크릿 관리**:
   - 절대 코드에 하드코딩하지 않음
   - GitHub Secrets 사용 필수

2. **권한 최소화**:
   - `contents: write`만 부여 (필요 최소 권한)

3. **봇 계정 사용**:
   - 전용 봇 이메일 사용으로 커밋 추적 용이

4. **토큰 만료 관리**:
   - Notion API 키와 Google 서비스 계정 키 정기 갱신

---

## 결론

이 GitHub Actions 워크플로우는:
- ✅ 완전 자동화된 Notion-to-Blog 동기화
- ✅ 실시간 웹훅 + 정기 스케줄 지원
- ✅ Google Search Console 자동 제출
- ✅ 조건부 실행으로 효율적인 리소스 사용
- ✅ 안전한 시크릿 관리

를 제공하며, 블로그 콘텐츠 관리를 완전히 자동화합니다.
